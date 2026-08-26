import catalog from '@/lib/services-catalog.json'
export type Service = typeof catalog[number]
export function getAllServices(): Service[] { return catalog as Service[] }
export function getService(id: string) { return catalog.find(s => s.id === id) as Service | undefined }
export const CATEGORIES = [
  { key: 'all', labelBn: 'সব সার্ভিস ৫০', count: 50 },
  { key: 'Social Media', labelBn: 'সোশ্যাল মিডিয়া টেমপ্লেট ৭', count: 7 },
  { key: 'Business', labelBn: 'বিজনেস ও মার্কেটিং ৭', count: 7 },
  { key: 'Content Creator', labelBn: 'কন্টেন্ট ক্রিয়েটর টুলস ৮', count: 8 },
  { key: 'Event', labelBn: 'ইভেন্ট ও সেলিব্রেশন ৮', count: 8 },
  { key: 'Organization', labelBn: 'ব্যক্তিগত সংগঠন ৬', count: 6 },
  { key: 'Professional', labelBn: 'প্রফেশনাল ডকুমেন্টস ৪', count: 4 },
  { key: 'E-commerce', labelBn: 'ই-কমার্স ও সেলস ৪', count: 4 },
]
export const STRIP_COLOR: Record<string,string> = {
  'Social Media': 'bg-[#5c2d2d]',
  'Business': 'bg-[#1e3a4a]',
  'Content Creator': 'bg-[#0E7C3A]',
  'Event': 'bg-[#7c3aed]',
  'Organization': 'bg-[#0e7490]',
  'Professional': 'bg-[#1f2937]',
  'E-commerce': 'bg-[#ea580c]',
}
