"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { LanguageCode } from "@teu-im/shared";
import {
  MultiLanguageSelector,
  SUPPORTED_LANGUAGES,
} from "@/components/multi-language-selector";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function NewProjectPage() {
  const router = useRouter();
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

    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("세션이 만료되었습니다. 다시 로그인하세요.");
      setLoading(false);
      return;
    }

    const password = generateCode();

    const { error: insertError } = await (supabase as any).from("projects").insert({
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

    router.push("/projects");
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">새 프로젝트</h1>
        <p className="text-sm text-gray-400 mt-1">
          통역 프로젝트 정보를 입력하세요
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5"
      >
        {/* Project name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-300 mb-1.5"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Source language */}
        <div>
          <label
            htmlFor="sourceLang"
            className="block text-sm font-medium text-gray-300 mb-1.5"
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
              setTargetLangs((prev) => prev.filter((c) => c !== newSource));
            }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* Target languages — multi-select */}
        <MultiLanguageSelector
          label="타겟 언어"
          selected={targetLangs}
          onChange={setTargetLangs}
          excludeCodes={[sourceLang]}
          placeholder="타겟 언어를 선택하세요 (복수 가능)"
          required
        />

        {/* Validation error or server error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || targetLangs.length === 0}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "생성 중..." : "프로젝트 생성"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
