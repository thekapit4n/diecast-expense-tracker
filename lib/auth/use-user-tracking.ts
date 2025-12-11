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
    // For insert operations, set both create and update fields to the same values
    getInsertFields: () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const userId = user?.id || null
      return {
        created_by: userId,
        created_at: timestamp,
        updated_by: userId,
        updated_at: timestamp,
      }
    },
  }
}

