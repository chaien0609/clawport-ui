"use client"

import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  ConnectionLineType,
} from "@xyflow/react"
import { useEffect, useMemo } from "react"
import type { Agent, CronJob } from "@/lib/types"
import type { Pipeline } from "@/lib/cron-pipelines"
import { getAllPipelineJobNames } from "@/lib/cron-pipelines"
import { formatDuration } from "@/lib/cron-utils"

interface PipelineGraphProps {
  crons: CronJob[]
  agents: Agent[]
  pipelines: Pipeline[]
}

/* ─── Custom node ─────────────────────────────────────────────── */

function CronPipelineNode({ data }: NodeProps) {
  const d = data as { name: string; schedule: string; status: string; deliveryTo: string | null; color: string } & Record<string, unknown>
  const statusColor = d.status === "ok" ? "#22c55e" : d.status === "error" ? "#ef4444" : "#a1a1aa"
  const hasDelivery = d.deliveryTo !== null

  return (
    <div
      style={{
        background: "var(--material-regular)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRadius: "var(--radius-md, 10px)",
        border: "1px solid var(--separator)",
        borderLeft: `3px solid ${d.color}`,
        padding: "10px 14px",
        minWidth: 180,
        maxWidth: 220,
        boxShadow: "var(--shadow-card, 0 2px 8px rgba(0,0,0,0.15))",
      }}
    >
      {/* Name + status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {d.name}
        </div>
      </div>

      {/* Schedule */}
      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>{d.schedule}</div>

      {/* Delivery badge */}
      {hasDelivery && (
        <div
          style={{
            display: "inline-block",
            fontSize: 9,
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--accent, #6366f1)",
            color: "#fff",
            opacity: 0.8,
            marginTop: 2,
          }}
        >
          delivered
        </div>
      )}

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

const pipelineNodeTypes = { cronPipelineNode: CronPipelineNode }

/* ─── Layout builder ──────────────────────────────────────────── */

function buildPipelineLayout(
  crons: CronJob[],
  pipelines: Pipeline[],
  agentColorMap: Map<string, string>,
): { nodes: Node[]; edges: Edge[] } {
  const cronMap = new Map(crons.map(c => [c.name, c]))
  const nodes: Node[] = []
  const edges: Edge[] = []

  let groupY = 0

  for (const pipeline of pipelines) {
    // Group label node
    nodes.push({
      id: `label-${pipeline.name}`,
      type: "default",
      data: { label: pipeline.name },
      position: { x: 0, y: groupY },
      selectable: false,
      draggable: false,
      style: {
        background: "transparent",
        border: "none",
        fontSize: 13,
        fontWeight: 700,
        color: "var(--text-secondary)",
        padding: 0,
        width: 200,
      },
    })

    groupY += 36

    // Determine node positions using topological ordering
    const jobNames: string[] = []
    for (const edge of pipeline.edges) {
      if (!jobNames.includes(edge.from)) jobNames.push(edge.from)
      if (!jobNames.includes(edge.to)) jobNames.push(edge.to)
    }

    // Assign columns by dependency depth
    const depth = new Map<string, number>()
    for (const name of jobNames) depth.set(name, 0)
    for (let pass = 0; pass < jobNames.length; pass++) {
      for (const edge of pipeline.edges) {
        const fromD = depth.get(edge.from) || 0
        const toD = depth.get(edge.to) || 0
        if (fromD + 1 > toD) depth.set(edge.to, fromD + 1)
      }
    }

    // Group by depth for vertical stacking
    const byDepth = new Map<number, string[]>()
    for (const [name, d] of depth) {
      const arr = byDepth.get(d) || []
      arr.push(name)
      byDepth.set(d, arr)
    }

    const maxDepth = Math.max(...Array.from(byDepth.keys()), 0)
    const colSpacing = 280
    const rowSpacing = 80

    for (let d = 0; d <= maxDepth; d++) {
      const namesAtDepth = byDepth.get(d) || []
      namesAtDepth.forEach((name, i) => {
        const cron = cronMap.get(name)
        const nodeId = `${pipeline.name}::${name}`

        nodes.push({
          id: nodeId,
          type: "cronPipelineNode",
          data: {
            name,
            schedule: cron?.scheduleDescription || "—",
            status: cron?.status || "idle",
            deliveryTo: cron?.delivery?.to || null,
            color: agentColorMap.get(cron?.agentId || "") || "var(--text-secondary)",
          } as Record<string, unknown>,
          position: { x: d * colSpacing + 20, y: groupY + i * rowSpacing },
        })
      })
    }

    // Edges
    for (const pEdge of pipeline.edges) {
      const sourceId = `${pipeline.name}::${pEdge.from}`
      const targetId = `${pipeline.name}::${pEdge.to}`
      const sourceCron = cronMap.get(pEdge.from)
      const isErrored = sourceCron?.status === "error"

      edges.push({
        id: `${sourceId}→${targetId}`,
        source: sourceId,
        target: targetId,
        type: "smoothstep",
        label: pEdge.artifact,
        labelStyle: { fontSize: 9, fill: "var(--text-muted)" },
        style: {
          stroke: isErrored ? "#ef4444" : "var(--accent, #6366f1)",
          strokeWidth: 1.5,
          strokeDasharray: isErrored ? "6 4" : undefined,
          opacity: isErrored ? 0.7 : 1,
        },
        animated: !isErrored,
      })
    }

    // Advance Y for next group
    const maxNodesPerCol = Math.max(
      ...Array.from(byDepth.values()).map(arr => arr.length),
      1
    )
    groupY += maxNodesPerCol * rowSpacing + 40
  }

  return { nodes, edges }
}

/* ─── Empty state ────────────────────────────────────────────── */

function PipelinesEmptyState() {
  return (
    <div
      style={{
        background: "var(--material-regular)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md, 10px)",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        No pipelines configured
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
        Pipelines visualize file I/O dependencies between cron jobs.
        To define pipelines, create a JSON file at:
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          color: "var(--accent, #6366f1)",
          background: "var(--code-bg, rgba(0,0,0,0.1))",
          border: "1px solid var(--code-border, var(--separator))",
          borderRadius: 6,
          padding: "8px 16px",
          margin: "12px auto",
          display: "inline-block",
        }}
      >
        $WORKSPACE_PATH/clawport/pipelines.json
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12, maxWidth: 480, margin: "12px auto 0" }}>
        Example format:
      </div>
      <pre
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          color: "var(--text-secondary)",
          background: "var(--code-bg, rgba(0,0,0,0.1))",
          border: "1px solid var(--code-border, var(--separator))",
          borderRadius: 6,
          padding: "12px 16px",
          margin: "8px auto 0",
          maxWidth: 420,
          textAlign: "left",
          whiteSpace: "pre",
          overflow: "auto",
        }}
      >{`[
  {
    "name": "Daily Report",
    "edges": [
      { "from": "data-collector", "to": "report-builder", "artifact": "raw-data.json" }
    ]
  }
]`}</pre>
    </div>
  )
}

/* ─── Crons card grid ────────────────────────────────────────── */

function CronsCardGrid({
  crons,
  agentColorMap,
  label,
}: {
  crons: CronJob[]
  agentColorMap: Map<string, string>
  label: string
}) {
  if (crons.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-secondary)",
          marginBottom: 12,
        }}
      >
        {label} ({crons.length})
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {crons.map(cron => {
          const statusColor = cron.status === "ok" ? "#22c55e" : cron.status === "error" ? "#ef4444" : "#a1a1aa"
          const color = agentColorMap.get(cron.agentId || "") || "var(--text-secondary)"

          return (
            <div
              key={cron.id}
              style={{
                background: "var(--material-regular)",
                borderRadius: "var(--radius-md, 10px)",
                border: "1px solid var(--separator)",
                borderLeft: `3px solid ${color}`,
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cron.name}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {cron.scheduleDescription || "—"}
              </div>
              {cron.lastDurationMs != null && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatDuration(cron.lastDurationMs)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────────── */

export function PipelineGraph({ crons, agents, pipelines }: PipelineGraphProps) {
  const agentColorMap = useMemo(
    () => new Map(agents.map(a => [a.id, a.color])),
    [agents],
  )

  const hasPipelines = pipelines.length > 0
  const pipelineJobNames = useMemo(() => getAllPipelineJobNames(pipelines), [pipelines])
  const standaloneCrons = useMemo(
    () => crons.filter(c => !pipelineJobNames.has(c.name)),
    [crons, pipelineJobNames],
  )

  const layout = useMemo(
    () => hasPipelines ? buildPipelineLayout(crons, pipelines, agentColorMap) : { nodes: [], edges: [] },
    [crons, pipelines, agentColorMap, hasPipelines],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges)

  useEffect(() => {
    if (hasPipelines) {
      const { nodes: n, edges: e } = buildPipelineLayout(crons, pipelines, agentColorMap)
      setNodes(n)
      setEdges(e)
    } else {
      setNodes([])
      setEdges([])
    }
  }, [crons, pipelines, agentColorMap, hasPipelines, setNodes, setEdges])

  if (!hasPipelines) {
    return (
      <div>
        <PipelinesEmptyState />
        <CronsCardGrid crons={crons} agentColorMap={agentColorMap} label="All Crons" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ height: 500, border: "1px solid var(--separator)", borderRadius: "var(--radius-md, 10px)", overflow: "hidden" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={pipelineNodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls position="bottom-left" style={{ left: 8, bottom: 8 }} />
        </ReactFlow>
      </div>
      <CronsCardGrid crons={standaloneCrons} agentColorMap={agentColorMap} label="Standalone Crons" />
    </div>
  )
}
