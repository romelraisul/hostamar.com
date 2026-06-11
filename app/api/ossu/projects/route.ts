import { NextRequest, NextResponse } from "next/server";

// Final Project Submission Platform
const projects = [
  {
    id: "project-tracker",
    title: "প্রকল্প ট্র্যাকার",
    description: "React + Node.js দিয়ে পূর্ণাঙ্গ CRUD অ্যাপ",
    skills: ["React", "Node.js", "PostgreSQL"],
    status: "open",
    mentor: "OSSU Team"
  },
  {
    id: "data-analyzer",
    title: "ডেটা অ্যানালাইজার",
    description: "Machine Learning দিয়ে ডেটা বিশ্লেষণ টুল",
    skills: ["Python", "Pandas", "ML"],
    status: "open",
    mentor: "Community"
  }
];

export async function GET() {
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const { title, description, githubUrl, userId } = await req.json();
  
  const project = {
    id: `proj_${Date.now()}`,
    title,
    description,
    githubUrl,
    userId,
    status: "submitted",
    submittedAt: new Date().toISOString()
  };

  return NextResponse.json({ success: true, project });
}