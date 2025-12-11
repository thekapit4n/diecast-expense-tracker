import { useAuth } from './auth-context'

export function useUserTracking() {
  const { user } = useAuth()

  return {
    userId: user?.id || null,
    getCreateFields: () => ({
      created_by: user?.id || null,
      created_at: Math.floor(Date.now() / 1000),
    }),
    getUpdateFields: () => ({
      updated_by: user?.id || null,
      updated_at: Math.floor(Date.now() / 1000),
    }),
  }
}

