'use client'

import { PROMPT_SUGGESTIONS, type PromptCategory } from '@/lib/prompt-suggestions'

/**
 * PromptSuggestions — reusable suggestion chips shown above any prompt textarea.
 * Clicking a chip fills the prompt via onPick(value).
 */
export default function PromptSuggestions({
  category = 'business',
  onPick,
}: {
  category?: PromptCategory
  onPick: (prompt: string) => void
}) {
  const items = PROMPT_SUGGESTIONS[category] ?? PROMPT_SUGGESTIONS.business

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onPick(s.en ?? s.prompt)}
          className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-[12px] text-zinc-600 dark:text-zinc-300 hover:border-[#0E7C3A] hover:text-[#0E7C3A] transition whitespace-nowrap"
          title={s.en ?? s.prompt}
        >
          ✨ {s.label}
        </button>
      ))}
    </div>
  )
}
