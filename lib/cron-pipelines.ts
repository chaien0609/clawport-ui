/**
 * Dynamic pipeline loader — reads pipeline definitions from
 * $WORKSPACE_PATH/clawport/pipelines.json when available.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface PipelineEdge {
  from: string
  to: string
  artifact: string
}

export interface Pipeline {
  name: string
  edges: PipelineEdge[]
}

/** Load pipelines from workspace config. Returns [] if not configured. */
export function loadPipelines(): Pipeline[] {
  const workspacePath = process.env.WORKSPACE_PATH
  if (!workspacePath) return []

  const pipelinesPath = join(workspacePath, 'clawport', 'pipelines.json')
  if (!existsSync(pipelinesPath)) return []

  try {
    const raw = readFileSync(pipelinesPath, 'utf-8')
    return JSON.parse(raw) as Pipeline[]
  } catch {
    return []
  }
}

/** Get all pipelines that include a specific job name. */
export function getPipelinesForJob(name: string, pipelines: Pipeline[]): Pipeline[] {
  return pipelines.filter(p =>
    p.edges.some(e => e.from === name || e.to === name)
  )
}

/** Get the set of all job names that appear in any pipeline. */
export function getAllPipelineJobNames(pipelines: Pipeline[]): Set<string> {
  const names = new Set<string>()
  for (const p of pipelines) {
    for (const e of p.edges) {
      names.add(e.from)
      names.add(e.to)
    }
  }
  return names
}
