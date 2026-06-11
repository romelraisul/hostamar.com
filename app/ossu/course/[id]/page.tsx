export default function CoursePage({ params }: { params: { id: string } }) {
  const courses: Record<string, { title: string; description: string; lessons: string[]; youtubeId: string }> = {
    "prog-fund": {
      title: "Programming Fundamentals",
      description: "Python, Java, C - Learn to code from scratch",
      lessons: ["Introduction to Programming", "Variables & Data Types", "Control Structures", "Functions", "OOP Basics"],
      youtubeId: "rfscVS0vtbw"
    },
    "core-programming": {
      title: "Core Programming",
      description: "C Programming and Rust for systems programming",
      lessons: ["C Basics", "Pointers", "Memory Management", "Rust Introduction", "Idiomatic Rust"],
      youtubeId: "8hly31xKli0"
    },
    "core-math-calculus": {
      title: "Calculus",
      description: "Precalculus, Single/ Multivariable Calculus",
      lessons: ["Precalculus Review", "Limits", "Derivatives", "Integrals", "Multivariable"],
      youtubeId: "3anF19WvhHg"
    }
  };

  const course = courses[params.id];

  if (!course) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>কোর্স পাওয়া যায়নি</h1>
        <p>এই কোর্সটি এখনও আপলোড করা হয়নি। শীঘ্রই আসছে!</p>
        <a href="/ossu/curriculum">← কোর্সের তালিকায় ফিরে যান</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "1200px", margin: "0 auto" }}>
      <a href="/ossu/curriculum" style={{ color: "#3b82f6", textDecoration: "none" }}>← কোর্সের তালিকায় ফিরে যান</a>
      
      <h1 style={{ marginTop: "1rem" }}>{course.title}</h1>
      <p style={{ color: "#666" }}>{course.description}</p>

      <div style={{ display: "grid", gap: "2rem", marginTop: "2rem" }}>
        <div>
          <h2>🎥 কোর্স ভিডিও</h2>
          <iframe
            width="100%"
            height="500"
            src={`https://www.youtube.com/embed/${course.youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: "8px" }}
          ></iframe>
        </div>

        <div>
          <h2>📋 লেসনস</h2>
          <ol>
            {course.lessons.map((lesson, i) => (
              <li key={i} style={{ padding: "0.5rem 0" }}>{lesson}</li>
            ))}
          </ol>
        </div>

        <div>
          <h2>🎓 এনরোলমেন্ট</h2>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button style={{ 
              padding: "0.75rem 1.5rem", 
              background: "#10b981", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer"
            }}>
              ফ্রি এনরোল করুন
            </button>
            <button style={{ 
              padding: "0.75rem 1.5rem", 
              background: "#3b82f6", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer"
            }}>
              প্রিমিয়াম - ৳২০০০/মাস
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}