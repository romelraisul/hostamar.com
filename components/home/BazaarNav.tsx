import Link from 'next/link';

export default function BazaarNav() {
  return (
    <header className="bp-nav">
      <div className="bp-wrap bp-nav-in">
        <Link className="bp-brand" href="/">
          <span className="bp-brand-chip" aria-hidden="true">
            <svg viewBox="0 0 64 64"><polygon points="7,15 19,10 19,54 7,49" fill="#22755E" /><polygon points="57,15 45,10 45,54 57,49" fill="#1E9E3E" /><polygon points="26,19 26,45 45,32" fill="#12C24C" /></svg>
          </span>
          <span className="bp-brand-name">Hostamar</span>
        </Link>
        <nav className="bp-nav-links" aria-label="প্রধান মেনু">
          <a href="#how">কীভাবে কাজ করে</a>
          <a href="#bundle">পণ্যসমূহ</a>
          <Link href="/pricing">প্রাইসিং</Link>
          <a href="#faq">সাধারণ প্রশ্ন</a>
          <Link href="/showcase">শোকেস</Link>
        </nav>
        <Link href="/generate" className="bp-btn bp-btn-primary">ফ্রি শুরু করুন</Link>
      </div>
      <details className="bp-nav-toggle">
        <summary aria-label="মেনু খুলুন বা বন্ধ করুন">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1C1917" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </summary>
        <nav className="bp-nav-mobile" aria-label="মোবাইল মেনু">
          <a href="#how">কীভাবে কাজ করে</a>
          <a href="#bundle">পণ্যসমূহ</a>
          <Link href="/pricing">প্রাইসিং</Link>
          <a href="#faq">সাধারণ প্রশ্ন</a>
          <Link href="/showcase">শোকেস</Link>
          <Link href="/generate" className="bp-btn bp-btn-primary">ফ্রি শুরু করুন</Link>
        </nav>
      </details>
    </header>
  );
}
