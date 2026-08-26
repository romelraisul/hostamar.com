export function GET() {
  const body = [
    'Contact: mailto:security@hostamar.com',
    'Expires: 2027-08-26T00:00:00.000Z',
    'Acknowledgments: https://hostamar.com/security',
    'Preferred-Languages: en',
    'Canonical: https://hostamar.com/.well-known/security.txt',
  ].join('\n')
  return new Response(body + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  })
}
