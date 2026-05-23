import { useState } from "react";
import {
  LayoutDashboard, Bot, MessageSquare, GitBranch, Clock, Inbox, Users,
  Radio, Plug, Zap, Package, Cpu, Timer, Brain, FolderOpen, Share2,
  HardDrive, BarChart2, Activity, ClipboardList, Terminal,
  Settings, Key, SlidersHorizontal, CheckSquare, ChevronRight,
  Search, Plus, Paperclip, MessageCircle, BellRing, LogOut, Moon,
  HelpCircle, Network, Shield, Mic, Database, BookOpen, Globe
} from "lucide-react";

/* ─── types ─── */
type NavItem = { icon: React.ElementType; label: string; badge?: number };
type NavGroup = { id: string; icon: React.ElementType; label: string; items: NavItem[] };

/* ─── nav structure ─── */
const NAV: NavGroup[] = [
  {
    id: "core", icon: LayoutDashboard, label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Overview" },
      { icon: MessageSquare, label: "Chat" },
      { icon: Bot, label: "Agents" },
      { icon: Users, label: "Agent Teams" },
    ]
  },
  {
    id: "conversations", icon: MessageCircle, label: "Conversations",
    items: [
      { icon: Clock, label: "Sessions" },
      { icon: Inbox, label: "Pending", badge: 3 },
      { icon: Users, label: "Contacts" },
    ]
  },
  {
    id: "channels", icon: Radio, label: "Connectivity",
    items: [
      { icon: Radio, label: "Channels" },
      { icon: Globe, label: "Nodes" },
      { icon: Network, label: "MCP Servers" },
    ]
  },
  {
    id: "capabilities", icon: Zap, label: "Capabilities",
    items: [
      { icon: Zap, label: "Skills" },
      { icon: Package, label: "Builtin Tools" },
      { icon: Cpu, label: "Providers" },
      { icon: Timer, label: "Cron Jobs" },
      { icon: Mic, label: "Voice / TTS" },
    ]
  },
  {
    id: "data", icon: Database, label: "Data",
    items: [
      { icon: Brain, label: "Memory" },
      { icon: BookOpen, label: "Vault" },
      { icon: Share2, label: "Knowledge Graph" },
      { icon: HardDrive, label: "Storage" },
    ]
  },
  {
    id: "monitoring", icon: Activity, label: "Monitoring",
    items: [
      { icon: BarChart2, label: "Traces" },
      { icon: Activity, label: "Events" },
      { icon: ClipboardList, label: "Activity" },
      { icon: Terminal, label: "Logs" },
    ]
  },
  {
    id: "system", icon: Settings, label: "System",
    items: [
      { icon: Key, label: "API Keys" },
      { icon: SlidersHorizontal, label: "Config" },
      { icon: CheckSquare, label: "Approvals", badge: 3 },
      { icon: Shield, label: "Security" },
    ]
  },
];

/* ─── mock agent data ─── */
const AGENTS = [
  { name: "Sales Bot",      key: "sales-bot", emoji: "💼", status: "active",  priority: "High",   priorityColor: "#ef4444", desc: "Xử lý lead inbound, phân loại & chuyển tiếp tới team sales",             range: "Mar 1 – May 31",   members: [{ i: "NV", c: "#6366f1" }, { i: "TK", c: "#3b82f6" }],                              att: 3,  cmt: 8  },
  { name: "Code Expert",    key: "coder",     emoji: "💻", status: "active",  priority: "High",   priorityColor: "#ef4444", desc: "Review code, suggest refactors, generate unit tests tự động",              range: "Apr 10 – Jun 15",  members: [{ i: "DT", c: "#10b981" }, { i: "PH", c: "#f97316" }, { i: "NV", c: "#6366f1" }], att: 7,  cmt: 12 },
  { name: "Researcher",     key: "research",  emoji: "🔬", status: "review",  priority: "Medium", priorityColor: "#f97316", desc: "Deep research, tổng hợp báo cáo PDF, xuất bản lên Vault",                  range: "May 1 – May 30",   members: [{ i: "HM", c: "#8b5cf6" }],                                                      att: 12, cmt: 5  },
  { name: "Support Agent",  key: "support",   emoji: "🎧", status: "error",   priority: "High",   priorityColor: "#ef4444", desc: "Trả lời ticket qua Telegram / Email, escalate khi cần",                   range: "Jan 1 – Dec 31",   members: [{ i: "LH", c: "#ec4899" }, { i: "NT", c: "#14b8a6" }],                             att: 2,  cmt: 19 },
  { name: "Content Writer", key: "writer",    emoji: "✍️", status: "idle",    priority: "Low",    priorityColor: "#22c55e", desc: "Tạo post LinkedIn, newsletter, SEO blog theo brief hàng tuần",              range: "May 10 – Jun 10",  members: [{ i: "TH", c: "#a855f7" }, { i: "BN", c: "#06b6d4" }],                             att: 0,  cmt: 3  },
  { name: "Data Analyst",   key: "analyst",   emoji: "📊", status: "idle",    priority: "Medium", priorityColor: "#f97316", desc: "Query DB, vẽ charts, gửi báo cáo thống kê tự động lúc 9h",                 range: "May 15 – Jun 30",  members: [{ i: "VD", c: "#f59e0b" }],                                                      att: 5,  cmt: 2  },
];

const COLS = [
  { id: "active", label: "Active",  color: "#22c55e", keys: ["sales-bot", "coder"] },
  { id: "idle",   label: "Idle",    color: "#6366f1", keys: ["writer",   "analyst"] },
  { id: "review", label: "Review",  color: "#f97316", keys: ["research"] },
  { id: "error",  label: "Error",   color: "#ef4444", keys: ["support"] },
];

/* ─── Avatar ─── */
function Av({ i, c }: { i: string; c: string }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white shrink-0" style={{ background: c }}>
      {i}
    </div>
  );
}
function AvStack({ list }: { list: { i: string; c: string }[] }) {
  return (
    <div className="flex items-center">
      {list.slice(0, 3).map((a, idx) => (
        <div key={idx} style={{ marginLeft: idx === 0 ? 0 : -6, zIndex: list.length - idx }}><Av {...a} /></div>
      ))}
      {list.length > 3 && (
        <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-[8px] font-bold text-slate-500 flex items-center justify-center" style={{ marginLeft: -6 }}>
          +{list.length - 3}
        </div>
      )}
    </div>
  );
}

/* ─── Donut ─── */
function Donut() {
  const segs = [{ p: 33, c: "#6366f1" }, { p: 34, c: "#a5b4fc" }, { p: 17, c: "#f97316" }, { p: 16, c: "#ef4444" }];
  const r = 30, cx = 36, cy = 36, sw = 10, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      {segs.map((s, i) => {
        const len = (s.p / 100) * circ;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={sw}
          strokeDasharray={`${len - 2} ${circ - (len - 2)}`} strokeDashoffset={-off}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />;
        off += len;
        return el;
      })}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1e293b">5</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#94a3b8">agents</text>
    </svg>
  );
}

/* ─── Agent card ─── */
function Card({ a }: { a: typeof AGENTS[0] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: a.priorityColor, background: a.priorityColor + "15" }}>
          {a.priority}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">{a.range}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[17px] leading-none">{a.emoji}</span>
        <p className="text-[13px] font-semibold text-slate-800">{a.name}</p>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">{a.desc}</p>
      <div className="flex items-center justify-between">
        <AvStack list={a.members} />
        <div className="flex items-center gap-2.5 text-slate-400">
          {a.att > 0 && <span className="flex items-center gap-1 text-[11px]"><Paperclip size={11}/> {a.att}</span>}
          {a.cmt > 0 && <span className="flex items-center gap-1 text-[11px]"><MessageCircle size={11}/> {a.cmt}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export function WebDesktop() {
  const [activeGroup, setActiveGroup] = useState<string | null>("core");
  const [activeItem, setActiveItem] = useState("Agents");

  const currentGroup = NAV.find((g) => g.id === activeGroup);

  return (
    <div className="w-[1280px] h-[800px] bg-[#f4f5fa] flex overflow-hidden select-none font-sans">

      {/* ── Rail (icon-only, 56px) ── */}
      <div className="w-14 h-full bg-[#18181b] flex flex-col items-center pt-4 pb-4 gap-1 shrink-0 z-20">
        {/* Logo */}
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center mb-4">
          <Zap size={16} color="white" strokeWidth={2.5} />
        </div>

        {NAV.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup === group.id;
          const hasBadge = group.items.some((i) => i.badge);
          return (
            <div key={group.id} className="relative group/tip">
              <button
                onClick={() => setActiveGroup(isActive ? null : group.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-indigo-500 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
              </button>
              {hasBadge && !isActive && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
              {/* Tooltip */}
              <div className={`absolute left-[52px] top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none transition-opacity z-50 ${
                activeGroup === group.id ? "opacity-0" : "opacity-0 group-hover/tip:opacity-100"
              }`}>
                {group.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
              </div>
            </div>
          );
        })}

        <div className="flex-1" />

        {/* Bottom icons */}
        {[{ Icon: HelpCircle, label: "Help" }, { Icon: Settings, label: "Settings" }].map(({ Icon, label }) => (
          <div key={label} className="relative group/tip">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all">
              <Icon size={18} strokeWidth={1.8} />
            </button>
            <div className="absolute left-[52px] top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
              {label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
            </div>
          </div>
        ))}
        <button className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-bold mt-1">A</button>
      </div>

      {/* ── Flyout panel (220px) — slides in when group active ── */}
      <div className={`h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shrink-0 overflow-hidden ${
        activeGroup ? "w-56" : "w-0"
      }`}>
        {currentGroup && (
          <>
            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <currentGroup.icon size={15} className="text-indigo-600" strokeWidth={2} />
              </div>
              <span className="text-[13px] font-bold text-slate-800">{currentGroup.label}</span>
            </div>

            <div className="h-px bg-slate-100 mx-4 mb-2" />

            {/* Items */}
            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto py-1">
              {currentGroup.items.map((item) => {
                const ItemIcon = item.icon;
                const isItemActive = activeItem === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveItem(item.label)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors group/item ${
                      isItemActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ItemIcon size={15} strokeWidth={isItemActive ? 2.2 : 1.8} className={isItemActive ? "text-indigo-600" : "text-slate-400 group-hover/item:text-slate-600"} />
                    <span className={`text-[13px] flex-1 ${isItemActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                    {isItemActive && <ChevronRight size={13} className="text-indigo-400" />}
                  </button>
                );
              })}
            </nav>

            {/* Panel footer */}
            <div className="px-2 pb-4 pt-2 border-t border-slate-100 mt-2">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut size={14} strokeWidth={1.8} />
                <span className="text-[12px] font-medium">Đăng xuất</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <div>
            <p className="text-[11px] text-slate-400 font-medium leading-none mb-0.5">{currentGroup?.label ?? "GoClaw"}</p>
            <h2 className="text-[15px] font-bold text-slate-900 leading-none">{activeItem}</h2>
          </div>
          <div className="flex-1" />
          {/* Search */}
          <button className="flex items-center gap-2 h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-[12px] text-slate-500 font-medium w-44">
            <Search size={13} />
            <span className="flex-1 text-left">Tìm kiếm...</span>
            <kbd className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-slate-400">⌘K</kbd>
          </button>
          {/* Notif */}
          <div className="relative">
            <button className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
              <BellRing size={15} />
            </button>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </div>
          {/* Dark mode */}
          <button className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <Moon size={15} />
          </button>
          {/* New */}
          <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold shadow-sm shadow-indigo-200 transition-colors">
            <Plus size={14} strokeWidth={2.5} /> Agent mới
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Page header */}
          <div className="flex items-center gap-4 mb-5">
            <h1 className="text-[22px] font-bold text-slate-900">{activeItem}</h1>
            <div className="flex items-center gap-2 ml-auto">
              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1">
                {["⊞ Board", "☰ List"].map((v, i) => (
                  <button key={v} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    i === 0 ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 mb-5 bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
              <Donut />
              <div className="space-y-1">
                {[["Active","2","#6366f1"],["Idle","2","#a5b4fc"],["Review","1","#f97316"],["Error","1","#ef4444"]].map(([l,n,c])=>(
                  <div key={l} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-sm" style={{background:c}}/>
                    <span className="text-slate-500">{l}</span>
                    <span className="font-bold text-slate-700">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-px h-12 bg-slate-100"/>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Channels</p>
              <div className="flex gap-1.5">
                {[["💬","Telegram"],["📧","Email"],["📱","Zalo"],["🌐","API"]].map(([ico,name])=>(
                  <div key={name} title={name} className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[14px] shadow-sm cursor-pointer hover:bg-indigo-50">
                    {ico}
                  </div>
                ))}
                <button className="w-8 h-8 rounded-xl border border-dashed border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Plus size={13} className="text-slate-400"/>
                </button>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-100"/>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Team</p>
              <div className="flex items-center gap-1">
                {[{i:"NV",c:"#6366f1"},{i:"TK",c:"#3b82f6"},{i:"DT",c:"#10b981"},{i:"PH",c:"#f97316"},{i:"HM",c:"#8b5cf6"}].map((m,idx)=>(
                  <div key={idx} style={{marginLeft:idx===0?0:-8,zIndex:10-idx}}><Av {...m}/></div>
                ))}
                <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-[8px] font-bold text-slate-500 flex items-center justify-center" style={{marginLeft:-8}}>+3</div>
              </div>
            </div>
            <div className="flex-1"/>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 mb-0.5">Chi phí hôm nay</p>
              <p className="text-[20px] font-bold text-slate-900">$2.40</p>
              <p className="text-[10px] text-green-600 font-semibold">▼ 12% so với hôm qua</p>
            </div>
          </div>

          {/* Kanban */}
          <div className="flex gap-4 overflow-x-auto pb-2" style={{minWidth:"fit-content"}}>
            {COLS.map((col) => {
              const cards = AGENTS.filter((a) => col.keys.includes(a.key));
              return (
                <div key={col.id} className="w-[270px] shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background:col.color}}/>
                    <span className="text-[12px] font-bold text-slate-700">{col.label}</span>
                    <span className="text-[11px] text-slate-400">{cards.length}</span>
                    <div className="flex-1"/>
                    <button className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5 hover:text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1">
                      Name <ChevronRight size={10}/>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {cards.map((a) => <Card key={a.key} a={a}/>)}
                    <button className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-[11px] font-medium text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5">
                      <Plus size={12}/> Thêm agent
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
