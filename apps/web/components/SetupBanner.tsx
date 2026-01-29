"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

interface SetupStatus {
  hasApiKey: boolean;
  hasProjects: boolean;
  loading: boolean;
}

export function SetupBanner() {
  const [status, setStatus] = useState<SetupStatus>({
    hasApiKey: true, // assume true until checked
    hasProjects: true,
    loading: true,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check API key
      const { data: userData } = await (supabase as any)
        .from("users")
        .select("soniox_api_key")
        .eq("id", user.id)
        .single();

      // Check projects count
      const { count } = await (supabase as any)
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStatus({
        hasApiKey: !!userData?.soniox_api_key,
        hasProjects: (count ?? 0) > 0,
        loading: false,
      });
    };

    checkSetup();
  }, []);

  if (status.loading || dismissed) return null;
  if (status.hasApiKey && status.hasProjects) return null;

  const steps = [
    {
      done: status.hasProjects,
      label: "프로젝트 생성",
      description: "통역할 프로젝트를 만드세요",
      action: status.hasProjects ? null : { href: "/projects/new", text: "생성하기" },
    },
    {
      done: status.hasApiKey,
      label: "Soniox API 키 등록",
      description: "실시간 통역에 필요한 API 키를 설정하세요",
      action: status.hasApiKey ? null : { href: "/settings", text: "설정하기" },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-400">
              {completedCount}/{steps.length}
            </span>
            시작하기
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            실시간 통역을 시작하려면 아래 단계를 완료하세요
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-400 p-1"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              step.done
                ? "bg-gray-800/50"
                : "bg-gray-800 border border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {step.done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${step.done ? "text-gray-400 line-through" : "text-white"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {step.action && (
              <Link
                href={step.action.href}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                {step.action.text}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
