import type { Metadata } from "next";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "Manor — Command Centre",
  description: "AI Agent Management Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex h-screen overflow-hidden bg-black">
          <aside
            className="w-[220px] flex-shrink-0 bg-[#1c1c1e] flex flex-col"
            style={{ boxShadow: "2px 0 12px rgba(0,0,0,0.3)" }}
          >
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f5c518] to-[#e8b800] flex items-center justify-center text-lg"
                  style={{ boxShadow: "0 2px 8px rgba(245,197,24,0.3)" }}
                >
                  🏰
                </div>
                <div>
                  <div className="font-semibold text-[17px] text-white tracking-[-0.3px]">
                    Manor
                  </div>
                  <div className="text-[12px] text-[rgba(235,235,245,0.5)] tracking-wide">
                    Command Centre
                  </div>
                </div>
              </div>
            </div>
            <NavLinks />
          </aside>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
