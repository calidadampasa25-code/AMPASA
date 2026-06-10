import Link from 'next/link'
import { requireApprovedUser } from '@/app/lib/supabase-server'
import { PresenceTracker } from '@/app/components/PresenceTracker'
import DriveBrowser from '@/app/components/DriveBrowser'

export default async function Planta1Page() {
  await requireApprovedUser()

  const DRIVE_FOLDER_ID = '11QDUwYFkgjHY5GyiyO9BXz7TC2QK7vDb'

  return (
    <>
      <PresenceTracker />
      {/* Full Supabase-style project workspace - no centered frame, full viewport dark */}
      <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] flex flex-col">
        <div className="h-12 border-b border-[#2e2e2e] bg-[#0f0f0f] flex items-center px-4 gap-3 text-sm">
          <Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#f1f1f1] flex items-center gap-1.5">← Dashboard</Link>
          <span className="text-[#2e2e2e]">/</span>
          <span className="font-semibold">PLANTA 1</span>
          <span className="ml-auto text-xs text-[#a1a1aa]">Google Drive • AMPASA Calidad</span>
        </div>

        <DriveBrowser folderId={DRIVE_FOLDER_ID} />
      </div>
    </>
  )
}