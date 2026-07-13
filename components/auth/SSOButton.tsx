"use client";
import Link from "next/link";

export function SSOButton({ mode = "login" }: { mode?: "login" | "signup" }) {
  const enabled = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
  const href = `/api/auth/sso/start?mode=${mode}`;

  if (!enabled) {
    return (
      <button
        disabled
        title="SSO not configured yet - set SSO_* env vars"
        className="w-full h-10 rounded-lg border border-dashed border-zinc-300 text-zinc-400 text-sm cursor-not-allowed"
      >
        Continue with Hostamar SSO — coming soon
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="w-full h-10 rounded-lg border border-zinc-300 hover:bg-zinc-50 font-medium flex items-center justify-center gap-2"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
      Continue with Hostamar SSO
    </Link>
  );
}
