// Curated prompt suggestions for Hostamar input fields.
// Sourced from prompts.chat (CC0 / public domain prompt data) + Hostamar's own
// Bengali business prompts. Grouped by product category so the right suggestions
// show in video / image / chat / ide / browser inputs.
export type PromptSuggestion = {
  label: string
  prompt: string
  en?: string
}

export type PromptCategory = 'video' | 'image' | 'chat' | 'code' | 'business'

export const PROMPT_SUGGESTIONS: Record<PromptCategory, PromptSuggestion[]> = {
  video: [
    { label: 'Eid promo (Bengali)', prompt: '৩০ সেকেন্ডের ঈদ মোবারক ভিডিও বানাও। চাঁদ, মসজিদ, ফুলের অ্যানিমেশন + বাংলা ভয়েসওভার।', en: 'Create a 30-second Eid Mubarak video with crescent moon, mosque, flower animations + Bengali voiceover.' },
    { label: 'Business promo', prompt: '১৫ সেকেন্ডের প্রমোশন ভিডিও বানাও। লোগো, অফার, ফোন নম্বর দেখাও। মডার্ন স্টাইল।', en: 'Create a 15-second promo video showing logo, offer, phone number. Modern style.' },
    { label: 'Restaurant ad', prompt: 'রেস্তোরাঁর জন্য ৩০ সেকেন্ডের খাবার প্রমোশন ভিডিও। রান্নার ক্লোজ-আপ, দাম, লোকেশন দেখাও।', en: '30-second food promo for a restaurant with cooking close-ups, price, location.' },
  ],
  image: [
    { label: 'Product photo', prompt: 'Professional product photo of a white cotton tajbiya on a wooden table, soft lighting, 4K', en: 'Professional product photo, soft lighting, 4K.' },
    { label: 'Logo design', prompt: 'Minimalist logo for a modern tech brand, flat vector, clean lines, blue and white palette', en: 'Minimalist modern logo, flat vector, clean lines.' },
    { label: 'Restaurant banner', prompt: 'Appetizing Bengali food spread banner photo, biriyani and kebab on rustic table, warm light', en: 'Appetizing Bengali food banner photo.' },
  ],
  chat: [
    { label: 'Bengali email drafter', prompt: 'আমাকে এই ইমেইলের পেশাদার বাংলা উত্তর লিখে দাও। আনুষ্ঠানিক কিন্তু বন্ধুসুলভ টোনে।', en: 'Write a professional Bengali reply to this email.' },
    { label: 'Code explainer', prompt: 'এই কোড বাংলায় সহজ ভাষায় ধাপে ধাপে ব্যাখ্যা করো।', en: 'Explain this code step by step in Bengali.' },
    { label: 'Act as Linux terminal', prompt: 'I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show.', en: 'Act as a Linux terminal.' },
  ],
  code: [
    { label: 'Code reviewer', prompt: 'Act as a senior engineer and review this code for bugs, performance and edge cases.', en: 'Review this code as a senior engineer.' },
    { label: 'SQL generator', prompt: 'Generate a SQL query that fetches the top 10 customers by total spend this month.', en: 'Generate this SQL query.' },
  ],
  business: [
    { label: 'Sales copy', prompt: 'এই পণ্যের জন্য কনভার্টিং সেলস কপি লিখো। বাংলায়, মোবাইল-ফার্স্ট, ১৫০ শব্দের মধ্যে।', en: 'Write converting sales copy for this product.' },
    { label: 'WhatsApp reply', prompt: 'গ্রাহক দাম জানতে চাইছে। বন্ধুসুলভ, পেশাদার বাংলা উত্তর দাও।', en: 'Give a friendly professional reply to this price enquiry.' },
  ],
}

export const ALL_PROMPT_ACTIONS = [
  'Act as a Linux terminal',
  'Act as a senior code reviewer',
  'Act as an English translator and improver',
  'Act as a Job Interviewer',
  'Act as a SQL database expert',
]
