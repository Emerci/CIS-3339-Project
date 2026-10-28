// useApi: tracks the state of one async API call (F2)
//
//   const { data, loading, error, execute } = useApi(() => api.getClients())
//
//   data    - null until the call succeeds, then the result
//   loading - true only while a request is in flight
//   error   - short readable string, or null when nothing is wrong
//   execute - runs the call (on mount or as a Retry); safe to call repeatedly
//
// Error messages come from the single Axios interceptor in api/api.js,
// so nothing here translates errors; it just surfaces error.message.
import { ref } from 'vue'

export function useApi(apiCall) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Only the most recent call may update the state, so a slow earlier
  // request can never overwrite newer results (no stale rows).
  let latestCall = 0

  async function execute(...args) {
    const callId = ++latestCall
    loading.value = true
    error.value = null
    data.value = null
    try {
      const result = await apiCall(...args)
      if (callId === latestCall) data.value = result
      return result
    } catch (err) {
      if (callId === latestCall) {
        error.value = (err && err.message) || 'Something went wrong'
      }
      return null
    } finally {
      if (callId === latestCall) loading.value = false
    }
  }

  return { data, loading, error, execute }
}
