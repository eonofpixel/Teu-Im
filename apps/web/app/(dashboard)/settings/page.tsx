"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

// API 키 마스킹 (앞 8자 + **** + 뒤 4자)
function maskApiKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

export default function SettingsPage() {
  const [newApiKey, setNewApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("users")
          .select("soniox_api_key")
          .eq("id", session.user.id)
          .single();

        if (data?.soniox_api_key) {
          setHasApiKey(true);
          // 마스킹된 버전만 저장 (원본은 절대 프론트엔드에 저장 안함)
          setMaskedKey(maskApiKey(data.soniox_api_key));
        }
      }

      setInitialLoading(false);
    };

    fetchUser();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newApiKey.trim()) {
      setError("API 키를 입력해주세요.");
      return;
    }

    if (!newApiKey.startsWith("sk_")) {
      setError("올바른 Soniox API 키 형식이 아닙니다. (sk_로 시작해야 합니다)");
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("세션이 만료되었습니다.");
      setLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("users")
      .update({ soniox_api_key: newApiKey })
      .eq("id", session.user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setHasApiKey(true);
    setMaskedKey(maskApiKey(newApiKey));
    setNewApiKey("");
    setIsEditing(false);
    setSuccess("API 키가 안전하게 저장되었습니다.");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("정말로 API 키를 삭제하시겠습니까?")) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("users")
        .update({ soniox_api_key: null })
        .eq("id", session.user.id);
    }

    setHasApiKey(false);
    setMaskedKey(null);
    setNewApiKey("");
    setIsEditing(false);
    setSuccess("API 키가 삭제되었습니다.");
    setLoading(false);
  };

  const handleCancel = () => {
    setNewApiKey("");
    setIsEditing(false);
    setError(null);
  };

  if (initialLoading) {
    return (
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">설정</h1>
        </div>
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">설정</h1>
        <p className="text-sm text-gray-400 mt-1">계정 및 API 설정</p>
      </div>

      {/* Soniox API 키 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-white mb-1">
          Soniox API 키
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          실시간 음성 인식에 사용되는 Soniox API 키를 입력하세요.
          <br />
          <span className="text-amber-500">
            보안을 위해 저장된 키는 마스킹되며 원본을 다시 볼 수 없습니다.
          </span>
        </p>

        {/* 성공/에러 메시지 */}
        {success && (
          <p className="text-sm text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2 mb-4">
            {success}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* 저장된 키가 있고 편집 모드가 아닐 때 */}
        {hasApiKey && !isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">저장된 API 키</p>
                <p className="text-sm font-mono text-gray-300">{maskedKey}</p>
              </div>
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
              >
                키 변경
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          /* 새 키 입력 폼 */
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                {hasApiKey ? "새 API 키 입력" : "API 키 입력"}
              </label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk_live_..."
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Soniox에서 발급받은 API 키를 입력하세요
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !newApiKey.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "저장 중..." : "저장"}
              </button>
              {hasApiKey && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
