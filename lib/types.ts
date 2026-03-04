// Shared types for ClawPort

export interface Agent {
  id: string               // slug, e.g. "vera"
  name: string             // display name, e.g. "VERA"
  title: string            // role title, e.g. "Chief Strategy Officer"
  reportsTo: string | null // parent agent id (null for root orchestrator)
  directReports: string[]  // child agent ids
  soulPath: string | null  // absolute path to SOUL.md
  soul: string | null      // full SOUL.md content
  voiceId: string | null   // ElevenLabs voice ID
  color: string            // hex color for node
  emoji: string            // emoji identifier
  tools: string[]          // list of tools this agent has access to
  crons: CronJob[]         // associated cron jobs
  memoryPath: string | null
  description: string      // one-liner description
}

export interface CronDelivery {
  mode: string
  channel: string
  to: string | null
}

export interface CronRun {
  ts: number
  jobId: string
  status: 'ok' | 'error'
  summary: string | null
  error: string | null
  durationMs: number
  deliveryStatus: string | null
}

export interface CronJob {
  id: string
  name: string
  schedule: string              // raw cron expression
  scheduleDescription: string   // human-readable (e.g., "Daily at 8 AM")
  timezone: string | null       // extracted from schedule object if present
  status: 'ok' | 'error' | 'idle'
  lastRun: string | null
  nextRun: string | null
  lastError: string | null
  agentId: string | null        // which agent this belongs to (matched by name)
  description: string | null
  enabled: boolean
  delivery: CronDelivery | null
  lastDurationMs: number | null
  consecutiveErrors: number
  lastDeliveryStatus: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface MemoryFile {
  label: string
  path: string
  content: string
  lastModified: string
}

// ── Memory Dashboard Types ──────────────────────────────────────

export type MemoryFileCategory = 'evergreen' | 'daily' | 'other'

export interface MemoryFileInfo {
  label: string
  path: string
  relativePath: string
  content: string
  lastModified: string
  sizeBytes: number
  category: MemoryFileCategory
}

export interface MemorySearchConfig {
  enabled: boolean
  provider: string | null
  model: string | null
  hybrid: {
    enabled: boolean
    vectorWeight: number
    textWeight: number
    temporalDecay: { enabled: boolean; halfLifeDays: number }
    mmr: { enabled: boolean; lambda: number }
  }
  cache: { enabled: boolean; maxEntries: number }
  extraPaths: string[]
}

export interface MemoryFlushConfig {
  enabled: boolean
  softThresholdTokens: number
}

export interface MemoryConfig {
  memorySearch: MemorySearchConfig
  memoryFlush: MemoryFlushConfig
  configFound: boolean
}

export interface MemoryStatus {
  indexed: boolean
  lastIndexed: string | null
  totalEntries: number | null
  vectorAvailable: boolean | null
  embeddingProvider: string | null
  raw: string
}

export interface MemoryStats {
  totalFiles: number
  totalSizeBytes: number
  dailyLogCount: number
  evergreenCount: number
  oldestDaily: string | null
  newestDaily: string | null
  dailyTimeline: Array<{ date: string; sizeBytes: number } | null>
}

export interface MemoryApiResponse {
  files: MemoryFileInfo[]
  config: MemoryConfig
  status: MemoryStatus
  stats: MemoryStats
}
