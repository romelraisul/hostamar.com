import Link from 'next/link';

export default function BazaarFooter() {
  return (
    <footer className="bp-foot">
      <div className="bp-wrap">
        <div className="bp-foot-grid">
          <div className="bp-foot-brand">
            <Link className="bp-brand" href="/">
              <span className="bp-brand-chip" aria-hidden="true">
                <svg viewBox="0 0 64 64"><polygon points="7,15 19,10 19,54 7,49" fill="#22755E" /><polygon points="57,15 45,10 45,54 57,49" fill="#1E9E3E" /><polygon points="26,19 26,45 45,32" fill="#12C24C" /></svg>
              </span>
              <span className="bp-brand-name">Hostamar</span>
            </Link>
            <p>বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং, এক সাবস্ক্রিপশনে</p>
          </div>
          <div>
            <h4>প্রোডাক্ট</h4>
            <ul>
              <li><Link href="/generate">ভিডিও বানান</Link></li>
              <li><Link href="/showcase">টেমপ্লেট</Link></li>
              <li><Link href="/pricing">প্রাইসিং</Link></li>
            </ul>
          </div>
          <div>
            <h4>কোম্পানি</h4>
            <ul>
              <li><Link href="/about">সম্পর্কে</Link></li>
              <li><Link href="/blog">ব্লগ</Link></li>
              <li><Link href="/contact">যোগাযোগ</Link></li>
            </ul>
          </div>
          <div>
            <h4>সাপোর্ট</h4>
            <ul>
              <li><Link href="/support">সাপোর্ট</Link></li>
              <li><Link href="/privacy">প্রাইভেসি</Link></li>
              <li><Link href="/terms">শর্তাবলী</Link></li>
              <li><Link href="/refund">রিফান্ড</Link></li>
            </ul>
          </div>
        </div>
        <div className="bp-foot-bottom">
          <span className="bp-made-in"><span className="bp-dot" aria-hidden="true" />বাংলাদেশে তৈরি</span>
          <span>© 2026 Hostamar</span>
        </div>
      </div>
    </footer>
  );
}
