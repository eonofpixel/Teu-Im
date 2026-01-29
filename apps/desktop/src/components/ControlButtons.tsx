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
          flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all min-h-[52px]
          ${isRecording
            ? "bg-indigo-600/50 text-indigo-200 cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-900/30"
          }
        `}
      >
        <svg
          className="w-5 h-5"
          fill={isRecording ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          {isRecording ? (
            <circle cx="12" cy="12" r="8" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
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
          flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all min-h-[52px]
          ${isStreaming
            ? "bg-emerald-600/50 text-emerald-200 cursor-not-allowed"
            : isRecording
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-900/30"
              : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
          }
        `}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
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
          flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all min-h-[52px]
          ${isRecording || isStreaming
            ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white hover:shadow-lg hover:shadow-amber-900/30"
            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
          }
        `}
      >
        <svg
          className="w-5 h-5"
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
        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-red-900/30 border border-red-800/40 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-all min-h-[52px]"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        종료
      </button>
    </div>
  );
}
