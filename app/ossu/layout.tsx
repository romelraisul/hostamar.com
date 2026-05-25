export const metadata = {
  title: "OSSU Academy - Learn CS in Bengali",
  description: "Learn Computer Science courses in Bengali with OSSU curriculum",
};

export default function OSSULayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}