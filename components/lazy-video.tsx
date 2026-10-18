'use client';
import { useEffect, useRef, useState } from 'react';

// ponytail: IO-deferred autoplay video — 292KB mp4 was racing the LCP paint
// on Slow 4G; loads only when scrolled into view. Pass through all video props.
export default function LazyVideo(props: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref}>{on ? <video {...props} /> : null}</div>;
}
