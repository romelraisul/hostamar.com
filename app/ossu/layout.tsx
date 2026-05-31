import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OSSU Academy — CS Learning Platform | Hostamar',
  description:
    'Learn Computer Science in Bengali with the OSSU curriculum. Free courses, projects, and certifications in Bangla.',
  alternates: { canonical: 'https://hostamar.com/ossu' },
  openGraph: {
    title: 'OSSU Academy — CS Learning Platform | Hostamar',
    description: 'Learn Computer Science in Bengali with the OSSU curriculum.',
    url: 'https://hostamar.com/ossu',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OSSU Academy — CS Learning Platform | Hostamar',
    description: 'Learn Computer Science in Bengali with OSSU curriculum.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['ossu academy', 'computer science bangla', 'cs education', 'free programming course'],
}

export default function OSSULayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}