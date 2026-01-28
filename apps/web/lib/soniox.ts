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

/** 다중 언어 설정 */
export interface MultiLangConfig {
  projectId: string;
  sessionId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  onPartialResult: (result: InterpretationResult) => void;
  onFinalResult: (result: InterpretationResult) => void;
  onError: (error: Error, targetLanguage: string) => void;
  onConnectionChange: (connected: boolean, targetLanguage: string) => void;
}

/** 언어별 WebSocket 연결 상태 */
interface LanguageConnection {
  ws: WebSocket;
  targetLanguage: string;
  sequence: number;
  configSent: boolean;
  connected: boolean;
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
// 모듈 상태 - 다중 언어 모드
// ============================================================================

let multiLangConnections: Map<string, LanguageConnection> = new Map();
let multiLangAudioContext: AudioContext | null = null;
let multiLangMediaStream: MediaStream | null = null;
let multiLangScriptProcessor: ScriptProcessorNode | null = null;
let multiLangConfig: MultiLangConfig | null = null;
let isMultiLangActive = false;

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
// Soniox 일시정지
// ============================================================================

export async function pauseSoniox(): Promise<void> {
  if (!isActive || !mediaStream) {
    throw new Error('녹음 중이지 않습니다');
  }

  // 미디어 스트림 트랙 일시정지 (오디오 전송 중단)
  mediaStream.getTracks().forEach((track) => {
    track.enabled = false;
  });

  console.log('Soniox paused');
}

// ============================================================================
// Soniox 재개
// ============================================================================

export async function resumeSoniox(): Promise<void> {
  if (!isActive || !mediaStream) {
    throw new Error('활성 세션이 없습니다');
  }

  // 미디어 스트림 트랙 재개 (오디오 전송 복원)
  mediaStream.getTracks().forEach((track) => {
    track.enabled = true;
  });

  console.log('Soniox resumed');
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

export function getMediaStream(): MediaStream | null {
  return mediaStream || multiLangMediaStream;
}

// ============================================================================
// 다중 언어 WebSocket 관리
// ============================================================================

/**
 * 다중 언어 Soniox 스트리밍 시작
 * 각 대상 언어별로 독립적인 WebSocket 연결을 생성하고 단일 오디오 스트림을 공유
 */
export async function startMultiLangSoniox(config: MultiLangConfig): Promise<void> {
  if (isMultiLangActive || isActive) {
    console.warn('Soniox가 이미 실행 중입니다');
    return;
  }

  if (config.targetLanguages.length === 0) {
    throw new Error('최소 하나의 대상 언어가 필요합니다');
  }

  try {
    multiLangConfig = config;
    multiLangConnections.clear();

    // 1. Temp API Key 발급 (모든 연결에서 공유)
    console.log('Fetching temp API key for multi-lang...');
    const apiKey = await fetchTempApiKey(config.projectId);
    console.log('API key received');

    // 2. 각 대상 언어별 WebSocket 연결 생성
    const connectionPromises = config.targetLanguages.map((targetLanguage) =>
      createLanguageConnection(apiKey, targetLanguage, config)
    );

    await Promise.all(connectionPromises);

    // 3. 모든 연결이 준비되면 Web Audio API 오디오 캡처 및 분배 시작
    console.log(`All ${config.targetLanguages.length} language connections ready`);
    await startMultiLangAudioCapture(config);

    isMultiLangActive = true;
    console.log('Multi-lang Soniox streaming started');
  } catch (error) {
    console.error('다중 언어 Soniox 시작 실패:', error);
    await cleanupMultiLang();
    throw error;
  }
}

/**
 * 언어별 WebSocket 연결 생성
 */
async function createLanguageConnection(
  apiKey: string,
  targetLanguage: string,
  config: MultiLangConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wsUrl = `wss://stt-rt.soniox.com/transcribe-websocket?api_key=${apiKey}`;
    console.log(`Connecting WebSocket for ${targetLanguage}...`);
    const langWs = new WebSocket(wsUrl);

    const connection: LanguageConnection = {
      ws: langWs,
      targetLanguage,
      sequence: 0,
      configSent: false,
      connected: false,
    };

    langWs.onopen = () => {
      console.log(`WebSocket connected for ${targetLanguage}`);
      connection.connected = true;
      multiLangConnections.set(targetLanguage, connection);
      config.onConnectionChange(true, targetLanguage);
      resolve();
    };

    langWs.onmessage = (event) => {
      handleMultiLangMessage(event, connection, config);
    };

    langWs.onerror = (event) => {
      console.error(`WebSocket error for ${targetLanguage}:`, event);
      config.onError(new Error(`WebSocket 연결 오류 (${targetLanguage})`), targetLanguage);
      reject(new Error(`Failed to connect for ${targetLanguage}`));
    };

    langWs.onclose = (event) => {
      console.log(`WebSocket closed for ${targetLanguage}`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      connection.connected = false;
      multiLangConnections.delete(targetLanguage);
      config.onConnectionChange(false, targetLanguage);

      // 모든 연결이 끊어지면 정리
      if (multiLangConnections.size === 0 && isMultiLangActive) {
        cleanupMultiLang();
      }
    };

    // 타임아웃 처리
    setTimeout(() => {
      if (!connection.connected) {
        langWs.close();
        reject(new Error(`Connection timeout for ${targetLanguage}`));
      }
    }, 10000);
  });
}

/**
 * 다중 언어 오디오 캡처 및 분배 시작 (Web Audio API)
 * 단일 MediaStream을 공유하며 각 언어 WebSocket에 동일한 오디오 청크를 전송
 */
async function startMultiLangAudioCapture(config: MultiLangConfig): Promise<void> {
  // 마이크 스트림 캡처
  multiLangMediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000,
    },
  });

  multiLangAudioContext = new AudioContext({ sampleRate: 16000 });
  const source = multiLangAudioContext.createMediaStreamSource(multiLangMediaStream);

  const bufferSize = 4096;
  multiLangScriptProcessor = multiLangAudioContext.createScriptProcessor(bufferSize, 1, 1);

  multiLangScriptProcessor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);

    // 다운샘플링 (필요시)
    const sampleRate = multiLangAudioContext?.sampleRate || 16000;
    const downsampled = downsampleBuffer(inputData, sampleRate, 16000);

    // Int16으로 변환 (한 번만 수행하여 모든 연결에 공유)
    const int16Data = floatTo16BitPCM(downsampled);

    // 모든 언어 연결에 오디오 전송
    for (const [targetLanguage, connection] of multiLangConnections) {
      if (connection.ws.readyState !== WebSocket.OPEN) continue;

      // 첫 번째 오디오 데이터에서 설정 전송
      if (!connection.configSent) {
        const configMessage = {
          model: 'stt-rt-v3',
          language_hints: [config.sourceLanguage],
          include_nonfinal: true,
          audio_format: 'pcm_s16le',
          sample_rate: 16000,
          num_channels: 1,
          translation: {
            type: 'one_way',
            target_language: targetLanguage,
          },
        };
        console.log(`Sending config for ${targetLanguage}`);
        connection.ws.send(JSON.stringify(configMessage));
        connection.configSent = true;
      }

      // 오디오 전송
      connection.ws.send(int16Data.buffer);
    }
  };

  source.connect(multiLangScriptProcessor);
  multiLangScriptProcessor.connect(multiLangAudioContext.destination);

  console.log('Multi-lang audio capture started via Web Audio API');
}

/**
 * 다중 언어 메시지 처리
 */
function handleMultiLangMessage(
  event: MessageEvent,
  connection: LanguageConnection,
  config: MultiLangConfig
): void {
  try {
    const data = JSON.parse(event.data);

    if (data.error) {
      console.error(`Soniox error for ${connection.targetLanguage}:`, data.error);
      config.onError(new Error(data.error), connection.targetLanguage);
      return;
    }

    // 토큰에서 텍스트 및 타임스탬프 추출
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
        // 원본 토큰에서 타임스탬프 추출 (첫 번째와 마지막)
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
      connection.sequence++;
      const result: InterpretationResult = {
        originalText: original,
        translatedText: translated,
        targetLanguage: connection.targetLanguage,
        isFinal: true,
        sequence: connection.sequence,
        startTimeMs,
        endTimeMs,
      };
      config.onFinalResult(result);
    } else if (original || translated) {
      const result: InterpretationResult = {
        originalText: original,
        translatedText: translated,
        targetLanguage: connection.targetLanguage,
        isFinal: false,
        sequence: connection.sequence + 1,
        startTimeMs,
        endTimeMs,
      };
      config.onPartialResult(result);
    }
  } catch (err) {
    console.error(`Error processing message for ${connection.targetLanguage}:`, err);
  }
}

/**
 * 다중 언어 정리
 */
async function cleanupMultiLang(): Promise<void> {
  // ScriptProcessor 연결 해제
  if (multiLangScriptProcessor) {
    multiLangScriptProcessor.disconnect();
    multiLangScriptProcessor = null;
  }

  // AudioContext 종료
  if (multiLangAudioContext) {
    multiLangAudioContext.close();
    multiLangAudioContext = null;
  }

  // 미디어 스트림 정리
  if (multiLangMediaStream) {
    multiLangMediaStream.getTracks().forEach((track) => track.stop());
    multiLangMediaStream = null;
  }

  // 모든 WebSocket 연결 정리
  for (const [, connection] of multiLangConnections) {
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    } catch (e) {
      console.error(`Failed to close connection for ${connection.targetLanguage}:`, e);
    }
  }
  multiLangConnections.clear();

  isMultiLangActive = false;
  multiLangConfig = null;
}

/**
 * 다중 언어 Soniox 스트리밍 중지
 */
export async function stopMultiLangSoniox(): Promise<void> {
  if (!isMultiLangActive) {
    return;
  }

  try {
    // 각 연결에 종료 메시지 전송
    for (const [targetLanguage, connection] of multiLangConnections) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({ finish: true }));
          console.log(`Sent finish to ${targetLanguage}`);
        }
        connection.ws.close();
      } catch (e) {
        console.error(`Error closing ${targetLanguage} connection:`, e);
      }
    }
  } catch (error) {
    console.error('다중 언어 Soniox 중지 오류:', error);
  } finally {
    await cleanupMultiLang();
  }
}

/**
 * 다중 언어 Soniox 활성 상태 확인
 */
export function isMultiLangSonioxActive(): boolean {
  return isMultiLangActive;
}

/**
 * 연결된 언어 목록 반환
 */
export function getConnectedLanguages(): string[] {
  return Array.from(multiLangConnections.keys());
}
