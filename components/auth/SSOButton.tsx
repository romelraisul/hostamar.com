"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SSOButton({ mode = "login" }: { mode?: "login" | "signup" }) {
  const router = useRouter();
  const enabled = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
  const [loading, setLoading] = useState(false);

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

  const handleGoogleSSO = async () => {
    setLoading(true);
    try {
      router.push(`/api/auth/sso/start?mode=${mode}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSSO}
      disabled={loading}
      className="w-full h-10 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-medium text-[14px] flex items-center justify-center gap-2 transition disabled:opacity-50"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.963 7.963 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.667z"></path>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M20.4422 10.9183C20.7492 12.0157 20.7492 13.1132 20.4422 14.2106C19.9174 16.6147 17.8547 18.4415 15.3413 18.4415C14.226 18.4415 13.1471 18.1496 12.1836 17.6228C11.2893 17.1282 10.5185 16.4319 9.91264 15.5657C9.30678 14.6994 8.88262 13.7805 8.65625 12.8499C8.42875 11.9192 8.39138 10.977 8.54782 10.0441C8.71377 9.05822 9.06946 8.10824 9.59426 7.27638C10.1191 6.44452 10.8013 5.74457 11.6168 5.21437C12.4323 4.68418 13.3625 4.33412 14.3527 4.17602C15.3429 4.01792 16.3789 4.05437 17.4062 4.28364C18.4335 4.51291 19.4312 4.92843 20.3562 5.51312C20.8438 5.82105 21.2964 6.21129 21.6935 6.67647C22.0929 7.14323 22.4262 7.67763 22.6836 8.26985C22.9411 8.86207 23.1204 9.50289 23.2161 10.1791C23.3359 9.66881 23.7493 7.1291 23.7493 7.1291C23.7493 7.1291 21.6894 6.23318 20.4422 5.52878C21.3984 7.28981 20.9455 8.2104 20.4422 10.9183Z" fill="#FFC107"/>
          <path d="M22.6607 13.2072C22.8807 12.8725 23.1167 12.4808 23.3193 11.9873C23.9952 10.7061 23.9974 9.16422 23.3233 7.87956C22.8248 6.90727 21.8635 6.13952 20.7831 5.72587C19.7399 5.34176 18.5566 5.12347 17.3467 5.05248C18.2471 4.98729 19.0973 4.55909 20.4422 4.13684C22.0383 3.71095 24 3.5 24 3.5C24 3.5 22.6607 7.10859 22.6607 13.2072Z" fill="#EA4335"/>
          <path d="M18.9562 15.5311C18.3721 15.8709 17.6822 16.0899 16.9276 16.1902C16.1729 16.2906 15.3632 16.2782 14.5465 16.1546C13.4408 15.9783 12.4707 15.5636 11.7348 14.9637C11.7348 14.9637 11.9651 17.0658 13.2743 18.4415C13.8346 19.0174 14.4852 19.4826 15.2147 19.8338C16.1604 20.334 17.2297 20.5568 18.3387 20.4886C19.4477 20.4204 20.5287 19.8666 21.3204 18.9448C21.7096 18.4968 22.0165 18.0221 22.25 17.4903C22.1719 17.4903 21.7844 17.7693 21.1836 17.7693C20.4178 17.7693 19.6393 17.6242 18.9562 15.5311Z" fill="#4285F4"/>
        </svg>
      )}
      {loading ? "Redirecting..." : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
    </button>
  );
}
