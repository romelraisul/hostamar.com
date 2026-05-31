'use client'

import { useLocale } from '@/lib/locale-context'

const courses: Record<
  string,
  { title: string; description: string; lessons: string[]; youtubeId: string }
> = {
  'prog-fund': {
    title: 'Programming Fundamentals',
    description: 'Python, Java, C - Learn to code from scratch',
    lessons: [
      'Introduction to Programming',
      'Variables & Data Types',
      'Control Structures',
      'Functions',
      'OOP Basics',
    ],
    youtubeId: 'rfscVS0vtbw',
  },
  'core-programming': {
    title: 'Core Programming',
    description: 'C Programming and Rust for systems programming',
    lessons: ['C Basics', 'Pointers', 'Memory Management', 'Rust Introduction', 'Idiomatic Rust'],
    youtubeId: '8hly31xKli0',
  },
  'core-math-calculus': {
    title: 'Calculus',
    description: 'Precalculus, Single/ Multivariable Calculus',
    lessons: ['Precalculus Review', 'Limits', 'Derivatives', 'Integrals', 'Multivariable'],
    youtubeId: '3anF19WvhHg',
  },
}

export default function CoursePageClient({ id }: { id: string }) {
  const { t } = useLocale()

  const course = courses[id]

  if (!course) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>{t('ossu.courseNotFound')}</h1>
        <p>{t('ossu.courseNotFoundDesc')}</p>
        <a href="/ossu/curriculum">{t('ossu.backToCurriculum')}</a>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <a href="/ossu/curriculum" style={{ color: '#3b82f6', textDecoration: 'none' }}>
        {t('ossu.backToCurriculum')}
      </a>

      <h1 style={{ marginTop: '1rem' }}>{course.title}</h1>
      <p style={{ color: '#666' }}>{course.description}</p>

      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <h2>🎥 {t('ossu.courseVideo')}</h2>
          <iframe
            width="100%"
            height="500"
            src={`https://www.youtube.com/embed/${course.youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: '8px' }}
          ></iframe>
        </div>

        <div>
          <h2>📋 {t('ossu.lessons')}</h2>
          <ol>
            {course.lessons.map((lesson, i) => (
              <li key={i} style={{ padding: '0.5rem 0' }}>
                {lesson}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2>🎓 {t('ossu.enrollment')}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {t('ossu.freeEnroll')}
            </button>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {t('ossu.premium')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
