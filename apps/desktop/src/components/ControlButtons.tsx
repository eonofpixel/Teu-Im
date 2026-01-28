interface ControlButtonsProps {
  isRecording: boolean;
  isStreaming: boolean;
  onReceive: () => void | Promise<void>;
  onSend: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
}

export function ControlButtons({
  isRecording,
  isStreaming,
  onReceive,
  onSend,
  onStop,
  onEnd,
}: ControlButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Receive Button */}
      <button
        onClick={onReceive}
        disabled={isRecording}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
          ${isRecording
            ? "bg-indigo-600 text-indigo-200 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }
        `}
      >
        <svg
          className="w-4 h-4"
          fill={isRecording ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isRecording ? (
            <circle cx="12" cy="12" r="8" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 11-14 0v-1a7 7 0 0114 0v1z"
            />
          )}
        </svg>
        {isRecording ? "수신 중" : "수신"}
      </button>

      {/* Send Button */}
      <button
        onClick={onSend}
        disabled={isStreaming || !isRecording}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
          ${isStreaming
            ? "bg-emerald-600 text-emerald-200 cursor-not-allowed"
            : isRecording
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9-7-9-7v14zM5 5l14 7-14 7V5z"
          />
        </svg>
        {isStreaming ? "송출 중" : "송출"}
      </button>

      {/* Stop Button */}
      <button
        onClick={onStop}
        disabled={!isRecording && !isStreaming}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
          ${isRecording || isStreaming
            ? "bg-amber-600 hover:bg-amber-500 text-white"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        정지
      </button>

      {/* End Button */}
      <button
        onClick={onEnd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        종료
      </button>
    </div>
  );
}
