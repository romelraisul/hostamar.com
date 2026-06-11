import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Dashboard page - Server Component
export default async function CRMDashboard() {
  /*
  NOTE: This is a conceptual dashboard page.
  In production, this would be a proper Next.js page at:
  /app/dashboard/page.tsx or /pages/dashboard.tsx

  It fetches from the CRM API routes we just created:
  /api/crm/pipeline     → stats
  /api/crm/leads        → leads list
  /api/crm/outreach     → outreach logs
  /api/crm/campaigns    → campaigns
  /api/crm/followups    → follow-ups
  /api/crm/snapshot     → historical data
  /api/analytics/crm-analytics → charts data
  */

  return null; // Placeholder — actual page lives in the Next.js pages tree
}

// API route for dashboard data (already created at /api/crm/pipeline)
// This file documents the dashboard data contract:

/*
DASHBOARD DATA CONTRACT:

GET /api/crm/pipeline
{
  stats: {
    new: number,
    contacted: number,
    interested: number,
    demoScheduled: number,
    converted: number,
    dead: number,
    totalCustomers: number,
    activeCustomers: number,
    payingCustomers: number,
    churnedCustomers: number,
    totalRevenue: { _sum: { amount: number } },
    monthlyRevenue: { _sum: { amount: number } },
    pendingPayments: number,
    completedPayments: number,
    totalVideos: number,
    processingVideos: number,
    totalOutreach: number,
    outreachToday: number,
    pendingFollowUps: number,
    overdueFollowUps: number,
    contactedToInterested: number, // percentage
    interestedToDemo: number,     // percentage
    demoToConverted: number,      // percentage
    overallConversionRate: number // percentage
  }
}

GET /api/crm/leads?status=&source=&page=&limit=
{
  leads: [...],
  pagination: { page, limit, total, pages }
}

GET /api/crm/outreach?leadId=&channel=
{
  logs: [...],
  pagination: { page, limit, total, pages }
}

GET /api/crm/campaigns?status=
{
  campaigns: [...]
}

GET /api/crm/followups?status=pending
{
  followUps: [...]
}

GET /api/crm/snapshot?days=30
{
  snapshots: [...],
  current: { totalLeads, contacted, interested, converted, paying, totalCustomers, totalRevenue }
}

GET /api/analytics/crm-analytics
{
  leadSources: [...],
  leadByStatus: [...],
  revenueByMethod: [...],
  recentPayments: [...]
}
*/