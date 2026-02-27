"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Agent, CronJob } from "@/lib/types";

const ManorMap = dynamic(
  () => import("@/components/ManorMap").then((m) => ({ default: m.ManorMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#f5c518] text-[13px] animate-pulse">
          Scanning the manor...
        </div>
      </div>
    ),
  }
);

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function StatusDot({ status }: { status: CronJob["status"] }) {
  const colors = {
    ok: "bg-[#30d158]",
    error: "bg-[#ff453a] animate-error-pulse",
    idle: "bg-[rgba(235,235,245,0.3)]",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`}
    />
  );
}

export default function ManorPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/crons").then((r) => r.json()),
    ])
      .then(([a, c]) => {
        setAgents(a);
        setCrons(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const agentCrons = selected
    ? crons.filter((c) => c.agentId === selected.id)
    : [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[#ff453a] text-[13px]">
        Error loading manor: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-black">
      {/* Map */}
      <div className="flex-1 h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#f5c518] text-[13px] animate-pulse">
              Scanning the manor...
            </div>
          </div>
        ) : (
          <ManorMap agents={agents} crons={crons} onNodeClick={setSelected} />
        )}
      </div>

      {/* Agent detail panel */}
      {selected ? (
        <div
          className="w-[320px] flex-shrink-0 bg-[#1c1c1e] flex flex-col overflow-y-auto animate-slide-in"
          style={{
            boxShadow: "-2px 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {/* Close button row */}
          <div className="px-5 pt-4 pb-0 flex justify-end">
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[rgba(120,120,128,0.2)] text-[rgba(235,235,245,0.6)] hover:bg-[rgba(120,120,128,0.36)] hover:text-white transition-colors text-[13px]"
            >
              ✕
            </button>
          </div>

          {/* Header */}
          <div className="px-5 pt-1 pb-4">
            <div className="text-[40px] leading-none mb-2">{selected.emoji}</div>
            <h2 className="text-[22px] font-bold tracking-tight text-white leading-tight">
              {selected.name}
            </h2>
            <p className="text-[13px] text-[rgba(235,235,245,0.6)] mt-0.5">
              {selected.title}
            </p>

            {/* Color indicator pill */}
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: `${selected.color}26`,
                color: selected.color,
              }}
            >
              {selected.color}
            </span>
          </div>

          {/* Description */}
          <div className="px-5 pb-4">
            <p className="text-[14px] text-[rgba(235,235,245,0.7)] leading-[1.6]">
              {selected.description}
            </p>
          </div>

          {/* Tools section */}
          <div className="px-5 pb-4">
            <div className="text-[10px] font-semibold tracking-[0.08em] text-[rgba(235,235,245,0.3)] uppercase mt-5 mb-2">
              Tools
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selected.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-[rgba(120,120,128,0.2)] text-[rgba(235,235,245,0.6)] px-2.5 py-1 rounded-full"
                >
                  {TOOL_ICONS[t] && (
                    <span className="text-[10px]">{TOOL_ICONS[t]}</span>
                  )}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Crons section */}
          {agentCrons.length > 0 && (
            <div className="px-5 pb-4">
              <div className="text-[10px] font-semibold tracking-[0.08em] text-[rgba(235,235,245,0.3)] uppercase mt-5 mb-2">
                Crons
              </div>
              <div className="space-y-2.5">
                {agentCrons.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <StatusDot status={c.status} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-mono text-white truncate block">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-[rgba(235,235,245,0.5)]">
                        {c.schedule}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions — pinned to bottom */}
          <div className="mt-auto px-5 py-5 space-y-2">
            <button
              onClick={() => router.push(`/chat/${selected.id}`)}
              className="w-full bg-[#f5c518] text-black font-semibold text-[15px] py-3 rounded-xl hover:bg-[#e8b800] transition-colors"
            >
              Open Chat
            </button>
            <button
              onClick={() => router.push(`/agents/${selected.id}`)}
              className="w-full bg-[rgba(120,120,128,0.16)] text-white text-[15px] py-3 rounded-xl hover:bg-[rgba(120,120,128,0.28)] transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — no agent selected */
        <div
          className="w-[320px] flex-shrink-0 bg-[#1c1c1e] flex items-center justify-center"
          style={{
            boxShadow: "-2px 0 20px rgba(0,0,0,0.5)",
          }}
        >
          <div className="text-center px-6">
            <div className="text-[48px] mb-3">🕵️</div>
            <div className="text-[17px] font-semibold text-white">
              Select an agent
            </div>
            <div className="text-[13px] text-[rgba(235,235,245,0.5)] mt-1">
              Click any node on the map to inspect
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
