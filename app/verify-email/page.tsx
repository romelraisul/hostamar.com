"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function VerifyEmailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = params.get("token")
    if (!token) {
      setStatus("error")
      setMessage("Missing token.")
      return
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (r.ok) {
          setStatus("success")
          setMessage("Email verified! You can now log in.")
          setTimeout(() => router.push("/login"), 2000)
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed.")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Network error.")
      })
  }, [params, router])

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {status === "loading" && <Loader2 className="w-8 h-8 animate-spin text-green-600" />}
      {status === "success" && <CheckCircle className="w-8 h-8 text-green-600" />}
      {status === "error" && <XCircle className="w-8 h-8 text-red-600" />}
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#FCFCF9] flex items-center justify-center px-4">
      <Link href="/" className="absolute top-6 left-6 text-sm text-zinc-500 hover:text-zinc-800">← Back to home</Link>
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
