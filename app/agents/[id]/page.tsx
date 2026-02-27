"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent, CronJob } from "@/lib/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const statusColors: Record<string, string> = {
  ok: "text-[#30d158] bg-[rgba(48,209,88,0.1)]",
  error: "text-[#ff453a] bg-[rgba(255,69,58,0.1)]",
  idle: "text-[rgba(235,235,245,0.5)] bg-[rgba(120,120,128,0.1)]",
};

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function SoulViewer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="bg-black rounded-apple max-h-96 overflow-y-auto flex">
      <div className="flex-shrink-0 border-r border-[rgba(84,84,88,0.3)] px-3 py-4 select-none">
        {lines.map((_, i) => (
          <div key={i} className="font-mono text-[11px] text-[rgba(235,235,245,0.2)] leading-relaxed text-right min-w-[2ch]">
            {i + 1}
          </div>
        ))}
      </div>
      <pre className="font-mono text-[12px] text-[rgba(235,235,245,0.7)] whitespace-pre-wrap leading-relaxed p-4 flex-1">
        {content}
      </pre>
    </div>
  );
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/agents").then((r) => r.json()), fetch("/api/crons").then((r) => r.json())])
      .then(([agents, c]) => {
        setAllAgents(agents);
        setAgent(agents.find((a: Agent) => a.id === id) || null);
        setCrons(c.filter((cr: CronJob) => cr.agentId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full text-[#f5c518] text-[15px] animate-pulse">Loading agent...</div>;
  if (!agent) return <div className="flex items-center justify-center h-full text-[rgba(235,235,245,0.6)] text-[15px]">Agent not found. <Link href="/" className="text-[#0a84ff] ml-1">← Back</Link></div>;

  const parent = agent.reportsTo ? allAgents.find((a) => a.id === agent.reportsTo) : null;
  const children = agent.directReports.map((cid) => allAgents.find((a) => a.id === cid)).filter(Boolean) as Agent[];

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-[#1c1c1e] px-6 py-4 flex items-center justify-between"
        style={{
          borderTop: `3px solid ${agent.color}`,
          boxShadow: "0 1px 0 rgba(84,84,88,0.4)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#0a84ff] hover:opacity-80 text-[15px] transition-opacity">← Map</Link>
          <div className="flex items-center gap-3">
            <span className="text-[28px]">{agent.emoji}</span>
            <div>
              <span className="font-bold text-white text-[20px] tracking-tight">{agent.name}</span>
              <div className="text-[rgba(235,235,245,0.6)] text-[13px]">{agent.title}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/chat/${agent.id}`)}
          className="bg-[#f5c518] text-black font-semibold text-[15px] px-5 py-2.5 rounded-xl hover:bg-[#e8b800] transition-colors"
        >
          Open Chat
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 p-6">
        {/* Left column */}
        <div className="col-span-1 space-y-4">
          {/* About */}
          <div className="relative bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <span
              className="absolute -bottom-2 -right-1 text-[48px] opacity-[0.04] select-none pointer-events-none"
              aria-hidden="true"
            >
              {agent.emoji}
            </span>
            <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-2">About</div>
            <p className="text-[14px] text-[rgba(235,235,245,0.7)] leading-[1.6] relative">{agent.description}</p>
          </div>

          {/* Tools */}
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-2.5">Tools</div>
            <div className="grid grid-cols-2 gap-1.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-[rgba(120,120,128,0.2)] text-[rgba(235,235,245,0.7)] px-2.5 py-1 rounded-full"
                >
                  {TOOL_ICONS[t] && <span className="text-[10px]">{TOOL_ICONS[t]}</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-2">Voice</div>
            {agent.voiceId ? (
              <div>
                <span className="inline-block bg-[rgba(191,90,242,0.1)] text-[#bf5af2] text-[12px] px-2.5 py-0.5 rounded-full border border-[rgba(191,90,242,0.2)] mb-1">ElevenLabs</span>
                <div className="font-mono text-[11px] text-[rgba(235,235,245,0.4)] mt-1 break-all">{agent.voiceId}</div>
              </div>
            ) : (
              <span className="text-[13px] text-[rgba(235,235,245,0.5)]">No voice configured</span>
            )}
          </div>

          {/* Hierarchy */}
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-2">Hierarchy</div>
            {parent && (
              <div className="mb-3">
                <div className="text-[11px] text-[rgba(235,235,245,0.4)] mb-1">Reports to</div>
                <Link href={`/agents/${parent.id}`} className="flex items-center gap-2 text-[14px] text-white hover:text-[#0a84ff] transition-colors">
                  <span>{parent.emoji}</span>
                  <span className="font-medium">{parent.name}</span>
                </Link>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <div className="text-[11px] text-[rgba(235,235,245,0.4)] mb-1">Direct reports ({children.length})</div>
                <div className="space-y-1">
                  {children.map((c) => (
                    <Link key={c.id} href={`/agents/${c.id}`} className="flex items-center gap-2 text-[14px] text-white hover:text-[#0a84ff] transition-colors">
                      <span>{c.emoji}</span>
                      <span className="font-medium">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-4">
          {/* SOUL.md */}
          {agent.soul && (
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-3">SOUL.md</div>
              <SoulViewer content={agent.soul} />
            </div>
          )}

          {/* Crons */}
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] rounded-apple-lg p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-[0.08em] mb-3">
              Associated Crons {crons.length > 0 && `(${crons.length})`}
            </div>
            {crons.length === 0 ? (
              <div className="text-[13px] text-[rgba(235,235,245,0.5)]">No crons associated with this agent</div>
            ) : (
              <div className="rounded-apple overflow-hidden">
                {crons.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center px-4 py-3 ${i < crons.length - 1 ? "border-b border-[rgba(84,84,88,0.3)]" : ""} ${c.status === "error" ? "bg-[rgba(255,69,58,0.06)]" : ""}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "ok" ? "bg-[#30d158]" : c.status === "error" ? "bg-[#ff453a] animate-error-pulse" : "bg-[rgba(235,235,245,0.3)]"}`} />
                    <span className="text-[14px] font-mono text-white ml-3">{c.name}</span>
                    <span className="ml-auto text-[12px] font-mono text-[rgba(235,235,245,0.5)]">{c.schedule}</span>
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-[11px] ${statusColors[c.status]}`}>{c.status}</span>
                    <span className="ml-3 text-[12px] text-[rgba(235,235,245,0.4)]">{timeAgo(c.nextRun)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
