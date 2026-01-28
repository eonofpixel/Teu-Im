/**
 * Soniox STT + Translation 웹 클라이언트
 * Web Audio API + WebSocket 방식
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface SonioxConfig {
  projectId: string;
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  onPartialResult: (result: InterpretationResult) => void;
  onFinalResult: (result: InterpretationResult) => void;
  onError: (error: Error) => void;
  onConnectionChange: (connected: boolean) => void;
}

export interface InterpretationResult {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  sequence: number;
  startTimeMs?: number;
  endTimeMs?: number;
}

// ============================================================================
// 모듈 상태
// ============================================================================

let ws: WebSocket | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let currentConfig: SonioxConfig | null = null;
let sequence = 0;
let isActive = false;
let configSent = false;

// ============================================================================
// Temp API Key 요청
// ============================================================================

async function fetchTempApiKey(projectId: string): Promise<string> {
  const response = await fetch('/api/soniox/temp-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API 키 발급 실패');
  }

  const data = await response.json();
  return data.tempApiKey;
}

// ============================================================================
// Float32 → Int16 변환
// ============================================================================

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// ============================================================================
// 다운샘플링 (48kHz → 16kHz)
// ============================================================================

function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * sampleRateRatio);
    result[i] = buffer[srcIndex];
  }

  return result;
}

// ============================================================================
// Soniox 스트리밍 시작
// ============================================================================

export async function startSoniox(config: SonioxConfig): Promise<void> {
  if (isActive) {
    console.warn('Soniox가 이미 실행 중입니다');
    return;
  }

  try {
    currentConfig = config;
    sequence = 0;
    configSent = false;

    // 1. Temp API Key 발급
    console.log('Fetching temp API key...');
    const apiKey = await fetchTempApiKey(config.projectId);
    console.log('API key received');

    // 2. WebSocket 연결
    const wsUrl = `wss://stt-rt.soniox.com/transcribe-websocket?api_key=${apiKey}`;
    console.log('Connecting to Soniox WebSocket...');
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log('WebSocket connected');

      try {
        // 3. 오디오 캡처 시작
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });

        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(mediaStream);

        // ScriptProcessorNode (레거시지만 호환성 좋음)
        const bufferSize = 4096;
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessor.onaudioprocess = (event) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;

          const inputData = event.inputBuffer.getChannelData(0);

          // 다운샘플링 (필요시)
          const sampleRate = audioContext?.sampleRate || 16000;
          const downsampled = downsampleBuffer(inputData, sampleRate, 16000);

          // 설정 전송 (첫 번째 오디오 청크에서)
          if (!configSent) {
            const configMessage = {
              model: 'stt-rt-v3',
              language_hints: [config.sourceLanguage],
              include_nonfinal: true,
              audio_format: 'pcm_s16le',
              sample_rate: 16000,
              num_channels: 1,
              translation: {
                type: 'one_way',
                target_language: config.targetLanguage,
              },
            };
            console.log('Sending Soniox config:', configMessage);
            ws!.send(JSON.stringify(configMessage));
            configSent = true;
          }

          // Int16으로 변환하여 전송
          const int16Data = floatTo16BitPCM(downsampled);
          ws!.send(int16Data.buffer);
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        isActive = true;
        config.onConnectionChange(true);
        console.log('Soniox streaming started');
      } catch (audioError) {
        console.error('오디오 캡처 실패:', audioError);
        config.onError(new Error('마이크 접근에 실패했습니다'));
        cleanup();
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          console.error('Soniox error:', data.error);
          config.onError(new Error(data.error));
          return;
        }

        // 토큰에서 텍스트 추출
        const tokens = data.tokens || [];
        let original = '';
        let translated = '';
        let startTimeMs: number | undefined;
        let endTimeMs: number | undefined;

        for (const token of tokens) {
          if (token.translation_status === 'translation') {
            translated += token.text || '';
          } else {
            original += token.text || '';
            // 타임스탬프 추출
            if (token.start_ms !== undefined) {
              if (startTimeMs === undefined) {
                startTimeMs = token.start_ms;
              }
              endTimeMs = token.start_ms + (token.duration_ms || 0);
            }
          }
        }

        const isFinal = data.finished === true;

        if (isFinal) {
          sequence++;
          const result: InterpretationResult = {
            originalText: original,
            translatedText: translated,
            targetLanguage: config.targetLanguage,
            isFinal: true,
            sequence,
            startTimeMs,
            endTimeMs,
          };
          config.onFinalResult(result);
        } else if (original || translated) {
          const result: InterpretationResult = {
            originalText: original,
            translatedText: translated,
            targetLanguage: config.targetLanguage,
            isFinal: false,
            sequence: sequence + 1,
            startTimeMs,
            endTimeMs,
          };
          config.onPartialResult(result);
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      config.onError(new Error('WebSocket 연결 오류'));
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      cleanup();
      config.onConnectionChange(false);
    };

  } catch (error) {
    console.error('Soniox 시작 실패:', error);
    cleanup();
    throw error;
  }
}

// ============================================================================
// 정리
// ============================================================================

function cleanup() {
  // ScriptProcessor 연결 해제
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }

  // AudioContext 종료
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // 미디어 스트림 정리
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  isActive = false;
  configSent = false;
  currentConfig = null;
}

// ============================================================================
// Soniox 스트리밍 중지
// ============================================================================

export async function stopSoniox(): Promise<void> {
  if (!ws || !isActive) {
    return;
  }

  try {
    // 종료 메시지 전송
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ finish: true }));
    }
    ws.close();
  } catch (error) {
    console.error('Soniox 중지 오류:', error);
  } finally {
    cleanup();
    ws = null;
  }
}

// ============================================================================
// 상태 확인
// ============================================================================

export function isSonioxActive(): boolean {
  return isActive;
}

export function getCurrentSequence(): number {
  return sequence;
}
