interface MessageBannerProps {
  error: string
  success: string
}

export default function MessageBanner({ error, success }: MessageBannerProps) {
  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center">
          {success}
        </div>
      )}
    </>
  )
}
