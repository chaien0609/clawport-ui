import { getMemoryFiles, getMemoryConfig, getMemoryStatus, computeMemoryStats } from '@/lib/memory'
import { apiErrorResponse } from '@/lib/api-error'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const files = await getMemoryFiles()
    const config = getMemoryConfig()
    const status = getMemoryStatus()
    const stats = computeMemoryStats(files)
    return NextResponse.json({ files, config, status, stats })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load memory files')
  }
}
