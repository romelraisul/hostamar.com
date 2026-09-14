// lib/skills/video-marketing.ts — V36.36: reusable 5-step video pipeline skill.
// Topic AI -> script (Qwen3.8-Flash-Next :1919 when live, else gateway) ->
// render -> Edge-TTS voiceover -> ffmpeg combine. 90s, 4K, no watermark.

export type VideoSkillStep = {
  id: string;
  title: string;
  titleBn: string;
  tool: string;
};

export const VIDEO_MARKETING_SKILL: VideoSkillStep[] = [
  { id: 'topic', title: 'Topic', titleBn: 'টপিক', tool: 'Understand Anything #109' },
  { id: 'script', title: 'Script', titleBn: 'স্ক্রিপ্ট', tool: 'Qwen3.8-Flash-Next :1919' },
  { id: 'render', title: 'Render', titleBn: 'রেন্ডার', tool: 'HunyuanVideo 1.5 (Kaggle T4x2)' },
  { id: 'voice', title: 'Voice-over', titleBn: 'ভয়েস', tool: 'Edge-TTS Bangla (free)' },
  { id: 'combine', title: 'Combine', titleBn: 'জোড়া', tool: 'ffmpeg 90s 4K' },
];
