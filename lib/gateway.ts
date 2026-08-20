export async function getUserFromGateway(req: Request){
  const c = req.headers.get('x-hostamar-credit') || req.headers.get('x-gateway-credit')
  const tid = req.headers.get('x-tunnel-id') || req.headers.get('x-hostamar-tunnel')
  if (c || tid) return { id: 'guest-0taka', credit: 6000, tunnel: tid || 'hostamar-prod-new' }
  return null
}
