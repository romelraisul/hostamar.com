import Link from 'next/link'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'

const posts: Record<string, { title: string; date: string; readTime: string; content: string }> = {
  'ai-video-bangladesh': {
    title: 'AI দিয়ে বাংলা ভিডিও তৈরি: সম্পূর্ণ গাইড',
    date: '2026-05-20',
    readTime: '৫ মিনিট',
    content: `
<p>AI প্রযুক্তি এখন বাংলা ভাষায় ভিডিও তৈরি করা আগের চেয়ে অনেক সহজ করে দিয়েছে। এই গাইডে আমরা দেখব কীভাবে আপনি Hostamar ব্যবহার করে পেশাদার মানের ভিডিও তৈরি করতে পারেন।</p>

<h2>কেন AI ভিডিও?</h2>
<p>ঐতিহ্যবাহী ভিডিও এডিটিং এর জন্য দরকার হয় ব্যয়বহুল সফটওয়্যার, দক্ষ অপারেটর এবং অনেক সময়। AI ভিডিও জেনারেশন এই সব বাধা দূর করে — আপনি শুধু আপনার আইডিয়া দিন, বাকি কাজ AI করে দেয়।</p>

<h2>Hostamar দিয়ে শুরু করুন</h2>
<p>Hostamar-এ ভিডিও তৈরি করা খুবই সহজ:</p>
<ol>
  <li><strong>একটি টপিক দিন</strong> — যেমন "ঈদ শুভেচ্ছা" বা "পণ্য প্রচারণা"</li>
  <li><strong>AI স্ক্রিপ্ট লিখে দেবে</strong> — আপনার জন্য একটি পূর্ণাঙ্গ স্ক্রিপ্ট তৈরি করবে</li>
  <li><strong>প্রিভিউ দেখুন</strong> — রেন্ডার করার আগে দেখে নিন কেমন হবে</li>
  <li><strong>ভিডিও জেনারেট করুন</strong> — AI পূর্ণাঙ্গ ভিডিও তৈরি করবে</li>
</ol>

<h2>বাংলা ভাষায় কেন গুরুত্বপূর্ণ?</h2>
<p>বাংলাদেশে ১৭ কোটির বেশি মানুষ বাংলায় কথা বলে। বাংলা ভাষায় ভিডিও কন্টেন্ট তৈরি করে আপনি বিশাল একটি অডিয়েন্সে পৌঁছাতে পারেন। Hostamar পুরোপুরি বাংলা ভাষা সাপোর্ট করে — UI থেকে শুরু করে ভিডিও কন্টেন্ট সবই বাংলায়।</p>

<h2>টিপস: ভালো ভিডিওর জন্য</h2>
<ul>
  <li>নির্দিষ্ট এবং পরিষ্কার টপিক দিন</li>
  <li>টার্গেট অডিয়েন্স মাথায় রেখে কন্টেন্ট তৈরি করুন</li>
  <li>বাংলা ভাষায় প্রমিত বানান ব্যবহার করুন</li>
  <li>ভিডিওর দৈর্ঘ্য ৩০-৬০ সেকেন্ডের মধ্যে রাখুন</li>
</ul>
    `.trim(),
  },
  'video-marketing-tips': {
    title: 'ছোট ব্যবসার জন্য ভিডিও মার্কেটিং টিপস',
    date: '2026-05-18',
    readTime: '৪ মিনিট',
    content: `
<p>ছোট ব্যবসার জন্য ভিডিও মার্কেটিং এখন আর ঐচ্ছিক নয় — এটি প্রয়োজনীয়। ফেসবুক, ইউটিউব এবং TikTok-এ ভিডিও কন্টেন্টের চাহিদা দিন দিন বাড়ছে।</p>

<h2>কেন ভিডিও মার্কেটিং?</h2>
<p>গবেষণা বলছে, ভিডিও কন্টেন্ট দেখার পর ৮৪% মানুষ একটি প্রোডাক্ট কিনতে আগ্রহী হয়। ভিডিওর মাধ্যমে আপনি আপনার প্রোডাক্ট বা সার্ভিস অনেক ভালোভাবে উপস্থাপন করতে পারেন।</p>

<h2>ফ্রি টুলস দিয়ে শুরু করুন</h2>
<p>Hostamar-এর ফ্রি টায়ার দিয়েই আপনি পেশাদার মানের ভিডিও তৈরি করতে পারেন:</p>
<ul>
  <li><strong>AI স্ক্রিপ্ট জেনারেশন</strong> — আপনার আইডিয়া থেকে অটোমেটিক স্ক্রিপ্ট</li>
  <li><strong>অটো সাবটাইটেল</strong> — বাংলা সাবটাইটেল স্বয়ংক্রিয়ভাবে</li>
  <li><strong>স্মার্ট সার্চ</strong> — আপনার ভিডিও কন্টেন্ট সহজেই খুঁজুন</li>
</ul>

<h2>সোশ্যাল মিডিয়ার জন্য টিপস</h2>
<ul>
  <li>ফেসবুকের জন্য ১৫-৩০ সেকেন্ডের ছোট ভিডিও</li>
  <li>প্রথম ৩ সেকেন্ডে দর্শকের attention ধরুন</li>
  <li>বাংলা সাবটাইটেল ব্যবহার করুন (অনেকে সাউন্ড ছাড়াই দেখে)</li>
  <li>প্রতিটি ভিডিওর শেষে CTA (Call to Action) দিন</li>
</ul>
    `.trim(),
  },
  'bkash-payment-guide': {
    title: 'Hostamar-এ bKash দিয়ে পেমেন্ট করার নিয়ম',
    date: '2026-05-15',
    readTime: '৩ মিনিট',
    content: `
<p>Hostamar-এ ক্রেডিট কিনতে আপনি bKash Personal ব্যবহার করতে পারেন। কোনো ব্যাংক কার্ড বা merchant অ্যাকাউন্টের প্রয়োজন নেই।</p>

<h2>স্টেপ বাই স্টেপ গাইড</h2>

<h3>ধাপ ১: প্যাকেজ সিলেক্ট করুন</h3>
<p>/payment পৃষ্ঠায় গিয়ে আপনার পছন্দের প্যাকেজ নির্বাচন করুন — স্টার্টার (২৯৯৳), গ্রোথ (৬৯৯৳) বা প্রো (১,৯৯৯৳)।</p>

<h3>ধাপ ২: bKash Send Money করুন</h3>
<p>আপনার bKash অ্যাপ থেকে Send Money অপশন সিলেক্ট করুন এবং এই নম্বরে টাকা পাঠান:</p>
<p><strong>০১৮২২৪১৭৪৬৩</strong> (Hostamar bKash Personal অ্যাকাউন্ট)</p>
<p>রেফারেন্স হিসেবে <strong>HOSTAMAR</strong> লিখুন।</p>

<h3>ধাপ ৩: TrxID জমা দিন</h3>
<p>পেমেন্ট করার পর bKash থেকে আপনি একটি TrxID পাবেন (যেমন: A7B8C9D0E1F2G3H4)। এই TrxID পেমেন্ট পৃষ্ঠায় ফর্মে লিখে সাবমিট করুন।</p>

<h3>ধাপ ৪: অপেক্ষা করুন</h3>
<p>আমরা ম্যানুয়ালি TrxID যাচাই করার পর আপনার অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে ক্রেডিট যোগ হবে (সাধারণত ২৪ ঘন্টার মধ্যে)।</p>

<h2>সতর্কতা</h2>
<ul>
  <li>শুধুমাত্র উপরে দেওয়া bKash নম্বরে টাকা পাঠান</li>
  <li>কোনো তৃতীয় পক্ষকে আপনার TrxID শেয়ার করবেন না</li>
  <li>একই TrxID একবারই ব্যবহার করা যাবে</li>
</ul>
    `.trim(),
  },
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts[params.slug]

  if (!post) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">পোস্ট পাওয়া যায়নি</h1>
          <Link href="/blog" className="text-pink-400 hover:underline">ব্লগে ফিরে যান</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 px-4">
      <article className="max-w-2xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> ব্লগে ফিরে যান
        </Link>

        <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> {post.readTime}
          </span>
        </div>

        <div
          className="prose prose-invert prose-pink max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </main>
  )
}
