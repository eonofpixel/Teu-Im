"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LiveWaveformProps {
  /** Live MediaStream from getUserMedia (or null when idle) */
  stream: MediaStream | null;
  /** Whether audio is actively being captured */
  isRecording: boolean;
  /** Number of vertical bars to render */
  barCount?: number;
  /** Optional Tailwind className override */
  className?: string;
}

/**
 * LiveWaveform — audio-reactive bar visualisation for the web.
 *
 * Uses the Web Audio API's AnalyserNode to sample frequency-domain data from
 * the supplied MediaStream and renders per-bar RMS amplitudes at ~60 fps.
 * When idle (not recording) it breathes with a slow sinusoidal ambient pulse,
 * matching the desktop Tauri version's visual behaviour.
 *
 * Color scheme: indigo → violet gradient driven by amplitude.
 */
export function LiveWaveform({
  stream,
  isRecording,
  barCount = 24,
  className,
}: LiveWaveformProps) {
  const [levels, setLevels] = useState<number[]>(
    () => Array(barCount).fill(0.08)
  );

  const animFrameRef = useRef<number | null>(null);
  const prevLevelsRef = useRef<number[]>(Array(barCount).fill(0.08));

  // Web Audio API context + analyser kept across frames
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Smooth the current levels toward a target using exponential decay.
  // Gives bars an organic "fall" rather than snapping instantly.
  const smoothLevels = useCallback(
    (target: number[]): number[] => {
      const ATTACK = 0.35; // how fast bars rise  (higher = snappier)
      const DECAY = 0.08; // how fast bars fall   (lower  = floatier)

      return prevLevelsRef.current.map((prev, i) => {
        const t = target[i] ?? 0;
        const factor = t > prev ? ATTACK : DECAY;
        return prev + (t - prev) * factor;
      });
    },
    [] // stable — no deps
  );

  // ── Tear down Web Audio resources ───────────────────────────────────
  const teardownAudio = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // already disconnected
      }
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // already closed
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // ── Bootstrap Web Audio from the incoming MediaStream ──────────────
  const setupAudio = useCallback((mediaStream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();

    // 1024 samples → good balance of frequency resolution & latency
    analyser.fftSize = 1024;
    // Smoothing at 0 — we handle our own exponential decay
    analyser.smoothingTimeConstant = 0;

    const source = ctx.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  useEffect(() => {
    // ── Idle mode: gentle sine-wave breathing ─────────────────────────
    if (!isRecording || !stream) {
      teardownAudio();

      const idleLoop = () => {
        const now = Date.now() / 1000;
        const target = Array.from({ length: barCount }, (_, i) => {
          // Each bar is phase-shifted so they cascade like a wave
          const phase = i * (Math.PI / (barCount * 0.7));
          const base = 0.07;
          const amplitude = 0.04;
          return base + Math.sin(now * 1.4 + phase) * amplitude;
        });

        const smoothed = smoothLevels(target);
        prevLevelsRef.current = smoothed;
        setLevels(smoothed);

        animFrameRef.current = requestAnimationFrame(idleLoop);
      };

      idleLoop();

      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }

    // ── Active mode: sample AnalyserNode and visualize ─────────────────
    setupAudio(stream);

    const activeLoop = () => {
      const analyser = analyserRef.current;

      let target: number[];

      if (analyser) {
        // Use frequency-domain (getByteFrequencyData) for richer visuals
        const bufferLength = analyser.frequencyBinCount; // fftSize / 2
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Map frequency bins → barCount buckets, computing RMS per bucket
        const binPerBar = Math.max(1, Math.floor(bufferLength / barCount));

        target = Array.from({ length: barCount }, (_, i) => {
          const start = i * binPerBar;
          const end = Math.min(start + binPerBar, bufferLength);

          let sum = 0;
          for (let j = start; j < end; j++) {
            const normalized = dataArray[j] / 255; // 0–1
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / (end - start));

          // Slight boost so quiet speech still registers visually
          return Math.min(1, rms * 1.6);
        });
      } else {
        // Analyser not ready yet — decay toward zero gently
        target = prevLevelsRef.current.map((v) => v * 0.7);
      }

      const smoothed = smoothLevels(target);
      prevLevelsRef.current = smoothed;
      setLevels(smoothed);

      animFrameRef.current = requestAnimationFrame(activeLoop);
    };

    activeLoop();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      teardownAudio();
    };
  }, [isRecording, stream, barCount, smoothLevels, setupAudio, teardownAudio]);

  return (
    <div
      className={`flex items-end justify-center gap-[2px] h-16 ${className ?? ""}`}
    >
      {levels.map((level, i) => {
        // Clamp visual height: minimum 12 % so bars never disappear
        const heightPct = Math.max(12, Math.min(100, level * 100));

        // Color: idle → muted gray-700 | active → indigo-to-violet gradient
        // Hue shifts from 240 (indigo) through 270 (violet) based on level
        const backgroundColor = isRecording
          ? `hsl(${240 + level * 30}, ${60 + level * 20}%, ${45 + level * 25}%)`
          : "rgb(55, 65, 81)";

        const opacity = isRecording ? 0.55 + level * 0.45 : 0.35;

        return (
          <div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              height: `${heightPct}%`,
              backgroundColor,
              opacity,
              transition: "height 75ms ease-out, opacity 150ms ease-out",
            }}
          />
        );
      })}
    </div>
  );
}
