interface WaveformIndicatorProps {
  active: boolean;
}

export function WaveformIndicator({ active }: WaveformIndicatorProps) {
  if (!active) {
    return (
      <div className="flex items-center gap-0.5 h-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 bg-gray-700 rounded-full"
            style={{ height: "30%" }}
          />
        ))}
      </div>
    );
  }

  // Active waveform animation (placeholder via CSS)
  return (
    <div className="flex items-center gap-0.5 h-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-0.5 bg-indigo-500 rounded-full"
          style={{
            height: `${30 + Math.random() * 70}%`,
            animation: `waveformPulse 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveformPulse {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
