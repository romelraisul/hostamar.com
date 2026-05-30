import Link from "next/link";

const phases = [
  {
    id: "intro",
    title: "Phase 1: Introduction to CS",
    courses: [
      { id: "intro-python", title: "Programming (Python)", duration: "14 weeks" },
      { id: "intro-programming", title: "Programming Fundamentals", duration: "8 weeks" },
    ]
  },
  {
    id: "core",
    title: "Phase 2: Core CS",
    courses: [
      { id: "core-programming", title: "Core Programming", duration: "12 weeks" },
      { id: "core-math-calculus", title: "Calculus", duration: "16 weeks" },
      { id: "core-math-discrete", title: "Discrete Math", duration: "12 weeks" },
      { id: "core-math-linear", title: "Linear Algebra", duration: "10 weeks" },
      { id: "core-tools", title: "CS Tools", duration: "6 weeks" },
      { id: "core-systems", title: "Computer Systems", duration: "12 weeks" },
      { id: "core-os", title: "Operating Systems", duration: "12 weeks" },
      { id: "core-networking", title: "Networking", duration: "10 weeks" },
      { id: "core-theory", title: "Algorithms", duration: "12 weeks" },
      { id: "core-security", title: "Security", duration: "12 weeks" },
      { id: "core-databases", title: "Databases", duration: "8 weeks" },
      { id: "core-ml", title: "Machine Learning", duration: "12 weeks" },
    ]
  },
  {
    id: "advanced",
    title: "Phase 3: Advanced CS",
    courses: [
      { id: "advanced-parallel", title: "Parallel Programming", duration: "8 weeks" },
      { id: "advanced-compilers", title: "Compilers", duration: "12 weeks" },
      { id: "advanced-security", title: "Advanced Security", duration: "10 weeks" },
    ]
  }
];

export default function CurriculumPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>📚 OSSU Computer Science - 2 Year Curriculum</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>MIT/Harvard level CS degree in Bengali</p>
      
      {phases.map((phase) => (
        <div key={phase.id} style={{ marginBottom: "3rem" }}>
          <h2 style={{ borderBottom: "2px solid #3b82f6", paddingBottom: "0.5rem" }}>{phase.title}</h2>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            {phase.courses.map((course) => (
              <div key={course.id} style={{ 
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>{course.title}</span>
                <span style={{ color: "#666", fontSize: "0.9rem" }}>{course.duration}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: "3rem", padding: "2rem", background: "#f0f9ff", borderRadius: "8px" }}>
        <h2>🎯 Final Project</h2>
        <p>Build and showcase your capstone project. Reviewed by global OSSU community.</p>
        <Link href="/ossu/projects" style={{ 
          display: "inline-block", 
          marginTop: "1rem", 
          padding: "0.75rem 1.5rem", 
          background: "#3b82f6", 
          color: "white", 
          borderRadius: "4px", 
          textDecoration: "none" 
        }}>
          View Project Ideas
        </Link>
      </div>
    </div>
  );
}