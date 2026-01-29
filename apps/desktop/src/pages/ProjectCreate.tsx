import { useState, type FormEvent } from "react";
import { LanguageCode } from "@teu-im/shared";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";

const SUPPORTED_LANGUAGES: {
  code: LanguageCode;
  name: string;
  nativeName: string;
}[] = [
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface ProjectCreateProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function ProjectCreate({ onCancel, onSuccess }: ProjectCreateProps) {
  const [name, setName] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("ko");
  const [targetLangs, setTargetLangs] = useState<LanguageCode[]>(["en"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetLangs.length === 0) {
      setError("타겟 언어를 최소 1개 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("세션이 만료되었습니다. 다시 로그인하세요.");
        setLoading(false);
        return;
      }

      const password = generateCode();

      const { error: insertError } = await (supabase as any)
        .from("projects")
        .insert({
          user_id: session.user.id,
          name,
          code: generateCode(),
          password,
          source_lang: sourceLang,
          target_lang: targetLangs[0], // primary target for backward compatibility
          target_langs: targetLangs, // full multi-language array
          status: "idle",
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message || "프로젝트 생성 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const toggleTargetLang = (code: LanguageCode) => {
    if (targetLangs.includes(code)) {
      setTargetLangs(targetLangs.filter((c) => c !== code));
    } else {
      setTargetLangs([...targetLangs, code]);
    }
  };

  const availableTargetLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => lang.code !== sourceLang
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-gray-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            새 프로젝트
          </h1>
        </div>
        <button
          onClick={onCancel}
          className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
        >
          취소
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <p className="text-base text-gray-400">
              통역 프로젝트 정보를 입력하세요
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 space-y-6"
          >
            {/* Project name */}
            <div>
              <label
                htmlFor="name"
                className="block text-base font-medium text-gray-300 mb-2"
              >
                프로젝트 이름
                <span className="text-indigo-400 ml-1" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="예: 의료학술대회 통역"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            {/* Source language */}
            <div>
              <label
                htmlFor="sourceLang"
                className="block text-base font-medium text-gray-300 mb-2"
              >
                소스 언어
                <span className="text-indigo-400 ml-1" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="sourceLang"
                value={sourceLang}
                onChange={(e) => {
                  const newSource = e.target.value as LanguageCode;
                  setSourceLang(newSource);
                  // Remove source from targets if present
                  setTargetLangs((prev) =>
                    prev.filter((c) => c !== newSource)
                  );
                }}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-base text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer transition-all"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Target languages - checkbox list */}
            <div>
              <label className="block text-base font-medium text-gray-300 mb-3">
                타겟 언어
                <span className="text-indigo-400 ml-1" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-3">
                {availableTargetLanguages.map((lang) => {
                  const isSelected = targetLangs.includes(lang.code);
                  return (
                    <label
                      key={lang.code}
                      className={[
                        "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors",
                        isSelected
                          ? "bg-indigo-900/40 border border-indigo-800/60"
                          : "bg-gray-800/60 border border-transparent hover:bg-gray-700/60",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTargetLang(lang.code)}
                        className="w-5 h-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={[
                            "font-medium text-base",
                            isSelected ? "text-indigo-300" : "text-gray-300",
                          ].join(" ")}
                        >
                          {lang.nativeName}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {lang.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">
                        {lang.code}
                      </span>
                    </label>
                  );
                })}
              </div>
              {targetLangs.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {targetLangs.length}개 언어 선택됨
                </p>
              )}
            </div>

            {/* Validation error or server error */}
            {error && (
              <div className="rounded-xl bg-red-900/20 border border-red-800/40 px-4 py-3">
                <p className="text-base text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || targetLangs.length === 0 || !name.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-3.5 text-base font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 disabled:shadow-none min-h-[44px]"
              >
                {loading ? "생성 중..." : "프로젝트 생성"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-gray-700 px-6 py-3.5 text-base font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white min-h-[44px]"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
