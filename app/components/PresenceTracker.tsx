'use client'

import { usePresence } from '@/app/lib/use-presence'

export function PresenceTracker() {
  usePresence()
  return null
}
