function Sparkline({ data, color = "#f97316" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 80, h = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`g-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g-${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const NAV_GROUPS = [
  { label: "CORE", items: [
    { icon: "⊞", name: "Overview", active: true },
    { icon: "💬", name: "Chat" },
    { icon: "🤖", name: "Agents" },
    { icon: "👥", name: "Agent Teams" },
  ]},
  { label: "CONVERSATIONS", items: [
    { icon: "🕐", name: "Sessions" },
    { icon: "📥", name: "Pending" },
    { icon: "📒", name: "Contacts" },
  ]},
  { label: "CONNECTIVITY", items: [
    { icon: "📡", name: "Channels" },
    { icon: "🔗", name: "Nodes" },
  ]},
  { label: "CAPABILITIES", items: [
    { icon: "⚡", name: "Skills" },
    { icon: "📦", name: "Builtin Tools" },
    { icon: "🔌", name: "MCP Servers" },
    { icon: "🕐", name: "Cron Jobs" },
  ]},
  { label: "DATA", items: [
    { icon: "🧠", name: "Memory" },
    { icon: "📁", name: "Vault" },
    { icon: "🕸️", name: "Knowledge Graph" },
    { icon: "💾", name: "Storage" },
  ]},
  { label: "MONITORING", items: [
    { icon: "📈", name: "Traces" },
    { icon: "📡", name: "Events" },
    { icon: "📋", name: "Activity" },
    { icon: "🖥️", name: "Logs" },
  ]},
  { label: "SYSTEM", items: [
    { icon: "🧩", name: "Providers" },
    { icon: "🔑", name: "API Keys" },
    { icon: "⚙️", name: "Config" },
    { icon: "✅", name: "Approvals" },
  ]},
];

export function WebDesktop() {
  return (
    <div className="w-[1280px] h-[800px] bg-[#f7f5f2] font-sans flex overflow-hidden select-none text-[#1c1a17]">

      {/* ── Sidebar ── */}
      <aside className="w-56 h-full bg-[#f7f5f2] border-r border-[#e5e0d8] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#e5e0d8]">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <span className="text-orange-600 text-base">⚡</span>
          </div>
          <span className="text-[16px] font-bold tracking-tight text-orange-700">GoClaw</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[9px] font-bold text-[#a89880] tracking-widest px-2 mb-1">{group.label}</div>
              {group.items.map((item) => (
                <a key={item.name} href="#" className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] mb-0.5 transition-colors ${
                  item.active
                    ? "bg-orange-500/12 text-orange-700 font-semibold"
                    : "text-[#5a4e3e] hover:bg-[#eee8de] font-medium"
                }`}>
                  <span className="text-[13px] w-4 text-center">{item.icon}</span>
                  <span>{item.name}</span>
                  {item.name === "Approvals" && (
                    <span className="ml-auto text-[9px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">3</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Connection status */}
        <div className="border-t border-[#e5e0d8] px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"/>
          <span className="text-[11px] text-[#5a4e3e] font-medium">localhost:18790</span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-[#e5e0d8] flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[#a89880]">Dashboard</span>
            <span className="text-[#c8bfb0]">/</span>
            <span className="font-semibold text-[#1c1a17]">Overview</span>
          </div>
          <div className="flex-1"/>
          <div className="flex items-center gap-2 bg-[#f7f5f2] rounded-lg px-3 h-8 border border-[#e5e0d8] w-56">
            <span className="text-[#a89880] text-sm">🔍</span>
            <span className="text-[12px] text-[#a89880]">Tìm kiếm...</span>
            <span className="ml-auto text-[10px] text-[#c8bfb0] font-mono">⌘K</span>
          </div>
          <button className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold px-3 h-8 rounded-lg">
            <span>+</span> Agent mới
          </button>
          <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-700 text-sm font-bold">A</div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Alert banners */}
          <div className="flex gap-3">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-amber-500">⚠️</span>
              <span className="text-[12px] text-amber-700 font-medium">3 tool executions đang chờ phê duyệt</span>
              <a href="#" className="ml-auto text-[11px] text-amber-600 font-semibold hover:underline">Xem ngay →</a>
            </div>
            <div className="flex-1 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-red-500">🔴</span>
              <span className="text-[12px] text-red-700 font-medium">Support Agent: summon failed</span>
              <a href="#" className="ml-auto text-[11px] text-red-600 font-semibold hover:underline">Chi tiết →</a>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Requests", value: "1,247", trend: +18, sub: "so với hôm qua", spark: [40,65,55,80,70,90,85], color: "#3b82f6" },
              { label: "Tokens dùng", value: "4.2M", trend: +8, sub: "input + output", spark: [60,45,70,55,80,65,90], color: "#8b5cf6" },
              { label: "Chi phí", value: "$2.40", trend: -12, sub: "budget: $10/day", spark: [30,40,35,45,28,32,22], color: "#f97316" },
              { label: "Agents active", value: "3 / 5", trend: null, sub: "1 lỗi · 1 idle", spark: [2,3,3,4,3,3,3], color: "#22c55e" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-[#e5e0d8] p-4">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-[11px] font-medium text-[#a89880] uppercase tracking-wide">{s.label}</span>
                  {s.trend !== null && (
                    <span className={`text-[10px] font-bold ${s.trend > 0 ? "text-green-600" : "text-red-500"}`}>
                      {s.trend > 0 ? "▲" : "▼"} {Math.abs(s.trend)}%
                    </span>
                  )}
                </div>
                <div className="text-[26px] font-bold text-[#1c1a17] mb-0.5 leading-none">{s.value}</div>
                <div className="text-[10px] text-[#a89880] mb-2">{s.sub}</div>
                <Sparkline data={s.spark} color={s.color} />
              </div>
            ))}
          </div>

          {/* Two-column: Agents + Recent Traces */}
          <div className="grid grid-cols-2 gap-4">

            {/* Agents */}
            <div className="bg-white rounded-xl border border-[#e5e0d8]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0ebe3]">
                <span className="text-[13px] font-semibold">Agents</span>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-[#a89880]">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/> 3 active
                  </div>
                  <a href="#" className="text-[11px] text-orange-600 font-semibold hover:underline">Xem tất cả →</a>
                </div>
              </div>
              <div className="divide-y divide-[#f0ebe3]">
                {[
                  { name: "Sales Bot", key: "sales-bot", model: "GPT-4o", status: "active", sessions: 12, cost: "$0.82", emoji: "💼" },
                  { name: "Code Expert", key: "coder", model: "Claude 3.5 Sonnet", status: "active", sessions: 7, cost: "$0.45", emoji: "💻" },
                  { name: "Researcher", key: "research", model: "Gemini 1.5 Pro", status: "idle", sessions: 3, cost: "$0.23", emoji: "🔬" },
                  { name: "Support Agent", key: "support", model: "GPT-4o", status: "error", sessions: 0, cost: "—", emoji: "🎧" },
                  { name: "Content Writer", key: "writer", model: "Claude 3.5 Haiku", status: "idle", sessions: 5, cost: "$0.18", emoji: "✍️" },
                ].map((a) => (
                  <div key={a.key} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#faf8f5] cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f5f2] flex items-center justify-center text-base shrink-0">{a.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#1c1a17] truncate">{a.name}</div>
                      <div className="text-[10px] text-[#a89880] truncate">{a.model}</div>
                    </div>
                    <div className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      a.status === "active" ? "bg-green-50 text-green-700 border border-green-200" :
                      a.status === "error" ? "bg-red-50 text-red-600 border border-red-200" :
                      "bg-[#f7f5f2] text-[#a89880] border border-[#e5e0d8]"
                    }`}>{a.status}</div>
                    <div className="shrink-0 text-[11px] text-[#a89880] w-8 text-right">{a.sessions}</div>
                    <div className="shrink-0 text-[11px] font-medium text-[#5a4e3e] w-10 text-right">{a.cost}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Traces */}
            <div className="bg-white rounded-xl border border-[#e5e0d8]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0ebe3]">
                <span className="text-[13px] font-semibold">Traces gần đây</span>
                <a href="#" className="text-[11px] text-orange-600 font-semibold hover:underline">Xem tất cả →</a>
              </div>
              <div className="divide-y divide-[#f0ebe3]">
                {[
                  { agent: "Sales Bot", session: "#247", cost: "$0.04", dur: "1.2s", tokens: "1,240", status: "ok", model: "gpt-4o" },
                  { agent: "Code Expert", session: "#183", cost: "$0.12", dur: "3.4s", tokens: "3,820", status: "ok", model: "claude-3-5-sonnet" },
                  { agent: "Researcher", session: "#96", cost: "$0.08", dur: "2.1s", tokens: "2,100", status: "running", model: "gemini-1.5-pro" },
                  { agent: "Support", session: "#44", cost: "—", dur: "—", tokens: "—", status: "error", model: "gpt-4o" },
                  { agent: "Sales Bot", session: "#246", cost: "$0.02", dur: "0.8s", tokens: "680", status: "ok", model: "gpt-4o" },
                  { agent: "Content Writer", session: "#71", cost: "$0.01", dur: "1.5s", tokens: "520", status: "ok", model: "claude-haiku" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#faf8f5] cursor-pointer">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === "ok" ? "bg-green-500" :
                      t.status === "running" ? "bg-blue-400" : "bg-red-500"
                    }`}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#1c1a17]">{t.agent} <span className="font-normal text-[#a89880]">{t.session}</span></div>
                      <div className="text-[10px] text-[#a89880] truncate font-mono">{t.model}</div>
                    </div>
                    <div className="text-[10px] text-[#a89880] shrink-0 w-10 text-right">{t.tokens}</div>
                    <div className="text-[10px] text-[#a89880] shrink-0 w-8 text-right">{t.dur}</div>
                    <div className="text-[11px] font-semibold text-[#5a4e3e] shrink-0 w-10 text-right">{t.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row: Channels + Cron */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[#e5e0d8] p-4">
              <div className="text-[12px] font-semibold mb-3 flex justify-between items-center">
                <span>Channels</span>
                <span className="text-[10px] text-[#a89880]">4 kết nối</span>
              </div>
              {[
                { name: "Telegram", status: "ok", msgs: 847 },
                { name: "Slack", status: "ok", msgs: 234 },
                { name: "WhatsApp", status: "warn", msgs: 12 },
                { name: "Email", status: "ok", msgs: 56 },
              ].map((ch) => (
                <div key={ch.name} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${ch.status === "ok" ? "bg-green-500" : "bg-amber-400"}`}/>
                  <span className="text-[12px] flex-1">{ch.name}</span>
                  <span className="text-[10px] text-[#a89880]">{ch.msgs} msgs</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-[#e5e0d8] p-4">
              <div className="text-[12px] font-semibold mb-3 flex justify-between items-center">
                <span>Cron Jobs</span>
                <span className="text-[10px] text-[#a89880]">3 active</span>
              </div>
              {[
                { name: "daily_report", next: "09:00", status: "ok" },
                { name: "weekly_summary", next: "Th2 08:00", status: "ok" },
                { name: "cleanup_sessions", next: "00:00", status: "ok" },
                { name: "sync_contacts", next: "Đã tắt", status: "off" },
              ].map((cron) => (
                <div key={cron.name} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${cron.status === "ok" ? "bg-green-500" : "bg-zinc-300"}`}/>
                  <span className={`text-[12px] flex-1 font-mono ${cron.status === "off" ? "text-[#c8bfb0]" : ""}`}>{cron.name}</span>
                  <span className="text-[10px] text-[#a89880]">{cron.next}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-[#e5e0d8] p-4">
              <div className="text-[12px] font-semibold mb-3 flex justify-between items-center">
                <span>Quota & Chi phí</span>
                <span className="text-[10px] text-orange-600 font-semibold">24% used</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Requests", used: 1247, max: 10000, pct: 12, color: "#3b82f6" },
                  { label: "Tokens", used: 4.2, max: 50, pct: 8, color: "#8b5cf6", unit: "M" },
                  { label: "Chi phí", used: 2.4, max: 10, pct: 24, color: "#f97316", unit: "$" },
                ].map((q) => (
                  <div key={q.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#5a4e3e]">{q.label}</span>
                      <span className="text-[#a89880]">{q.unit}{q.used} / {q.unit}{q.max}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0ebe3] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${q.pct}%`, backgroundColor: q.color }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
