/** @hostamar/node-core — dev costs + templates */
export const DEV_COST = 10
export const ANDROID_COST = 100
export const DEV_RUN_COST = 5
export const DEV_BUILD_COST = 100

export const DEV_TEMPLATES = {
  nextjs: { label: 'Next.js 14', lang: 'typescript', ext: 'tsx' },
  expo: { label: 'Expo Android', lang: 'typescript', ext: 'tsx' },
  python: { label: 'Python FastAPI', lang: 'python', ext: 'py' },
  node: { label: 'Node Express', lang: 'javascript', ext: 'js' },
  rust: { label: 'Rust Tauri', lang: 'rust', ext: 'rs' },
  go: { label: 'Go Gin', lang: 'go', ext: 'go' },
} as const
