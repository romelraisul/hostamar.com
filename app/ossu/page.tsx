import Link from "next/link";

export const metadata = {
  title: "OSSU Academy - Learn CS in Bangla",
  description: "Learn Computer Science in Bengali with OSSU curriculum",
};

export default function OSSUPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>🎓 OSSU Academy</h1>
      <p>Learn Computer Science in Bengali</p>
      <div style={{ marginTop: "2rem" }}>
        <Link href="/ossu/curriculum" style={{ marginRight: "1rem" }}>
          View Curriculum
        </Link>
        <a href="https://ossu-academy-j61dxn3ht-romelraisul-8939s-projects.vercel.app" target="_blank">
          Full OSSU Academy ↗
        </a>
      </div>
    </div>
  );
}