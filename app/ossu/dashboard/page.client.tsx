'use client'

import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

// Mock student data - in production this comes from database
const studentData = {
  name: 'রমেল রাইসুল',
  enrolledCourses: 5,
  completedCourses: 2,
  certificates: 2,
  currentPhase: 'Phase 2: Core CS',
  progress: {
    'Phase 1': 100,
    'Phase 2': 35,
    'Phase 3': 0,
    'Phase 4': 0,
  },
}

export default function DashboardPageClient() {
  const { t } = useLocale()

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <Link href="/ossu">{t('ossu.backToHome')}</Link>

      <h1 style={{ marginTop: '1rem' }}>{t('ossu.dashboardTitle')}</h1>

      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        {/* Progress Overview */}
        <div
          style={{
            background: '#f0f9ff',
            padding: '1.5rem',
            borderRadius: '8px',
          }}
        >
          <h2>{t('ossu.yourProgress')}</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(studentData.progress).map(([phase, pct]) => (
              <div key={phase}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{phase}</span>
                  <span>{pct}%</span>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: '#3b82f6',
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Courses */}
        <div>
          <h2>{t('ossu.enrolledCourses').replace('{count}', String(studentData.enrolledCourses))}</h2>
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            {[
              'Programming Fundamentals',
              'Calculus',
              'Linear Algebra',
              'Algorithms',
              'Databases',
            ].map((course) => (
              <div
                key={course}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                {course}
              </div>
            ))}
          </div>
        </div>

        {/* Certificates */}
        <div>
          <h2>{t('ossu.yourCertificates').replace('{count}', String(studentData.certificates))}</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '1rem',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem' }}>🏆</div>
              <div>Programming Fundamentals</div>
            </div>
            <div
              style={{
                padding: '1rem',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem' }}>🏆</div>
              <div>HTML/CSS Basics</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
