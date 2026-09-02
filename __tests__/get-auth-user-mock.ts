// In-memory getAuthUser stand-in for unit tests (default: AUTHED as u1).
// Tests override per-case with vi.mocked(getAuthUser).mockResolvedValue(...)
// or mockResolvedValue(null) for the unauthenticated path.
import { vi } from 'vitest'

export const getAuthUser = vi.fn(async () => ({ id: 'u1', email: 'test@hostamar.com', name: 'Test User' } as any))

export default getAuthUser
