import { NextRequest, NextResponse } from "next/server";

// Quiz questions for OSSU Academy
const quizzes = {
  "prog-fund": [
    {
      question: "প্রোগ্রামিং এর মৌলিক একক একক ডেটা কী নামে পরিচিত?",
      options: ["Variable", "Function", "Loop", "Array"],
      answer: 0,
    },
    {
      question: "if-else স্টেটমেন্ট কোন ধরনের কন্ট্রোল স্ট্রাকচার?",
      options: ["Loop", "Conditional", "Function", "Object"],
      answer: 1,
    },
    {
      question: "Python এর মূল ডেটা টাইপ কোনটি নয়?",
      options: ["int", "float", "string", "decimal"],
      answer: 3,
    },
  ],
  "python1": [
    {
      question: "Python এর কমেন্ট কিভাবে লিখতে হয়?",
      options: ["// comment", "# comment", "/* comment */", "<!-- comment -->"],
      answer: 1,
    },
    {
      question: "Python এর তালিকা (List) কীভাবে ডিক্লেড় করবেন?",
      options: ["list = {}", "list = []", "list = ()", "list = ()"],
      answer: 1,
    },
  ],
  "dsa": [
    {
      question: "Array এর Time Complexity কী?",
      options: ["O(1) access", "O(n) access", "O(log n) access", "O(n²) access"],
      answer: 0,
    },
    {
      question: "Stack এর LIFO কী হ্যাঁ?",
      options: ["Last In First Out", "First In First Out", "Last In Last Out", "First In Last Out"],
      answer: 0,
    },
  ],
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const courseId = searchParams.get("course");

  if (!courseId) {
    return NextResponse.json({ error: "Course ID required" }, { status: 400 });
  }

  // Return quiz for the course
  return NextResponse.json({
    course: courseId,
    quiz: quizzes[courseId as keyof typeof quizzes] || [],
  });
}

export async function POST(req: NextRequest) {
  const { course, answers, userId } = await req.json();

  const quiz = quizzes[course as keyof typeof quizzes];
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  let score = 0;
  quiz.forEach((q, idx) => {
    if (answers[idx] === q.answer) score++;
  });

  return NextResponse.json({
    course,
    score,
    total: quiz.length,
    percentage: Math.round((score / quiz.length) * 100),
    passed: score / quiz.length >= 0.6,
  });
}