import { FormEvent, useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@teu-im/supabase";
import { useAppStore } from "@/stores/appStore";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setUser = useAppStore((state) => state.setUser);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fn = isSignUp ? signUpWithEmail : signInWithEmail;
      const { user, error: authError } = await fn(email, password);

      if (authError) {
        setError(authError.message);
        return;
      }

      if (user) {
        setUser({
          id: user.id,
          email: user.email ?? "",
          createdAt: user.created_at ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      setError((err as Error).message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full bg-indigo-600 opacity-10 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[700px] h-[700px] rounded-full bg-indigo-500 opacity-8 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <svg
                width="24"
                height="24"
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
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Teu-Im
          </h1>
          <p className="text-gray-400 mt-3 text-lg">실시간 통역 플랫폼</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-lg font-medium text-gray-200 mb-3"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-lg font-medium text-gray-200 mb-3"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-2xl px-5 py-4 animate-slide-up">
              <p className="text-red-300 text-base">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-indigo-800 disabled:to-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-5 text-lg transition-all hover:shadow-lg hover:shadow-indigo-900/30 min-h-[60px]"
          >
            {loading
              ? "처리 중..."
              : isSignUp
                ? "회원가입"
                : "로그인"}
          </button>
        </form>

        {/* Toggle sign up / login */}
        <p className="text-center text-base text-gray-400 mt-8">
          {isSignUp ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {isSignUp ? "로그인" : "회원가입"}
          </button>
        </p>
      </div>
    </div>
  );
}
