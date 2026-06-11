import Link from 'next/link'
import { requireApprovedUser } from '@/app/lib/supabase-server'
import { PresenceTracker } from '@/app/components/PresenceTracker'

export default async function Planta2Page() {
  await requireApprovedUser()
  return (
    <>
      <PresenceTracker />
      <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8 text-sm">
            <Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#f1f1f1]">← Volver</Link>
            <span className="text-[#2e2e2e]">/</span>
            <h1 className="text-3xl font-semibold text-white">PLANTA 2</h1>
          </div>

          <DriveBrowser folderId="1Wfa2v3_NGiYyzXLi0ZYtPCc_9f_Cccod" />
        </div>
      </div>
    </>
  )
}