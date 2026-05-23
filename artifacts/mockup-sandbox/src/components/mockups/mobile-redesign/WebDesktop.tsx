import { useState } from "react";

/* ─── tiny helpers ─── */
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: color }}>
      {initials}
    </div>
  );
}

function AvatarStack({ list }: { list: { initials: string; color: string }[] }) {
  return (
    <div className="flex items-center">
      {list.slice(0, 3).map((a, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: list.length - i }}>
          <Avatar initials={a.initials} color={a.color} />
        </div>
      ))}
      {list.length > 3 && (
        <div className="w-7 h-7 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[10px] font-bold text-slate-500" style={{ marginLeft: -8 }}>
          +{list.length - 3}
        </div>
      )}
    </div>
  );
}

function DonutChart() {
  const segments = [
    { pct: 30, color: "#6366f1" },  // active
    { pct: 38, color: "#a5b4fc" },  // completed
    { pct: 15, color: "#f97316" },  // review
    { pct: 17, color: "#3b82f6" },  // idle
  ];
  const r = 36, cx = 44, cy = 44, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      {segments.map((s, i) => {
        const len = (s.pct / 100) * circ;
        const gap = 2;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${len - gap} ${circ - (len - gap)}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" className="text-[16px] font-bold fill-slate-800" fontSize={16} fontWeight={700}>5</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400" fontSize={9}>Agents</text>
    </svg>
  );
}

const AGENTS = [
  {
    name: "Sales Bot", key: "sales-bot", emoji: "💼", status: "active",
    priority: "High", priorityColor: "#ef4444",
    desc: "Xử lý lead inbound, phân loại & chuyển tiếp tới team sales",
    range: "Mar 1 – May 31, 2026",
    members: [{ initials: "NV", color: "#6366f1" }, { initials: "TK", color: "#3b82f6" }],
    attachments: 3, comments: 8,
  },
  {
    name: "Code Expert", key: "coder", emoji: "💻", status: "active",
    priority: "High", priorityColor: "#ef4444",
    desc: "Review code, suggest refactors, generate unit tests tự động",
    range: "Apr 10 – Jun 15, 2026",
    members: [{ initials: "DT", color: "#10b981" }, { initials: "PH", color: "#f97316" }, { initials: "NV", color: "#6366f1" }],
    attachments: 7, comments: 12,
  },
  {
    name: "Researcher", key: "research", emoji: "🔬", status: "review",
    priority: "Medium", priorityColor: "#f97316",
    desc: "Deep research, tổng hợp báo cáo PDF, xuất bản lên Vault",
    range: "May 1 – May 30, 2026",
    members: [{ initials: "HM", color: "#8b5cf6" }],
    attachments: 12, comments: 5,
  },
  {
    name: "Support Agent", key: "support", emoji: "🎧", status: "error",
    priority: "High", priorityColor: "#ef4444",
    desc: "Trả lời ticket qua Telegram / Email, escalate khi cần",
    range: "Jan 1 – Dec 31, 2026",
    members: [{ initials: "LH", color: "#ec4899" }, { initials: "NT", color: "#14b8a6" }],
    attachments: 2, comments: 19,
  },
  {
    name: "Content Writer", key: "writer", emoji: "✍️", status: "idle",
    priority: "Low", priorityColor: "#22c55e",
    desc: "Tạo post LinkedIn, newsletter, SEO blog theo brief hàng tuần",
    range: "May 10 – Jun 10, 2026",
    members: [{ initials: "TH", color: "#a855f7" }, { initials: "BN", color: "#06b6d4" }],
    attachments: 0, comments: 3,
  },
  {
    name: "Data Analyst", key: "analyst", emoji: "📊", status: "idle",
    priority: "Medium", priorityColor: "#f97316",
    desc: "Query DB, vẽ charts, gửi báo cáo thống kê tự động lúc 9h",
    range: "May 15 – Jun 30, 2026",
    members: [{ initials: "VD", color: "#f59e0b" }],
    attachments: 5, comments: 2,
  },
];

const COLS = [
  { id: "active",    label: "Active",    color: "#22c55e", keys: ["sales-bot","coder"] },
  { id: "idle",      label: "Idle",      color: "#3b82f6", keys: ["writer","analyst"] },
  { id: "review",    label: "Review",    color: "#f97316", keys: ["research"] },
  { id: "error",     label: "Error",     color: "#ef4444", keys: ["support"] },
];

const SIDEBAR_ITEMS = [
  { icon: "🏠", label: "Overview", active: false },
  { icon: "🤖", label: "Agents", active: true },
  { icon: "💬", label: "Chat", active: false },
  { icon: "📈", label: "Traces", active: false },
  { icon: "🔔", label: "Alerts", active: false, badge: 3 },
  { icon: "🌐", label: "Channels", active: false },
  { icon: "💾", label: "Storage", active: false },
];

function AgentCard({ agent }: { agent: typeof AGENTS[0] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-100">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold rounded-full px-2 py-0.5 border"
          style={{ color: agent.priorityColor, borderColor: agent.priorityColor + "40", background: agent.priorityColor + "12" }}>
          {agent.priority}
        </span>
        <span className="text-[11px] text-slate-400">{agent.range}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{agent.emoji}</span>
        <p className="font-semibold text-slate-800 text-[13px] leading-tight">{agent.name}</p>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">{agent.desc}</p>
      <div className="flex items-center justify-between">
        <AvatarStack list={agent.members} />
        <div className="flex items-center gap-3 text-slate-400">
          {agent.attachments > 0 && (
            <span className="flex items-center gap-1 text-[11px]">📎 {agent.attachments}</span>
          )}
          {agent.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px]">💬 {agent.comments}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WebDesktop() {
  const [sortMap, setSortMap] = useState<Record<string, string>>({
    active: "Name", idle: "Status", review: "Date", error: "Priority"
  });

  return (
    <div className="w-[1280px] h-[800px] bg-[#f5f6fb] font-sans flex overflow-hidden select-none">

      {/* ── Narrow icon sidebar ── */}
      <aside className="w-[60px] h-full bg-white border-r border-slate-100 flex flex-col items-center py-4 gap-1 shrink-0">
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center mb-5">
          <span className="text-white text-[16px]">⚡</span>
        </div>

        {SIDEBAR_ITEMS.map((item) => (
          <div key={item.label} className="relative group">
            <button className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] transition-colors ${
              item.active ? "bg-indigo-50" : "hover:bg-slate-50"
            }`}>
              {item.icon}
            </button>
            {item.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {/* Tooltip */}
            <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {item.label}
            </div>
          </div>
        ))}

        {/* Settings at bottom */}
        <div className="flex-1" />
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] hover:bg-slate-50">⚙️</button>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[12px] font-bold mt-2">A</div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-6 pb-4 bg-[#f5f6fb] shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">GoClaw Platform</p>
              <h1 className="text-[28px] font-bold text-slate-900 leading-none">Agents</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 font-medium">
                🔍 Tìm kiếm
              </button>
              <button className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold shadow-sm">
                + Agent mới
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-10">
            {/* Donut */}
            <div className="flex items-center gap-4">
              <DonutChart />
              <div className="space-y-1.5">
                {[
                  { label: "Active",    count: 2, color: "#6366f1" },
                  { label: "Idle",      count: 2, color: "#a5b4fc" },
                  { label: "Review",    count: 1, color: "#f97316" },
                  { label: "Error",     count: 1, color: "#3b82f6" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }}/>
                    <span>{s.label}</span>
                    <span className="font-bold text-slate-700 ml-1">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-px h-14 bg-slate-200"/>

            {/* Channels */}
            <div>
              <p className="text-[11px] text-slate-400 font-medium mb-2">4 Channels</p>
              <div className="flex items-center gap-1.5">
                {["💬", "📧", "🤙", "💡"].map((ch, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[14px] shadow-sm">
                    {ch}
                  </div>
                ))}
                <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-[14px] font-bold hover:bg-slate-50 shadow-sm">+</button>
              </div>
            </div>

            <div className="w-px h-14 bg-slate-200"/>

            {/* Members */}
            <div>
              <p className="text-[11px] text-slate-400 font-medium mb-2">8 Members</p>
              <div className="flex items-center">
                {[
                  { initials: "NV", color: "#6366f1" },
                  { initials: "TK", color: "#3b82f6" },
                  { initials: "DT", color: "#10b981" },
                  { initials: "PH", color: "#f97316" },
                  { initials: "HM", color: "#8b5cf6" },
                ].map((m, i) => (
                  <div key={i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                    <Avatar initials={m.initials} color={m.color} />
                  </div>
                ))}
                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500" style={{ marginLeft: -8 }}>
                  +3
                </div>
                <button className="w-7 h-7 rounded-full bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm font-bold ml-1 hover:bg-slate-50">+</button>
              </div>
            </div>

            <div className="flex-1"/>

            {/* View toggles */}
            <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
              {["⊞ Board", "☰ List", "📅 Timeline"].map((v, i) => (
                <button key={v} className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  i === 0 ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6">
          <div className="flex gap-4 h-full" style={{ minWidth: "fit-content" }}>
            {COLS.map((col) => {
              const cards = AGENTS.filter((a) => col.keys.includes(a.key));
              return (
                <div key={col.id} className="w-72 flex flex-col h-full shrink-0">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }}/>
                    <span className="text-[13px] font-semibold text-slate-700">{col.label}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{cards.length}</span>
                    <div className="flex-1"/>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-500 cursor-pointer hover:bg-slate-50">
                      {sortMap[col.id]} <span className="ml-0.5">▾</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {cards.map((agent) => (
                      <AgentCard key={agent.key} agent={agent} />
                    ))}
                    {/* Add card button */}
                    <button className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-[12px] text-slate-400 font-medium hover:border-slate-300 hover:text-slate-500 transition-colors">
                      + Add agent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
