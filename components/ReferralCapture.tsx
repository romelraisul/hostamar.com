'use client'
import { useEffect } from 'react'
export default function ReferralCapture(){
  useEffect(()=>{
    try{
      const p = new URLSearchParams(window.location.search)
      const ref = (p.get('ref')||'').trim().toUpperCase()
      if(ref && /^[A-Z0-9]{6}$/.test(ref)){
        localStorage.setItem('hostamar_ref', ref)
        document.cookie = `affiliate_ref=${ref}; path=/; max-age=${60*60*24*30}; SameSite=Lax`
        // optional: hit track for analytics
        fetch('/api/referral/track', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ref})}).catch(()=>{})
        // remove ?ref from URL without reload for cleanliness (keep for sharing but not endless)
        // keep param for attribution debugging: don't strip
      }
    }catch{}
  },[])
  // also expose helper to read back on signup
  return null
}
