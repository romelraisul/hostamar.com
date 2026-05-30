#!/usr/bin/env python3
"""HOSTAMAR REFERRAL SYSTEM - Built-in viral growth engine"""
import os, json, hashlib
from datetime import datetime

BASE = "/mnt/c/Users/romel/hostamar-local"
REFERRAL_FILE = f"{BASE}/data/referrals.json"
os.makedirs(f"{BASE}/data", exist_ok=True)

def generate_referral_code(email):
    return "HMR-" + hashlib.md5(email.encode()).hexdigest()[:6].upper()

def track_referral(referrer_code, new_user_email, new_user_name):
    referrals = load_referrals()
    referrals.append({
        "referrer_code": referrer_code,
        "referred_email": new_user_email,
        "referred_name": new_user_name,
        "date": datetime.now().isoformat(),
        "status": "pending"  # pending → completed → rewarded
    })
    save_referrals(referrals)
    
    # Check if 3 referrals reached
    count = sum(1 for r in referrals if r['referrer_code'] == referrer_code and r['status'] == 'completed')
    if count >= 3:
        return {"reward": True, "message": f"{referrer_code} has 3 completed referrals! Award 1 month FREE."}
    return {"reward": False, "count": count}

def load_referrals():
    if os.path.exists(REFERRAL_FILE):
        with open(REFERRAL_FILE, 'r') as f:
            return json.load(f)
    return []

def save_referrals(referrals):
    with open(REFERRAL_FILE, 'w') as f:
        json.dump(referrals, f, indent=2, ensure_ascii=False)

def get_referral_stats():
    referrals = load_referrals()
    total = len(referrals)
    completed = sum(1 for r in referrals if r['status'] == 'completed')
    pending = sum(1 for r in referrals if r['status'] == 'pending')
    rewarded = sum(1 for r in referrals if r.get('rewarded'))
    
    return {
        "total_referrals": total,
        "completed": completed,
        "pending": pending,
        "rewarded_users": rewarded,
        "conversion_rate": f"{(completed/total*100):.1f}%" if total > 0 else "0%"
    }

# === NEXT.JS API ROUTE CODE (save to app/api/referral/route.ts) ===
NEXTJS_ROUTE = """
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { code, email, name } = await request.json();
  
  // Track referral
  const result = trackReferral(code, email, name);
  
  return NextResponse.json({
    success: true,
    reward: result.reward,
    message: result.message || `You have ${result.count}/3 referrals`
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  
  const stats = getReferralStatsByCode(code);
  return NextResponse.json(stats);
}
"""

# === DATABASE SCHEMA (Prisma) ===
PRISMA_SCHEMA = """
model Referral {
  id          String   @id @default(uuid())
  referrerId  String
  referredId  String   @unique
  referredEmail String
  referredName String
  code        String   // referral code
  status      ReferralStatus @default(PENDING)
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  referrer User @relation("UserReferrals", fields: [referrerId], references: [id])
}

enum ReferralStatus {
  PENDING
  COMPLETED
  REWARDED
}

// Add to User model:
// referrals Referral[] @relation("UserReferrals")
// referralCode String @unique
"""

# === Frontend Component (React) ===
REFERRAL_WIDGET = """
// components/ReferralWidget.tsx
'use client';
import { useState } from 'react';

export default function ReferralWidget({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://hostamar.com/signup?ref=${code}`;
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
      <h3 className="text-xl font-bold mb-2">🎯 Refer Friends, Earn Free Months!</h3>
      <p className="mb-4">Share your link — every 3 referrals = 1 FREE month</p>
      
      <div className="flex gap-2">
        <input 
          value={referralLink} 
          readOnly 
          className="flex-1 p-2 rounded text-black text-sm"
        />
        <button 
          onClick={() => {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="bg-yellow-400 text-black px-4 py-2 rounded font-bold hover:bg-yellow-300"
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>
      
      <p className="mt-3 text-sm opacity-80">
        Your code: <span className="font-bold">{code}</span>
      </p>
    </div>
  );
}
"""

# Save all files
with open(f"{BASE}/app/api/referral/route.ts", 'w') as f:
    f.write(NEXTJS_ROUTE)

with open(f"{BASE}/prisma/referral-schema.prisma", 'w') as f:
    f.write(PRISMA_SCHEMA)

with open(f"{BASE}/components/ReferralWidget.tsx", 'w') as f:
    f.write(REFERRAL_WIDGET)

print("✅ Referral System built:")
print("   app/api/referral/route.ts     → Next.js API route")
print("   prisma/referral-schema.prisma → Database schema")
print("   components/ReferralWidget.tsx → React widget")
print("\nSystem ready — 3 referrals = 1 free month incentive")