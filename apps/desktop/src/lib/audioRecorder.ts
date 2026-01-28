/**
 * 오디오 录制 및 저장 모듈
 * 해석 세션 중 오디오를 캡처하고 WAV 파일로 저장한 후 Supabase Storage에 업로드
 * Chunked 모드: 5초 단위로 WebM 청크를 생성하여 실시간 업로드
 */

import { supabase } from './supabase';

/** 청크 메타데이터 (업로드 완료 후 반환) */
export interface AudioChunkMeta {
  chunkIndex: number;
  storagePath: string;
  startTimeMs: number;
  endTimeMs: number;
  fileSizeBytes: number;
}

/** 청크 录제 옵션 */
export interface ChunkedRecordingOptions {
  /** 청크 길이(밀리초). 기본 5000 */
  chunkDurationMs?: number;
}

class AudioRecorder {
  private chunks: Int16Array[] = [];
  private sampleRate: number = 48000;
  private isRecording: boolean = false;

  // --- Chunked recording state ---
  private chunkedMode: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private currentChunkBlob: Blob | null = null;
  private chunkIndex: number = 0;
  private chunkStartTimeMs: number = 0;
  private chunkDurationMs: number = 5000;
  private sessionId: string = '';
  private onChunkReady: ((meta: AudioChunkMeta) => void) | null = null;

  // --- Legacy (WAV full-file) mode ---

  startRecording(sampleRate: number) {
    this.chunks = [];
    this.sampleRate = sampleRate;
    this.isRecording = true;
  }

  addChunk(samples: Int16Array) {
    if (this.isRecording && !this.chunkedMode) {
      this.chunks.push(new Int16Array(samples));
    }
  }

  stopRecording(): Blob {
    this.isRecording = false;
    return this.createWavBlob();
  }

  private createWavBlob(): Blob {
    const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const wavHeader = this.createWavHeader(combined.length * 2);
    const wavData = new Uint8Array(wavHeader.length + combined.length * 2);
    wavData.set(wavHeader);
    wavData.set(new Uint8Array(combined.buffer), wavHeader.length);

    return new Blob([wavData], { type: 'audio/wav' });
  }

  private createWavHeader(dataLength: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  getDurationMs(): number {
    const totalSamples = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    return Math.floor((totalSamples / this.sampleRate) * 1000);
  }

  // --- Chunked recording mode (WebM, 5-second segments) ---

  /**
   * 청크 모드 录제 시작
   * MediaRecorder를 활용해 WebM 청크를 주기적으로 생성
   * @param stream - getUserMedia로 얻은 MediaStream
   * @param sessionId - 세션 ID (업로드 경로 구성용)
   * @param callback - 각 청크 업로드 완료 시 호출
   * @param options - 청크 길이 등 옵션
   */
  async startChunkedRecording(
    stream: MediaStream,
    sessionId: string,
    callback: (meta: AudioChunkMeta) => void,
    options: ChunkedRecordingOptions = {}
  ): Promise<void> {
    this.chunkedMode = true;
    this.sessionId = sessionId;
    this.chunkIndex = 0;
    this.chunkDurationMs = options.chunkDurationMs ?? 5000;
    this.onChunkReady = callback;
    this.chunkStartTimeMs = 0;
    this.isRecording = true;

    // WebM audio 지원 여부 확인, 미지원 시 Opus fallback
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });

    const chunkParts: Blob[] = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunkParts.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      // 현재 청크 완성 후 업로드
      if (chunkParts.length > 0) {
        const blob = new Blob(chunkParts, { type: mimeType });
        this.currentChunkBlob = blob;
        chunkParts.length = 0;
        this.uploadCurrentChunk();
      }
    };

    // 주기적으로 청크 단위로 slice
    this.mediaRecorder.start(this.chunkDurationMs);

    // timeslice 이벤트마다 청크 경계 처리
    let lastSliceTime = 0;
    const intervalId = setInterval(() => {
      if (!this.isRecording || !this.mediaRecorder) {
        clearInterval(intervalId);
        return;
      }

      // chunkDurationMs마다 현재 录제를 일시 정지하고 새 청크 시작
      if (Date.now() - lastSliceTime >= this.chunkDurationMs && chunkParts.length > 0) {
        lastSliceTime = Date.now();
        // stop 후 새로 start 하면 ondataavailable + onstop 트리거
        this.mediaRecorder.stop();

        // onstop에서 업로드 후 다음 청크 시작
        setTimeout(() => {
          if (this.isRecording && stream.active) {
            this.chunkStartTimeMs = this.chunkIndex * this.chunkDurationMs;
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) chunkParts.push(event.data);
            };
            this.mediaRecorder.onstop = () => {
              if (chunkParts.length > 0) {
                const blob = new Blob(chunkParts, { type: mimeType });
                this.currentChunkBlob = blob;
                chunkParts.length = 0;
                this.uploadCurrentChunk();
              }
            };
            this.mediaRecorder.start();
          }
        }, 50);
      }
    }, 100);

    // intervalId를 저장하여 stopChunkedRecording에서 정리
    (this as unknown as { _intervalId: number })._intervalId = intervalId as unknown as number;
  }

  /**
   * 청크 모드 录제 종료
   * 남은 청크를 업로드하고 정리
   */
  stopChunkedRecording(): void {
    this.isRecording = false;
    this.chunkedMode = false;

    // interval 정리
    const intervalId = (this as unknown as { _intervalId: number })._intervalId;
    if (intervalId) clearInterval(intervalId);

    // 진행 중인 MediaRecorder 종료
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.mediaRecorder = null;
    this.onChunkReady = null;
  }

  /**
   * 현재 청크를 Supabase Storage에 업로드하고 메타데이터 등록
   */
  private async uploadCurrentChunk(): Promise<void> {
    if (!this.currentChunkBlob || !this.onChunkReady) return;

    const blob = this.currentChunkBlob;
    const index = this.chunkIndex;
    const startMs = this.chunkStartTimeMs;
    const endMs = startMs + this.chunkDurationMs;
    this.chunkIndex++;
    this.chunkStartTimeMs = endMs;
    this.currentChunkBlob = null;

    // Storage에 업로드
    const storagePath = `${this.sessionId}/chunks/${index}.webm`;
    const { data, error } = await supabase.storage
      .from('session-audio')
      .upload(storagePath, blob, {
        contentType: 'audio/webm',
        upsert: true,
      });

    if (error) {
      console.error(`청크 ${index} 업로드 실패:`, error);
      return;
    }

    const meta: AudioChunkMeta = {
      chunkIndex: index,
      storagePath: data.path,
      startTimeMs: startMs,
      endTimeMs: endMs,
      fileSizeBytes: blob.size,
    };

    this.onChunkReady(meta);
  }
}

export const audioRecorder = new AudioRecorder();

/**
 * WAV Blob을 Supabase Storage에 업로드 (legacy full-file 모드)
 * @returns 저장된 파일 경로 또는 실패 시 null
 */
export async function uploadSessionAudio(
  sessionId: string,
  audioBlob: Blob
): Promise<string | null> {
  const fileName = `${sessionId}/recording.wav`;

  const { data, error } = await supabase.storage
    .from('session-audio')
    .upload(fileName, audioBlob, {
      contentType: 'audio/wav',
      upsert: true,
    });

  if (error) {
    console.error('오디오 업로드 실패:', error);
    return null;
  }

  return data.path;
}

/**
 * sessions 테이블에 오디오 파일 정보 업데이트
 */
export async function updateSessionAudio(
  sessionId: string,
  audioPath: string,
  durationMs: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('sessions')
    .update({
      audio_file_path: audioPath,
      audio_duration_ms: durationMs,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('세션 오디오 정보 업데이트 실패:', error);
  }
}

/**
 * 청크 메타데이터를 API에 등록
 * 업로드된 각 청크를 audio_chunks 테이블에 기록
 */
export async function registerAudioChunk(
  sessionId: string,
  chunk: AudioChunkMeta
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('audio_chunks')
    .insert({
      session_id: sessionId,
      chunk_index: chunk.chunkIndex,
      storage_path: chunk.storagePath,
      start_time_ms: chunk.startTimeMs,
      end_time_ms: chunk.endTimeMs,
      file_size_bytes: chunk.fileSizeBytes,
    });

  if (error) {
    console.error(`청크 ${chunk.chunkIndex} 메타데이터 등록 실패:`, error);
  }
}
