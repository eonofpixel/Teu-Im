"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";
import { MultiLanguageSelector, SUPPORTED_LANGUAGES } from "@/components/multi-language-selector";
import type { LanguageCode } from "@teu-im/shared";

// ─── 아이콘 컴포넌트 ──────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ─── 확인 모달 ────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm,
  loading = false,
  confirmText = "확인",
  cancelText = "취소",
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h4 className="text-sm font-semibold text-white mb-2">{title}</h4>
        <p className="text-sm text-gray-400 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 토스트 메시지 ────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-up">
      <div className="rounded-lg border border-green-800 bg-green-900/90 px-4 py-3 shadow-xl shadow-black/30 flex items-center gap-2">
        <CheckIcon />
        <span className="text-sm text-green-100">{message}</span>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Project data
  const [name, setName] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("ko");
  const [targetLangs, setTargetLangs] = useState<LanguageCode[]>(["en"]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  // Copy states
  const [codeCopied, setCodeCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Confirmation modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth/login");
          return;
        }

        const response = await fetch(`/api/projects/${projectId}`);
        const result = await response.json();

        if (!response.ok || !result.project) {
          setError("프로젝트를 찾을 수 없습니다");
          setLoading(false);
          return;
        }

        const project = result.project;
        setName(project.name);
        setSourceLang(project.source_lang);
        setTargetLangs(project.target_langs || [project.target_lang]);
        setCode(project.code);
        setPassword(project.password);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch project:", err);
        setError("프로젝트 데이터를 불러올 수 없습니다");
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, router]);

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("프로젝트 이름을 입력해주세요");
      return;
    }

    if (targetLangs.length === 0) {
      setError("타겟 언어를 최소 1개 선택해주세요");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          source_lang: sourceLang,
          target_lang: targetLangs[0],
          target_langs: targetLangs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setToast("변경사항이 저장되었습니다");
    } catch (err) {
      console.error("Failed to save:", err);
      setError("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  // Regenerate password
  const handleRegeneratePassword = async () => {
    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regeneratePassword: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate password");
      }

      const result = await response.json();
      setPassword(result.project.password);
      setShowPasswordModal(false);
      setToast("비밀번호가 재생성되었습니다");
    } catch (err) {
      console.error("Failed to regenerate password:", err);
      setError("비밀번호 재생성 중 오류가 발생했습니다");
    } finally {
      setRegenerating(false);
    }
  };

  // Regenerate code
  const handleRegenerateCode = async () => {
    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerateCode: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate code");
      }

      const result = await response.json();
      setCode(result.project.code);
      setShowCodeModal(false);
      setToast("코드가 재생성되었습니다");
    } catch (err) {
      console.error("Failed to regenerate code:", err);
      setError("코드 재생성 중 오류가 발생했습니다");
    } finally {
      setRegenerating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: "code" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "code") {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-32 mb-6" />
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
            <div className="h-10 bg-gray-800 rounded" />
            <div className="h-10 bg-gray-800 rounded" />
            <div className="h-10 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Modals */}
      {showPasswordModal && (
        <ConfirmModal
          title="비밀번호 재생성"
          message="새로운 비밀번호를 생성하시겠습니까? 기존 비밀번호는 더 이상 사용할 수 없습니다."
          onCancel={() => setShowPasswordModal(false)}
          onConfirm={handleRegeneratePassword}
          loading={regenerating}
          confirmText="재생성"
        />
      )}

      {showCodeModal && (
        <ConfirmModal
          title="코드 재생성"
          message="새로운 프로젝트 코드를 생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다."
          onCancel={() => setShowCodeModal(false)}
          onConfirm={handleRegenerateCode}
          loading={regenerating}
          confirmText="재생성"
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/sessions`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-3"
        >
          <ChevronLeftIcon />
          프로젝트로 돌아가기
        </Link>
        <h1 className="text-xl font-bold text-white">프로젝트 설정</h1>
        <p className="text-sm text-gray-400 mt-1">프로젝트 정보를 수정하세요</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Settings */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">기본 정보</h2>

          {/* Project name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
              프로젝트 이름
              <span className="text-indigo-400 ml-1" aria-hidden="true">*</span>
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
            <label htmlFor="sourceLang" className="block text-sm font-medium text-gray-300 mb-1.5">
              소스 언어
              <span className="text-indigo-400 ml-1" aria-hidden="true">*</span>
            </label>
            <select
              id="sourceLang"
              value={sourceLang}
              onChange={(e) => {
                const newSource = e.target.value as LanguageCode;
                setSourceLang(newSource);
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

          {/* Target languages */}
          <MultiLanguageSelector
            label="타겟 언어"
            selected={targetLangs}
            onChange={setTargetLangs}
            excludeCodes={[sourceLang]}
            placeholder="타겟 언어를 선택하세요 (복수 가능)"
            required
          />

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || targetLangs.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
            >
              취소
            </button>
          </div>
        </div>

        {/* Access Credentials */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">접근 정보</h2>

          {/* Project Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              프로젝트 코드
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white font-mono">
                {code}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(code, "code")}
                className="rounded-lg border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 flex items-center gap-1.5"
              >
                {codeCopied ? <CheckIcon /> : <CopyIcon />}
                {codeCopied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              비밀번호
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white font-mono">
                {password}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(password, "password")}
                className="rounded-lg border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 flex items-center gap-1.5"
              >
                {passwordCopied ? <CheckIcon /> : <CopyIcon />}
                {passwordCopied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-800/50 bg-red-900/10 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-red-400">위험 영역</h2>
            <p className="text-xs text-gray-500 mt-1">
              아래 작업은 신중하게 수행해주세요
            </p>
          </div>

          {/* Regenerate Password */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-white">비밀번호 재생성</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                새로운 4자리 비밀번호를 생성합니다. 기존 비밀번호는 사용할 수 없습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex-shrink-0 rounded-lg border border-red-700 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40 flex items-center gap-1.5"
            >
              <RefreshIcon />
              재생성
            </button>
          </div>

          {/* Regenerate Code */}
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-red-800/30">
            <div>
              <h3 className="text-sm font-medium text-white">코드 재생성</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                새로운 6자리 프로젝트 코드를 생성합니다. 기존 코드는 사용할 수 없습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCodeModal(true)}
              className="flex-shrink-0 rounded-lg border border-red-700 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40 flex items-center gap-1.5"
            >
              <RefreshIcon />
              재생성
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
