export interface VideoTemplate {
  id: string
  name: string
  nameBn: string
  icon: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  fonts: {
    heading: string
    body: string
  }
  textPosition: {
    x: number // percentage 0-100
    y: number // percentage 0-100
    align: 'left' | 'center' | 'right'
  }
  transition: string
  overlayStyle: string
}

const templates: VideoTemplate[] = [
  {
    id: 'pohela-boishakh',
    name: 'Pohela Boishakh',
    nameBn: 'পহেলা বৈশাখ',
    icon: '🌺',
    description: 'Bengali New Year celebration template with traditional red-gold aesthetics',
    colors: {
      primary: '#DC2626',    // red
      secondary: '#FFD700',  // gold
      accent: '#FF8C00',     // dark orange
      background: '#1A0000', // deep maroon
      text: '#FFD700',       // gold text
    },
    fonts: {
      heading: 'Noto Sans Bengali, serif',
      body: 'Inter, sans-serif',
    },
    textPosition: {
      x: 50,
      y: 45,
      align: 'center',
    },
    transition: 'fade',
    overlayStyle: 'gradient-top',
  },
  {
    id: 'wedding',
    name: 'Wedding',
    nameBn: 'বিয়ে',
    icon: '💍',
    description: 'Elegant wedding template with gold and white tones',
    colors: {
      primary: '#FFD700',    // gold
      secondary: '#FFFFFF',  // white
      accent: '#DAA520',     // goldenrod
      background: '#1A1110', // dark warm
      text: '#FFD700',       // gold text
    },
    fonts: {
      heading: 'Noto Sans Bengali, serif',
      body: 'Inter, sans-serif',
    },
    textPosition: {
      x: 50,
      y: 55,
      align: 'center',
    },
    transition: 'slide-up',
    overlayStyle: 'glow-border',
  },
  {
    id: 'business',
    name: 'Business',
    nameBn: 'ব্যবসা',
    icon: '💼',
    description: 'Professional corporate template with deep blue and white',
    colors: {
      primary: '#1E3A5F',    // deep blue
      secondary: '#FFFFFF',  // white
      accent: '#3B82F6',     // blue-500
      background: '#0F172A', // slate-900
      text: '#FFFFFF',       // white text
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
    },
    textPosition: {
      x: 50,
      y: 40,
      align: 'center',
    },
    transition: 'slide-left',
    overlayStyle: 'solid-bottom',
  },
  {
    id: 'educational',
    name: 'Educational',
    nameBn: 'শিক্ষা',
    icon: '📚',
    description: 'Learning-focused template with green and white palette',
    colors: {
      primary: '#16A34A',    // green
      secondary: '#FFFFFF',  // white
      accent: '#22C55E',     // green-500
      background: '#052E16', // deep green
      text: '#FFFFFF',       // white text
    },
    fonts: {
      heading: 'Noto Sans Bengali, serif',
      body: 'Inter, sans-serif',
    },
    textPosition: {
      x: 50,
      y: 30,
      align: 'center',
    },
    transition: 'zoom',
    overlayStyle: 'gradient-bottom',
  },
  {
    id: 'festival',
    name: 'Festival',
    nameBn: 'উৎসব',
    icon: '🎉',
    description: 'Vibrant festival template with red and green Bangladeshi flag colors',
    colors: {
      primary: '#DC2626',    // red
      secondary: '#16A34A',  // green
      accent: '#FFD700',     // gold
      background: '#0A0A0A', // near-black
      text: '#FFFFFF',       // white text
    },
    fonts: {
      heading: 'Noto Sans Bengali, serif',
      body: 'Inter, sans-serif',
    },
    textPosition: {
      x: 50,
      y: 50,
      align: 'center',
    },
    transition: 'fade',
    overlayStyle: 'flag-overlay',
  },
]

export function getTemplateById(id: string): VideoTemplate | undefined {
  return templates.find(t => t.id === id)
}

export function getAllTemplates(): VideoTemplate[] {
  return templates
}

export const transitionOptions = [
  { id: 'fade', label: 'Fade', labelBn: 'ফেইড' },
  { id: 'slide-up', label: 'Slide Up', labelBn: 'উপরের দিকে' },
  { id: 'slide-left', label: 'Slide Left', labelBn: 'বাম দিকে' },
  { id: 'slide-right', label: 'Slide Right', labelBn: 'ডান দিকে' },
  { id: 'zoom', label: 'Zoom', labelBn: 'জুম' },
  { id: 'wipe', label: 'Wipe', labelBn: 'ওয়াইপ' },
] as const

export default templates
