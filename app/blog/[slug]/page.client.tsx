'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function BlogPostClient() {
  const params = useParams();
  const slug = params.slug as string;
  const [content, setContent] = useState('');

  useEffect(() => {
    // TODO: fetch blog post data
    setContent(`Blog post: ${slug}`);
  }, [slug]);

  return <article className="prose max-w-2xl mx-auto py-10">{content}</article>;
}
