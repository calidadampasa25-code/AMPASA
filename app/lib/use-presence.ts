'use client'

import { useEffect } from 'react'
import { createSupabaseBrowserClient } from './supabase-browser'

export function usePresence() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const updateLastSeen = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id)
      } catch (err) {
        // Graceful: auth fetch can fail transiently (network, token refresh, dev mode)
        // Don't spam console in production; debug only
        if (process.env.NODE_ENV === 'development') {
          console.debug('Presence update skipped (expected in dev/StrictMode):', err)
        }
      }
    }

    // Update immediately
    updateLastSeen()

    // Update every 60 seconds while the user is on the page
    const interval = setInterval(updateLastSeen, 60 * 1000)

    // Update when user becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Dev-only: swallow transient Supabase auth "Failed to fetch" errors
    // (common in dev due to StrictMode double-mount + concurrent getUser calls)
    if (process.env.NODE_ENV === 'development') {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason
        if (reason instanceof TypeError && reason.message === 'Failed to fetch') {
          console.debug('Suppressed expected dev auth fetch error:', reason)
          event.preventDefault()
        }
      }
      window.addEventListener('unhandledrejection', handleUnhandledRejection)

      // Suppress the gotrue lock warning (very common in dev with StrictMode/HMR)
      const originalWarn = console.warn.bind(console)
      console.warn = (...args: any[]) => {
        const first = args[0]
        if (typeof first === 'string' && first.includes('Lock "lock:sb-') && first.includes('was not released within 5000ms')) {
          console.debug('Suppressed dev Supabase lock warning (StrictMode/HMR noise)')
          return
        }
        originalWarn(...args)
      }

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        console.warn = originalWarn
      }
    }

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
