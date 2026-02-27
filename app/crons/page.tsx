"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent, CronJob } from "@/lib/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const m = Math.floor(absDiff / 60000);
    const h = Math.floor(absDiff / 3600000);
    const dy = Math.floor(absDiff / 86400000);
    if (m < 60) return `in ${m}m`;
    if (h < 24) return `in ${h}h`;
    return `in ${dy}d`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

type Filter = "all" | "ok" | "error" | "idle";

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  function refresh() {
    Promise.all([
      fetch("/api/crons").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ]).then(([c, a]) => {
      setCrons(c);
      setAgents(a);
      setLastRefresh(new Date());
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const statusOrder: Record<string, number> = { error: 0, idle: 1, ok: 2 };
  const filtered = crons
    .filter((c) => filter === "all" || c.status === filter)
    .sort(
      (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    );
  const counts = {
    all: crons.length,
    ok: crons.filter((c) => c.status === "ok").length,
    error: crons.filter((c) => c.status === "error").length,
    idle: crons.filter((c) => c.status === "idle").length,
  };

  const pills: { key: Filter; label: string; dotColor: string }[] = [
    { key: "all", label: "All", dotColor: "bg-white" },
    { key: "ok", label: "Passing", dotColor: "bg-[#30d158]" },
    { key: "error", label: "Errors", dotColor: "bg-[#ff453a]" },
    { key: "idle", label: "Idle", dotColor: "bg-[rgba(235,235,245,0.3)]" },
  ];

  return (
    <div className="h-full flex flex-col bg-[#000000] overflow-hidden">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-[#1c1c1e] backdrop-blur px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ boxShadow: "0 1px 0 rgba(84,84,88,0.4)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-white">Cron Monitor</h1>
          <span className="bg-[rgba(120,120,128,0.2)] text-[rgba(235,235,245,0.6)] text-[12px] font-mono rounded-full px-2 py-0.5">
            {crons.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[rgba(235,235,245,0.4)]">
            Updated {timeAgo(lastRefresh.toISOString())}
          </span>
          <button
            onClick={refresh}
            className="text-[rgba(235,235,245,0.4)] hover:text-white transition-colors text-[16px]"
          >
            &#8635;
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        {pills.map((pill) => {
          const isActive = filter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-all flex-shrink-0 ${
                isActive
                  ? "ring-1 ring-[#f5c518] bg-[rgba(245,197,24,0.1)]"
                  : "bg-[#2c2c2e] hover:bg-[rgba(120,120,128,0.2)]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${pill.dotColor} ${
                  pill.key === "error" && counts.error > 0
                    ? "animate-error-pulse"
                    : ""
                }`}
              />
              <span className="text-[13px] font-semibold text-white">
                {counts[pill.key]}
              </span>
              <span className="text-[12px] text-[rgba(235,235,245,0.6)]">
                {pill.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cron list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#f5c518] text-sm animate-pulse">
            Loading crons...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[15px] text-[rgba(235,235,245,0.5)]">
            No crons match this filter
          </div>
        ) : (
          <div className="bg-[#1c1c1e] rounded-xl overflow-hidden">
            {filtered.map((cron, idx) => {
              const agent = cron.agentId ? agentMap.get(cron.agentId) : null;
              const isExpanded = expanded === cron.id;
              const isError = cron.status === "error";
              const isLast = idx === filtered.length - 1;

              const dotColor =
                cron.status === "ok"
                  ? "bg-[#30d158]"
                  : cron.status === "error"
                  ? "bg-[#ff453a] animate-error-pulse"
                  : "bg-[rgba(235,235,245,0.3)]";

              return (
                <div key={cron.id}>
                  {/* Row */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : cron.id)}
                    className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                      isError
                        ? "bg-[rgba(255,69,58,0.06)] hover:bg-[rgba(255,69,58,0.1)]"
                        : "hover:bg-[rgba(120,120,128,0.12)]"
                    } ${!isLast && !isExpanded ? "border-b border-[rgba(84,84,88,0.3)]" : ""}`}
                  >
                    {/* Status dot */}
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
                    />

                    {/* Name */}
                    <span className="text-[14px] font-medium text-white ml-3 truncate">
                      {cron.name}
                    </span>

                    {/* Agent link pushed right */}
                    <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                      {agent ? (
                        <Link
                          href={`/agents/${agent.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[12px] text-[#0a84ff] hover:underline transition-colors"
                        >
                          {agent.name}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-[rgba(235,235,245,0.3)]">
                          \u2014
                        </span>
                      )}

                      {/* Schedule */}
                      <span className="text-[12px] font-mono text-[rgba(235,235,245,0.5)]">
                        {cron.schedule}
                      </span>

                      {/* Chevron */}
                      <span
                        className={`text-[14px] text-[rgba(235,235,245,0.3)] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        &#8250;
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className={`${
                        !isLast ? "border-b border-[rgba(84,84,88,0.3)]" : ""
                      }`}
                    >
                      {cron.lastError && (
                        <div className="mx-4 my-3 bg-[rgba(255,69,58,0.06)] border-l-2 border-[#ff453a] px-4 py-3 rounded-r-lg">
                          <pre className="text-[13px] font-mono text-[#ff453a] whitespace-pre-wrap">
                            {cron.lastError}
                          </pre>
                        </div>
                      )}
                      <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-[12px] text-[rgba(235,235,245,0.4)]">
                          Last run: {timeAgo(cron.lastRun)}
                        </span>
                        <span className="text-[12px] text-[rgba(235,235,245,0.4)]">
                          Next run: {timeAgo(cron.nextRun)}
                        </span>
                        <span className="text-[12px] text-[rgba(235,235,245,0.4)] font-mono">
                          ID: {cron.id}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
