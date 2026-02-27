"use client";
import { useEffect, useState } from "react";
import type { MemoryFile } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /^#### (.+)$/gm,
      '<h4 class="text-[14px] font-semibold" style="color:rgba(235,235,245,0.8);margin-top:1rem;margin-bottom:0.25rem">$1</h4>'
    )
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-[15px] font-semibold" style="color:rgba(235,235,245,0.9);margin-top:1.25rem;margin-bottom:0.375rem">$1</h3>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-[17px] font-bold text-white" style="margin-top:1.5rem;margin-bottom:0.5rem;padding-bottom:0.25rem;border-bottom:1px solid rgba(84,84,88,0.4)">$1</h2>'
    )
    .replace(
      /^# (.+)$/gm,
      '<h1 class="text-[20px] font-bold text-white" style="margin-top:1rem;margin-bottom:0.75rem">$1</h1>'
    )
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-white font-semibold">$1</strong>'
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-[#2c2c2e] text-[#f5c518] px-1.5 py-0.5 rounded-md text-[12px] font-mono">$1</code>'
    )
    .replace(
      /^- (.+)$/gm,
      '<li class="ml-4 text-[14px] leading-[1.7] list-disc" style="color:rgba(235,235,245,0.7)">$1</li>'
    )
    .replace(
      /^(\d+)\. (.+)$/gm,
      '<li class="ml-4 text-[14px] leading-[1.7] list-decimal" style="color:rgba(235,235,245,0.7)">$2</li>'
    )
    .replace(
      /\n{2,}/g,
      '</p><p class="mb-3" style="color:rgba(235,235,245,0.7)">'
    )
    .replace(/\n/g, "<br/>");
}

function colorizeJson(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /"([^"]+)"(?=\s*:)/g,
      '<span class="text-[#f5c518]">"$1"</span>'
    )
    .replace(
      /:\s*"([^"]*?)"/g,
      ': <span class="text-[#30d158]">"$1"</span>'
    )
    .replace(
      /:\s*(\d+\.?\d*)/g,
      ': <span class="text-[#0a84ff]">$1</span>'
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="text-[#bf5af2]">$1</span>'
    )
    .replace(
      /:\s*(null)/g,
      ': <span style="color:rgba(235,235,245,0.3)">$1</span>'
    );
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data: MemoryFile[]) => {
        setFiles(data);
        if (data.length > 0 && !selected) setSelected(data[0]);
        setLoading(false);
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  const isJSON =
    selected?.label.includes("JSON") || selected?.path.endsWith(".json");

  let renderedContent: React.ReactNode = null;
  if (selected) {
    if (isJSON) {
      try {
        const pretty = JSON.stringify(JSON.parse(selected.content), null, 2);
        const lines = pretty.split("\n");
        renderedContent = (
          <div className="bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(84,84,88,0.3)]">
            <div className="flex">
              {/* Line numbers */}
              <div className="flex-shrink-0 pr-4 mr-4 select-none border-r border-[rgba(84,84,88,0.3)]">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="font-mono text-[11px] leading-relaxed text-right min-w-[2.5ch]"
                    style={{ color: "rgba(235,235,245,0.2)" }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Syntax highlighted content */}
              <pre
                className="font-mono text-[13px] whitespace-pre-wrap leading-relaxed flex-1"
                dangerouslySetInnerHTML={{ __html: colorizeJson(pretty) }}
              />
            </div>
          </div>
        );
      } catch {
        renderedContent = (
          <div className="bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(84,84,88,0.3)]">
            <pre className="font-mono text-[13px] text-[#ff453a] whitespace-pre-wrap">
              {selected.content}
            </pre>
          </div>
        );
      }
    } else {
      renderedContent = (
        <div
          className="text-[14px] leading-[1.7]"
          style={{ color: "rgba(235,235,245,0.7)" }}
          dangerouslySetInnerHTML={{
            __html: `<p class="mb-3" style="color:rgba(235,235,245,0.7)">${simpleMarkdown(selected.content)}</p>`,
          }}
        />
      );
    }
  }

  const lineCount = selected ? selected.content.split("\n").length : 0;
  const charCount = selected ? selected.content.length : 0;
  const words = selected ? wordCount(selected.content) : 0;

  return (
    <div className="flex h-full bg-[#000000]">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-[#1c1c1e] flex flex-col">
        {/* Sidebar header */}
        <div
          className="p-4 flex items-center justify-between flex-shrink-0"
          style={{ boxShadow: "0 1px 0 rgba(84,84,88,0.4)" }}
        >
          <span className="text-[17px] font-semibold text-white">Memory</span>
          <button
            onClick={refresh}
            className="text-[rgba(235,235,245,0.4)] hover:text-white transition-colors text-[16px]"
          >
            &#8635;
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div
              className="p-4 text-[rgba(235,235,245,0.5)] text-[14px] animate-pulse"
            >
              Loading...
            </div>
          ) : (
            files.map((file, idx) => {
              const isActive = selected?.path === file.path;
              const isLast = idx === files.length - 1;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelected(file)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    !isLast ? "border-b border-[rgba(84,84,88,0.3)]" : ""
                  } ${
                    isActive
                      ? "bg-[rgba(245,197,24,0.1)] border-l-[3px] border-l-[#f5c518]"
                      : "border-l-[3px] border-l-transparent hover:bg-[rgba(120,120,128,0.12)]"
                  }`}
                >
                  <div className="text-[14px] font-medium text-white truncate">
                    {file.label}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "rgba(235,235,245,0.5)" }}>
                    {timeAgo(file.lastModified)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#000000]">
        {selected ? (
          <>
            {/* Content header */}
            <div
              className="px-8 py-4 flex items-center justify-between flex-shrink-0"
              style={{ boxShadow: "0 1px 0 rgba(84,84,88,0.4)" }}
            >
              <div>
                <div className="text-[17px] font-bold text-white">
                  {selected.label}
                </div>
                <div
                  className="text-[12px] font-mono mt-0.5"
                  style={{ color: "rgba(235,235,245,0.5)" }}
                >
                  {selected.path}
                </div>
                <div
                  className="text-[12px] mt-0.5"
                  style={{ color: "rgba(235,235,245,0.4)" }}
                >
                  {isJSON ? (
                    <>
                      {lineCount} lines &middot;{" "}
                      {charCount.toLocaleString()} characters
                    </>
                  ) : (
                    <>
                      {words.toLocaleString()} words &middot; {lineCount} lines
                      &middot; {charCount.toLocaleString()} chars
                    </>
                  )}
                </div>
              </div>
              <div
                className="text-[12px]"
                style={{ color: "rgba(235,235,245,0.4)" }}
              >
                Modified {timeAgo(selected.lastModified)}
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-[720px] mx-auto">{renderedContent}</div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span
              className="text-[15px]"
              style={{ color: "rgba(235,235,245,0.5)" }}
            >
              Select a file from the sidebar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
