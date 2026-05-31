import { Metadata } from 'next'
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Projects — OSSU Academy | Hostamar',
  description:
    'Hands-on computer science projects in Bengali. Build CRUD apps, data analysis tools, and more. Apply your OSSU curriculum knowledge with real projects.',
  robots: { index: false, follow: false },
}

const projectIdeas = [
  {
    title: "প্রকল্প ব্যবস্থাপক",
    description: "React + Node.js দিয়ে পূর্ণাঙ্গ CRUD অ্যাপ",
    skills: ["React", "Node.js", "PostgreSQL"]
  },
  {
    title: "ডেটা বিশ্লেষণ টুল",
    description: "Machine Learning দিয়ে ডেটা বিশ্লেষণ",
    skills: ["Python", "Pandas", "ML"]
  },
  {
    title: "ব্লকচেইন প্রকল্প",
    description: "সাধারণ ব্লকচেইন বুঝাপড়ানোর প্রকল্প",
    skills: ["Solidity", "Web3", "Ethereum"]
  }
];

export default function ProjectsPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "1200px", margin: "0 auto" }}>
      <Link href="/ossu/curriculum">← কোর্সের তালিকায় ফিরে যান</Link>
      
      <h1 style={{ marginTop: "1rem" }}>🎯 OSSU Capstone Projects</h1>
      <p style={{ color: "#666" }}>আপনার চূড়ান্ত প্রকল্প গুগল কমিউনিটিতে জমা দিন</p>
      
      <div style={{ display: "grid", gap: "1.5rem", marginTop: "2rem" }}>
        {projectIdeas.map((project, idx) => (
          <div key={idx} style={{ 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "1.5rem"
          }}>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div style={{ marginTop: "1rem" }}>
              {project.skills.map(skill => (
                <span key={skill} style={{ 
                  marginRight: "0.5rem", 
                  padding: "0.25rem 0.75rem", 
                  background: "#e0e7ff", 
                  borderRadius: "4px", 
                  fontSize: "0.9rem" 
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <button style={{ 
          padding: "1rem 2rem", 
          background: "#3b82f6", 
          color: "white", 
          border: "none", 
          borderRadius: "8px", 
          fontSize: "1rem",
          cursor: "pointer"
        }}>
          আমার প্রকল্প জমা দিন
        </button>
      </div>
    </div>
  );
}