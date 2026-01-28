import { useEffect, useRef, useState, useCallback } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

interface LiveWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

/**
 * LiveWaveform — audio-reactive bar visualization.
 *
 * Subscribes to Tauri 'audio-data' events (PCM int16 samples) and renders
 * per-bar RMS amplitudes at 60 fps.  When idle it breathes with a slow
 * sinusoidal ambient pulse.
 */
export function LiveWaveform({
  isActive,
  barCount = 24,
  className,
}: LiveWaveformProps) {
  const [levels, setLevels] = useState<number[]>(
    () => Array(barCount).fill(0.08)
  );
  const animFrameRef = useRef<number | null>(null);
  const audioDataRef = useRef<number[]>([]);
  const prevLevelsRef = useRef<number[]>(Array(barCount).fill(0.08));

  // Smooth the current levels toward a target using exponential decay.
  // This gives bars an organic "fall" rather than snapping instantly.
  const smoothLevels = useCallback(
    (target: number[]): number[] => {
      const ATTACK = 0.35; // how fast bars rise  (higher = snappier)
      const DECAY = 0.08; // how fast bars fall   (lower  = floatier)

      return prevLevelsRef.current.map((prev, i) => {
        const t = target[i];
        const factor = t > prev ? ATTACK : DECAY;
        const next = prev + (t - prev) * factor;
        return next;
      });
    },
    [] // stable — no deps
  );

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    if (!isActive) {
      // ── Idle mode: gentle sine-wave breathing ──────────────────────
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

    // ── Active mode: subscribe to real audio and visualize ──────────
    const setupListener = async () => {
      unlisten = await listen<{ samples: number[]; sample_rate: number }>(
        "audio-data",
        (event) => {
          audioDataRef.current = event.payload.samples;
        }
      );
    };

    setupListener();

    const activeLoop = () => {
      const samples = audioDataRef.current;

      let target: number[];

      if (samples.length > 0) {
        const chunkSize = Math.max(1, Math.floor(samples.length / barCount));

        target = Array.from({ length: barCount }, (_, i) => {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, samples.length);

          // RMS amplitude over this chunk
          let sum = 0;
          for (let j = start; j < end; j++) {
            const s = samples[j];
            sum += s * s;
          }
          const rms = Math.sqrt(sum / (end - start));

          // Samples are int16 (-32768..32767).  Normalise to 0–1 with a
          // slight boost so quiet speech still registers visually.
          const normalised = rms / 12000;
          return Math.min(1, normalised);
        });

        // Clear consumed data so we don't re-render stale frames
        audioDataRef.current = [];
      } else {
        // No new data yet — decay toward zero gently
        target = prevLevelsRef.current.map((v) => v * 0.7);
      }

      const smoothed = smoothLevels(target);
      prevLevelsRef.current = smoothed;
      setLevels(smoothed);

      animFrameRef.current = requestAnimationFrame(activeLoop);
    };

    activeLoop();

    return () => {
      if (unlisten) unlisten();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      // Reset audio buffer on deactivation
      audioDataRef.current = [];
    };
  }, [isActive, barCount, smoothLevels]);

  return (
    <div
      className={`flex items-end justify-center gap-[2px] h-4 ${className ?? ""}`}
    >
      {levels.map((level, i) => {
        // Clamp visual height: minimum 12 % so bars never disappear
        const heightPct = Math.max(12, Math.min(100, level * 100));

        // Color: idle → muted gray-700 | active → indigo-to-emerald
        // Hue shifts from 240 (indigo) through 160 (emerald) based on level
        const backgroundColor = isActive
          ? `hsl(${220 - level * 80}, 65%, ${45 + level * 25}%)`
          : "rgb(55, 65, 81)";

        const opacity = isActive ? 0.55 + level * 0.45 : 0.35;

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
