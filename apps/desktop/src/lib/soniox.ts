/**
 * Soniox STT + Translation 클라이언트
 * Tauri 네이티브 오디오 캡처 + WebSocket 방식
 *
 * 지원:
 * - 단일 언어: startSoniox(config)
 * - 다중 언어: startMultiLangSoniox(config) - 언어별 독립 WebSocket
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { supabase } from './supabase';
import { audioRecorder, uploadSessionAudio, updateSessionAudio } from './audioRecorder';

// ============================================================================
// 타입 정의
// ============================================================================

/** 단일 언어 설정 (기존 API 호환) */
export interface SonioxConfig {
  projectId: string;
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  deviceId?: string;
  onPartialResult: (result: InterpretationResult) => void;
  onFinalResult: (result: InterpretationResult) => void;
  onError: (error: Error) => void;
  onConnectionChange: (connected: boolean) => void;
}

/** 다중 언어 설정 */
export interface MultiLangConfig {
  projectId: string;
  sessionId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  deviceId?: string;
  onPartialResult: (result: InterpretationResult) => void;
  onFinalResult: (result: InterpretationResult) => void;
  onError: (error: Error, targetLanguage: string) => void;
  onConnectionChange: (connected: boolean, targetLanguage: string) => void;
}

/** 통역 결과 */
export interface InterpretationResult {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  sequence: number;
  startTimeMs?: number;
  endTimeMs?: number;
}

export interface AudioDevice {
  id: string;
  name: string;
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
// 모듈 상태 - 단일 언어 모드
// ============================================================================
let ws: WebSocket | null = null;
let audioUnlisten: UnlistenFn | null = null;
let currentConfig: SonioxConfig | null = null;
let sequence = 0;
let isActive = false;

// ============================================================================
// 모듈 상태 - 다중 언어 모드
// ============================================================================
let multiLangConnections: Map<string, LanguageConnection> = new Map();
let multiLangAudioUnlisten: UnlistenFn | null = null;
let multiLangConfig: MultiLangConfig | null = null;
let isMultiLangActive = false;
let multiLangApiKey: string | null = null;

// 오디오 장치 목록 조회
export async function listAudioDevices(): Promise<AudioDevice[]> {
  return await invoke<AudioDevice[]>('list_audio_devices');
}

// Temp API Key 요청
async function fetchTempApiKey(projectId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('인증이 필요합니다');
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/soniox/temp-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API 키 발급 실패');
  }

  const data = await response.json();
  console.log('Temp API key response:', { hasKey: !!data.tempApiKey, keyLength: data.tempApiKey?.length });
  return data.tempApiKey;
}

// 통역 결과 저장 (단일 언어 - 기존 호환)
async function saveInterpretation(
  sessionId: string,
  originalText: string,
  translatedText: string,
  isFinal: boolean,
  seq: number
): Promise<void> {
  if (!originalText && !translatedText) return;

  const { error } = await supabase
    .from('interpretations')
    .upsert(
      {
        session_id: sessionId,
        original_text: originalText,
        translated_text: translatedText,
        is_final: isFinal,
        sequence: seq,
      },
      {
        onConflict: 'session_id,sequence',
      }
    );

  if (error) {
    console.error('통역 결과 저장 실패:', error);
  }
}

// 통역 결과 저장 (다중 언어 - target_language 포함)
async function saveMultiLangInterpretation(
  sessionId: string,
  originalText: string,
  translatedText: string,
  targetLanguage: string,
  isFinal: boolean,
  seq: number,
  startTimeMs?: number,
  endTimeMs?: number
): Promise<void> {
  if (!originalText && !translatedText) return;

  const { error } = await supabase
    .from('interpretations')
    .upsert(
      {
        session_id: sessionId,
        original_text: originalText,
        translated_text: translatedText,
        target_language: targetLanguage,
        is_final: isFinal,
        sequence: seq,
        start_time_ms: startTimeMs,
        end_time_ms: endTimeMs,
      },
      {
        // 다중 언어는 session_id + sequence + target_language가 유니크
        onConflict: 'session_id,sequence,target_language',
      }
    );

  if (error) {
    console.error(`통역 결과 저장 실패 (${targetLanguage}):`, error);
  }
}

// Soniox 스트리밍 시작
export async function startSoniox(config: SonioxConfig): Promise<void> {
  if (isActive) {
    console.warn('Soniox가 이미 실행 중입니다');
    return;
  }

  try {
    currentConfig = config;
    sequence = 0;

    // 1. Temp API Key 발급
    console.log('Fetching temp API key...');
    const apiKey = await fetchTempApiKey(config.projectId);
    console.log('API key received');

    // 2. WebSocket 연결
    const wsUrl = `wss://stt-rt.soniox.com/transcribe-websocket?api_key=${apiKey}`;
    console.log('WebSocket URL:', wsUrl.replace(apiKey, '***'));
    console.log('Connecting to Soniox WebSocket...');
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log('WebSocket connected');

      // 3. Tauri 오디오 이벤트 리스너 등록
      let configSent = false;
      audioUnlisten = await listen<{ samples: number[], sample_rate: number }>('audio-data', (event) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          // Int16Array로 변환
          const int16Array = new Int16Array(event.payload.samples);

          // 첫 번째 오디오 데이터에서 샘플레이트를 알아낸 후 설정 전송 및 录制 시작
          if (!configSent) {
            const configMessage = {
              model: 'stt-rt-v3',
              language_hints: [config.sourceLanguage],
              include_nonfinal: true,
              audio_format: 'pcm_s16le',
              sample_rate: event.payload.sample_rate,
              num_channels: 1,
              translation: {
                type: 'one_way',
                target_language: config.targetLanguage,
              },
            };
            console.log('Sending config with sample_rate:', event.payload.sample_rate);
            ws!.send(JSON.stringify(configMessage));
            configSent = true;

            // 오디오 录制 시작
            audioRecorder.startRecording(event.payload.sample_rate);
          }

          // Soniox에 전송
          ws.send(int16Array.buffer);

          // 로컬 录制에 청크 추가
          audioRecorder.addChunk(int16Array);
        }
      });

      // 4. 네이티브 오디오 캡처 시작
      const deviceId = config.deviceId || 'default';
      console.log('Starting native audio capture:', deviceId);
      await invoke('start_audio_capture', { deviceId });

      isActive = true;
      config.onConnectionChange(true);
      console.log('Soniox streaming started');
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

        for (const token of tokens) {
          if (token.translation_status === 'translation') {
            translated += token.text || '';
          } else {
            original += token.text || '';
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
          };
          config.onFinalResult(result);
          await saveInterpretation(config.sessionId, original, translated, true, sequence);
        } else if (original || translated) {
          const result: InterpretationResult = {
            originalText: original,
            translatedText: translated,
            targetLanguage: config.targetLanguage,
            isFinal: false,
            sequence: sequence + 1,
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

// 정리
async function cleanup() {
  // 오디오 캡처 중지
  try {
    await invoke('stop_audio_capture');
  } catch (e) {
    console.error('Failed to stop audio capture:', e);
  }

  // 이벤트 리스너 해제
  if (audioUnlisten) {
    audioUnlisten();
    audioUnlisten = null;
  }

  isActive = false;
  currentConfig = null;
}

// Soniox 스트리밍 중지
export async function stopSoniox(): Promise<void> {
  if (!ws || !isActive) {
    return;
  }

  const sessionId = currentConfig?.sessionId;

  try {
    // 종료 메시지 전송
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ finish: true }));
    }
    ws.close();
  } catch (error) {
    console.error('Soniox 중지 오류:', error);
  } finally {
    // 오디오 录制 종료 및 업로드
    if (sessionId) {
      try {
        const durationMs = audioRecorder.getDurationMs();
        const audioBlob = audioRecorder.stopRecording();

        console.log(`오디오 录制 완료: ${durationMs}ms, ${audioBlob.size} bytes`);

        const audioPath = await uploadSessionAudio(sessionId, audioBlob);
        if (audioPath) {
          await updateSessionAudio(sessionId, audioPath, durationMs);
          console.log('오디오 파일 업로드 및 세션 업데이트 완료:', audioPath);
        }
      } catch (uploadError) {
        console.error('오디오 업로드 실패:', uploadError);
      }
    }

    await cleanup();
    ws = null;
  }
}

// 즉시 취소
export async function cancelSoniox(): Promise<void> {
  if (ws) {
    ws.close();
  }
  await cleanup();
  ws = null;
}

// ============================================================================
// 세션 상태 API 호출
// ============================================================================

/** 세션 상태를 API에 업데이트 */
async function updateSessionStatus(sessionId: string, status: 'active' | 'paused' | 'ended'): Promise<void> {
  const { data: { session: authSession } } = await supabase.auth.getSession();

  if (!authSession?.access_token) {
    console.warn('인증 세션이 없어 세션 상태 업데이트를 건너뜁니다');
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/sessions/${sessionId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('세션 상태 업데이트 실패:', error.error || '알 수 없는 오류');
    }
  } catch (error) {
    console.error('세션 상태 API 호출 실패:', error);
  }
}

// ============================================================================
// 일시정지 / 재개 (단일 언어 모드)
// ============================================================================

let pausedSessionId: string | null = null;

/** 단일 언어 Soniox를 일시정지 (WebSocket 및 오디오 캡처 중지, 세션 상태 업데이트) */
export async function pauseSoniox(): Promise<void> {
  if (!isActive || !ws) return;

  pausedSessionId = currentConfig?.sessionId ?? null;

  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ finish: true }));
    }
    ws.close();
  } catch (error) {
    console.error('Soniox 일시정지 오류:', error);
  } finally {
    await cleanup();
    ws = null;

    if (pausedSessionId) {
      await updateSessionStatus(pausedSessionId, 'paused');
    }
  }
}

/** 단일 언어 Soniox 재개 */
export async function resumeSoniox(config: SonioxConfig): Promise<void> {
  if (isActive) return;
  pausedSessionId = null;
  await startSoniox(config);

  if (config.sessionId) {
    await updateSessionStatus(config.sessionId, 'active');
  }
}

// 상태 확인
export function isSonioxActive(): boolean {
  return isActive;
}

// 현재 sequence 반환
export function getCurrentSequence(): number {
  return sequence;
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
    multiLangApiKey = apiKey; // 저장
    console.log('API key received');

    // 2. 각 대상 언어별 WebSocket 연결 생성
    const connectionPromises = config.targetLanguages.map((targetLanguage) =>
      createLanguageConnection(apiKey, targetLanguage, config)
    );

    await Promise.all(connectionPromises);

    // 3. 모든 연결이 준비되면 오디오 캡처 시작
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
    console.log('WebSocket URL:', wsUrl.replace(apiKey, '***'));
    console.log(`Connecting WebSocket for ${targetLanguage}...`, { apiKeyLength: apiKey?.length, apiKeyPrefix: apiKey?.substring(0, 10) });
    const ws = new WebSocket(wsUrl);

    const connection: LanguageConnection = {
      ws,
      targetLanguage,
      sequence: 0,
      configSent: false,
      connected: false,
    };

    ws.onopen = () => {
      console.log(`WebSocket connected for ${targetLanguage}`);
      connection.connected = true;
      multiLangConnections.set(targetLanguage, connection);
      config.onConnectionChange(true, targetLanguage);
      resolve();
    };

    ws.onmessage = async (event) => {
      console.log(`WebSocket message for ${targetLanguage}:`, event.data.substring?.(0, 200) || event.data);
      await handleMultiLangMessage(event, connection, config);
    };

    ws.onerror = (event) => {
      console.error(`WebSocket error for ${targetLanguage}:`, event);
      config.onError(new Error(`WebSocket 연결 오류 (${targetLanguage})`), targetLanguage);
      reject(new Error(`Failed to connect for ${targetLanguage}`));
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed for ${targetLanguage}`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
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
        ws.close();
        reject(new Error(`Connection timeout for ${targetLanguage}`));
      }
    }, 10000);
  });
}

/**
 * 다중 언어 오디오 캡처 및 분배 시작
 */
async function startMultiLangAudioCapture(config: MultiLangConfig): Promise<void> {
  multiLangAudioUnlisten = await listen<{ samples: number[], sample_rate: number }>(
    'audio-data',
    (event) => {
      const int16Array = new Int16Array(event.payload.samples);

      // 모든 언어 연결에 오디오 전송
      for (const [targetLanguage, connection] of multiLangConnections) {
        if (connection.ws.readyState !== WebSocket.OPEN) continue;

        // 첫 번째 오디오 데이터에서 설정 전송
        if (!connection.configSent) {
          const configMessage = {
            api_key: multiLangApiKey, // API 키 포함
            model: 'stt-rt-v3',
            language_hints: [config.sourceLanguage],
            include_nonfinal: true,
            audio_format: 'pcm_s16le',
            sample_rate: event.payload.sample_rate,
            num_channels: 1,
            translation: {
              type: 'one_way',
              target_language: targetLanguage,
            },
          };
          console.log(`Sending config for ${targetLanguage} with sample_rate:`, event.payload.sample_rate, 'api_key included:', !!multiLangApiKey);
          connection.ws.send(JSON.stringify(configMessage));
          connection.configSent = true;
        }

        // 오디오 전송
        connection.ws.send(int16Array.buffer);
      }

      // 오디오 录制 (첫 연결의 configSent로 판단)
      const firstConnection = multiLangConnections.values().next().value;
      if (firstConnection?.configSent) {
        if (!audioRecorder['isRecording']) {
          audioRecorder.startRecording(event.payload.sample_rate);
        }
        audioRecorder.addChunk(int16Array);
      }
    }
  );

  // 네이티브 오디오 캡처 시작
  const deviceId = config.deviceId || 'default';
  console.log('Starting native audio capture for multi-lang:', deviceId);
  await invoke('start_audio_capture', { deviceId });
}

/**
 * 다중 언어 메시지 처리
 */
async function handleMultiLangMessage(
  event: MessageEvent,
  connection: LanguageConnection,
  config: MultiLangConfig
): Promise<void> {
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
      await saveMultiLangInterpretation(
        config.sessionId,
        original,
        translated,
        connection.targetLanguage,
        true,
        connection.sequence,
        startTimeMs,
        endTimeMs
      );
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
  // 오디오 캡처 중지
  try {
    await invoke('stop_audio_capture');
  } catch (e) {
    console.error('Failed to stop audio capture:', e);
  }

  // 이벤트 리스너 해제
  if (multiLangAudioUnlisten) {
    multiLangAudioUnlisten();
    multiLangAudioUnlisten = null;
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
  multiLangApiKey = null;
}

/**
 * 다중 언어 Soniox 스트리밍 중지
 */
export async function stopMultiLangSoniox(options?: { updateStatus?: boolean }): Promise<void> {
  if (!isMultiLangActive) {
    return;
  }

  const sessionId = multiLangConfig?.sessionId;
  const shouldUpdateStatus = options?.updateStatus ?? false;

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
    // 오디오 录制 종료 및 업로드
    if (sessionId) {
      try {
        const durationMs = audioRecorder.getDurationMs();
        const audioBlob = audioRecorder.stopRecording();

        console.log(`오디오 录제 완료: ${durationMs}ms, ${audioBlob.size} bytes`);

        const audioPath = await uploadSessionAudio(sessionId, audioBlob);
        if (audioPath) {
          await updateSessionAudio(sessionId, audioPath, durationMs);
          console.log('오디오 파일 업로드 및 세션 업데이트 완료:', audioPath);
        }
      } catch (uploadError) {
        console.error('오디오 업로드 실패:', uploadError);
      }
    }

    await cleanupMultiLang();

    // 세션 종료 시 API 상태 업데이트
    if (shouldUpdateStatus && sessionId) {
      await updateSessionStatus(sessionId, 'ended');
    }
  }
}

let multiLangPausedSessionId: string | null = null;

/**
 * 다중 언어 Soniox 일시정지
 */
export async function pauseMultiLangSoniox(): Promise<void> {
  if (!isMultiLangActive) return;

  multiLangPausedSessionId = multiLangConfig?.sessionId ?? null;

  try {
    for (const [targetLanguage, connection] of multiLangConnections) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({ finish: true }));
          console.log(`Sent finish (pause) to ${targetLanguage}`);
        }
        connection.ws.close();
      } catch (e) {
        console.error(`Error closing ${targetLanguage} connection during pause:`, e);
      }
    }
  } finally {
    await cleanupMultiLang();

    if (multiLangPausedSessionId) {
      await updateSessionStatus(multiLangPausedSessionId, 'paused');
    }
  }
}

/**
 * 다중 언어 Soniox 재개
 */
export async function resumeMultiLangSoniox(config: MultiLangConfig): Promise<void> {
  if (isMultiLangActive) return;
  multiLangPausedSessionId = null;
  await startMultiLangSoniox(config);

  if (config.sessionId) {
    await updateSessionStatus(config.sessionId, 'active');
  }
}

/**
 * 다중 언어 Soniox 즉시 취소
 */
export async function cancelMultiLangSoniox(): Promise<void> {
  for (const [, connection] of multiLangConnections) {
    try {
      connection.ws.close();
    } catch (e) {
      // ignore
    }
  }
  await cleanupMultiLang();
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

/**
 * 특정 언어의 연결 상태 확인
 */
export function isLanguageConnected(targetLanguage: string): boolean {
  const connection = multiLangConnections.get(targetLanguage);
  return connection?.connected ?? false;
}

/**
 * 특정 언어의 현재 sequence 반환
 */
export function getLanguageSequence(targetLanguage: string): number {
  const connection = multiLangConnections.get(targetLanguage);
  return connection?.sequence ?? 0;
}
