// Single source of truth for dashboard product routes.
// Used by app/dashboard/layout.tsx, app/dashboard/page.tsx and any nav code.

export const DASHBOARD_ROUTES: Record<string, string> = {
  'ai-video': '/dashboard/videos',
  'cloud-hosting': '/dashboard/hosting',
  'ai-chat': '/dashboard/chat',
  'ai-browser': '/dashboard/browser',
  'dev-ide': '/dashboard/ide',
  game: '/dashboard/game',
}

export function dashboardRoute(slug: string): string {
  return DASHBOARD_ROUTES[slug] ?? `/dashboard/${slug}`
}
