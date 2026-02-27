"use client";
import { Handle, Position } from "@xyflow/react";
import type { Agent } from "@/lib/types";

interface AgentNodeProps {
  data: Agent & Record<string, unknown>;
}

export function AgentNode({ data }: AgentNodeProps) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
      <div
        className="relative w-[160px] rounded-[16px] px-3 py-2.5 cursor-pointer select-none transition-all duration-150"
        style={{
          background: "#1c1c1e",
          border: "1px solid rgba(84,84,88,0.4)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(84,84,88,0.65)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)";
          e.currentTarget.style.borderColor = "rgba(84,84,88,0.4)";
        }}
      >
        {/* Colored dot — top right corner */}
        <span
          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: data.color }}
        />

        {/* Top row: emoji + name */}
        <div className="flex items-center gap-1.5 mb-0.5 pr-4">
          <span className="text-[16px] leading-none">{data.emoji}</span>
          <span className="font-semibold text-[13px] tracking-[-0.2px] text-white truncate">
            {data.name}
          </span>
        </div>

        {/* Bottom row: title */}
        <div className="text-[11px] leading-tight truncate text-[rgba(235,235,245,0.5)]">
          {data.title}
        </div>

        {/* Cron pill */}
        {data.crons && data.crons.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] bg-[rgba(120,120,128,0.2)] text-[rgba(235,235,245,0.5)] px-1.5 py-0.5 rounded-full">
              {data.crons.length} cron{data.crons.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
    </>
  );
}

export const nodeTypes = { agentNode: AgentNode };
