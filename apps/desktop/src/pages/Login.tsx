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
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Teu-Im
          </h1>
          <p className="text-gray-400 mt-2 text-sm">실시간 통역 플랫폼</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-1"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading
              ? "처리 중..."
              : isSignUp
                ? "회원가입"
                : "로그인"}
          </button>
        </form>

        {/* Toggle sign up / login */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {isSignUp ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            {isSignUp ? "로그인" : "회원가입"}
          </button>
        </p>
      </div>
    </div>
  );
}
