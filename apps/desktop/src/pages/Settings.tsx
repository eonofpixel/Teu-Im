import { useState, useEffect, type FormEvent } from "react";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";

// --- Constants ---
const LANGUAGES = [
  { code: "ko", name: "한국어" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
];

// API 키 마스킹 (앞 8자 + **** + 뒤 4자)
function maskApiKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

// --- Reusable Sub-Components ---
function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-sm font-semibold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function StatusMessage({
  success,
  error,
}: {
  success?: string | null;
  error?: string | null;
}) {
  if (success) {
    return (
      <p className="text-sm text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2 mb-4">
        {success}
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
        {error}
      </p>
    );
  }
  return null;
}

function SaveButton({
  loading,
  disabled,
  label = "저장",
}: {
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "저장 중..." : label}
    </button>
  );
}

// --- Section: Profile ---
function ProfileSection({
  name,
  email,
  onSave,
}: {
  name: string;
  email: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [editName, setEditName] = useState(name);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditName(name);
  }, [name]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await onSave(editName);
      setSuccess("프로필이 업데이트되었습니다.");
    } catch {
      setError("프로필 저장에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <SectionCard
      title="프로필 설정"
      subtitle="이름과 프로필 정보를 관리하세요."
    >
      <StatusMessage success={success} error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 프로필 이미지 placeholder */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-medium text-white shrink-0">
            {email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-xs text-gray-400">프로필 이미지</p>
            <p className="text-xs text-gray-600">기본 아바타 사용 중</p>
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">이름</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* 이메일 (읽기 전용) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">이메일</label>
          <input
            type="text"
            value={email}
            disabled
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-600 mt-1">이메일은 변경할 수 없습니다.</p>
        </div>

        <SaveButton loading={loading} />
      </form>
    </SectionCard>
  );
}

// --- Section: API Settings ---
function ApiSection({
  initialApiKey,
  initialHasKey,
}: {
  initialApiKey: string | null;
  initialHasKey: boolean;
}) {
  const [newApiKey, setNewApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initialHasKey);
  const [maskedKey, setMaskedKey] = useState<string | null>(
    initialApiKey ? maskApiKey(initialApiKey) : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = useAppStore((state) => state.user);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newApiKey.trim()) {
      setError("API 키를 입력해주세요.");
      return;
    }
    // Soniox API 키는 64자리 hex 문자열
    if (!/^[a-f0-9]{64}$/i.test(newApiKey)) {
      setError("올바른 Soniox API 키 형식이 아닙니다. (64자리 영숫자)");
      return;
    }

    setLoading(true);

    if (!user) {
      setError("세션이 만료되었습니다.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ soniox_api_key: newApiKey })
      .eq("id", user.id);

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
    if (!confirm("정말로 API 키를 삭제하시겠습니까?")) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    if (user) {
      await supabase
        .from("users")
        .update({ soniox_api_key: null })
        .eq("id", user.id);
    }

    setHasApiKey(false);
    setMaskedKey(null);
    setNewApiKey("");
    setIsEditing(false);
    setSuccess("API 키가 삭제되었습니다.");
    setLoading(false);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("세션이 만료되었습니다.");
      setTestLoading(false);
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("soniox_api_key")
      .eq("id", user.id)
      .single();

    if (!data?.soniox_api_key) {
      setError("저장된 API 키가 없습니다.");
      setTestLoading(false);
      return;
    }

    // 키가 올바른 형식인지 확인 (64자리 hex)
    if (/^[a-f0-9]{64}$/i.test(data.soniox_api_key)) {
      setSuccess("API 키 형식이 올바릅니다. 실제 호출 테스트는 세션 시작 시 검증됩니다.");
    } else {
      setError("저장된 API 키 형식이 올바르지 않습니다.");
    }
    setTestLoading(false);
  };

  return (
    <SectionCard
      title="API 설정"
      subtitle="실시간 음성 인식에 사용되는 Soniox API 키를 관리하세요."
    >
      <StatusMessage success={success} error={error} />

      {hasApiKey && !isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">저장된 API 키</p>
              <p className="text-sm font-mono text-gray-300">{maskedKey}</p>
            </div>
            <svg
              className="w-5 h-5 text-emerald-500 shrink-0"
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
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              키 변경
            </button>
            <button
              onClick={handleTest}
              disabled={testLoading}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {testLoading ? "테스트 중..." : "테스트"}
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
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              {hasApiKey ? "새 API 키 입력" : "API 키 입력"}
            </label>
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="64자리 API 키 입력..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Soniox에서 발급받은 API 키를 입력하세요
            </p>
            <p className="text-xs text-amber-500 mt-1">
              보안을 위해 저장된 키는 마스킹되며 원본을 다시 볼 수 없습니다.
            </p>
          </div>
          <div className="flex gap-3">
            <SaveButton loading={loading} disabled={!newApiKey.trim()} />
            {hasApiKey && (
              <button
                type="button"
                onClick={() => {
                  setNewApiKey("");
                  setIsEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
              >
                취소
              </button>
            )}
          </div>
        </form>
      )}
    </SectionCard>
  );
}

// --- Section: Language Settings ---
function LanguageSection({
  initialSourceLang,
  initialTargetLang,
  onSave,
}: {
  initialSourceLang: string;
  initialTargetLang: string;
  onSave: (sourceLang: string, targetLang: string) => Promise<void>;
}) {
  const [sourceLang, setSourceLang] = useState(initialSourceLang);
  const [targetLang, setTargetLang] = useState(initialTargetLang);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSourceLang(initialSourceLang);
    setTargetLang(initialTargetLang);
  }, [initialSourceLang, initialTargetLang]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await onSave(sourceLang, targetLang);
      setSuccess("기본 언어 설정이 저장되었습니다.");
    } catch {
      setError("언어 설정 저장에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <SectionCard
      title="기본 언어 설정"
      subtitle="새 프로젝트 생성 시 기본으로 사용할 언어를 설정하세요."
    >
      <StatusMessage success={success} error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">기본 소스 언어</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-gray-800">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">기본 타겟 언어</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            {LANGUAGES.filter((lang) => lang.code !== sourceLang).map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-gray-800">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <SaveButton loading={loading} />
      </form>
    </SectionCard>
  );
}

// --- Section: Account Management ---
function AccountSection() {
  const reset = useAppStore((state) => state.reset);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? "";
      if (!email) {
        setPasswordError("이메일 주소를 확인할 수 없습니다.");
        setPasswordLoading(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback/credentials`,
      });
      if (error) {
        setPasswordError("비밀번호 재설정 이메일 전송에 실패했습니다.");
      } else {
        setPasswordSuccess("비밀번호 재설정 이메일이 전송되었습니다.");
      }
    } catch {
      setPasswordError("오류가 발생했습니다. 다시 시도해주세요.");
    }
    setPasswordLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
  };

  return (
    <SectionCard title="계정 관리" subtitle="계정 관련 작업을 수행하세요.">
      <StatusMessage success={passwordSuccess} />
      {passwordError && (
        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
          {passwordError}
        </p>
      )}

      {/* 비밀번호 변경 & 로그아웃 */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handlePasswordChange}
          disabled={passwordLoading}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {passwordLoading ? "전송 중..." : "비밀번호 변경"}
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
        >
          로그아웃
        </button>
      </div>
    </SectionCard>
  );
}

// --- Main Page ---
export function Settings({ onBack }: { onBack: () => void }) {
  const [initialLoading, setInitialLoading] = useState(true);

  // Profile state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // API state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Language state
  const [defaultSourceLang, setDefaultSourceLang] = useState("ko");
  const [defaultTargetLang, setDefaultTargetLang] = useState("en");

  const user = useAppStore((state) => state.user);

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      setUserEmail(user.email);

      const { data: userData } = await supabase
        .from("users")
        .select("name, soniox_api_key")
        .eq("id", user.id)
        .single();

      if (userData) {
        setUserName(userData.name ?? "");
        if (userData.soniox_api_key) {
          setHasApiKey(true);
          setApiKey(userData.soniox_api_key);
        }
      }

      setInitialLoading(false);
    };

    fetchUser();
  }, [user]);

  // Profile save handler
  const handleProfileSave = async (name: string) => {
    if (!user) throw new Error("세션 만료");

    const { error } = await supabase
      .from("users")
      .update({ name })
      .eq("id", user.id);

    if (error) throw error;
    setUserName(name);
  };

  // Language save handler
  const handleLanguageSave = async (sourceLang: string, targetLang: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    setDefaultSourceLang(sourceLang);
    setDefaultTargetLang(targetLang);
    // localStorage에 기본 언어 설정 저장
    localStorage.setItem("teu_im_default_source_lang", sourceLang);
    localStorage.setItem("teu_im_default_target_lang", targetLang);
  };

  // localStorage에서 초기 언어 설정 로드
  useEffect(() => {
    const savedSourceLang = localStorage.getItem("teu_im_default_source_lang");
    const savedTargetLang = localStorage.getItem("teu_im_default_target_lang");
    if (savedSourceLang) setDefaultSourceLang(savedSourceLang);
    if (savedTargetLang) setDefaultTargetLang(savedTargetLang);
  }, []);

  if (initialLoading) {
    return (
      <div className="flex-1 flex flex-col bg-gray-950">
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
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">설정</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

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
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">설정</h1>
        </div>
        <button
          onClick={onBack}
          className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
        >
          뒤로 가기
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-xl mx-auto space-y-6">
          {/* 1. 프로필 설정 */}
          <ProfileSection
            name={userName}
            email={userEmail}
            onSave={handleProfileSave}
          />

          {/* 2. API 설정 */}
          <ApiSection initialApiKey={apiKey} initialHasKey={hasApiKey} />

          {/* 3. 기본 언어 설정 */}
          <LanguageSection
            initialSourceLang={defaultSourceLang}
            initialTargetLang={defaultTargetLang}
            onSave={handleLanguageSave}
          />

          {/* 4. 계정 관리 */}
          <AccountSection />
        </div>
      </div>
    </div>
  );
}
