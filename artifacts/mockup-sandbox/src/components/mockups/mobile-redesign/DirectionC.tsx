function Sparkline({ data, color = "#f97316" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 60, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.1" strokeWidth="0"/>
    </svg>
  );
}

export function DirectionC() {
  return (
    <div className="w-[390px] h-[844px] bg-zinc-950 text-white font-sans overflow-hidden relative flex flex-col select-none">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] font-semibold shrink-0">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="4" width="3" height="7" rx="0.5" opacity="0.4"/><rect x="4.5" y="2.5" width="3" height="8.5" rx="0.5" opacity="0.6"/><rect x="9" y="0.5" width="3" height="10.5" rx="0.5"/><rect x="13.5" y="0" width="2" height="11" rx="0.5"/></svg>
          <div className="flex items-center gap-0.5">
            <div className="w-[22px] h-[11px] rounded-[3px] border border-white/40 p-px flex items-center">
              <div className="w-[16px] h-full bg-white rounded-[2px]"/>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
        <div>
          <div className="text-[18px] font-bold text-white">Dashboard</div>
          <div className="text-[11px] text-zinc-400">Thứ Sáu, 23 tháng 5 · 09:41</div>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-sm">🔔</button>
          <button className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-sm">⚙️</button>
        </div>
      </div>

      {/* Period selector */}
      <div className="px-4 mb-3 shrink-0">
        <div className="flex bg-zinc-900 rounded-xl p-1 gap-0.5">
          {["Hôm nay", "7 ngày", "30 ngày"].map((p, i) => (
            <button key={p} className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg ${i === 0 ? "bg-orange-500 text-white" : "text-zinc-400"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards 2x2 */}
      <div className="px-4 mb-3 grid grid-cols-2 gap-2.5 shrink-0">
        {[
          { label: "Requests", value: "1,247", trend: "+18%", up: true, spark: [40,65,55,80,70,90,85], color: "#60a5fa" },
          { label: "Tokens", value: "4.2M", trend: "+8%", up: true, spark: [60,45,70,55,80,65,90], color: "#a78bfa" },
          { label: "Chi phí", value: "$2.40", trend: "-12%", up: false, spark: [30,40,35,45,28,32,22], color: "#f97316" },
          { label: "Sessions", value: "84", trend: "+5%", up: true, spark: [20,35,28,42,38,50,45], color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3.5">
            <div className="flex items-start justify-between mb-1.5">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{s.label}</span>
              <span className={`text-[10px] font-bold ${s.up ? "text-green-400" : "text-red-400"}`}>{s.trend}</span>
            </div>
            <div className="text-[22px] font-bold text-white leading-none mb-2">{s.value}</div>
            <Sparkline data={s.spark} color={s.color} />
          </div>
        ))}
      </div>

      {/* Agent health grid */}
      <div className="px-4 mb-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">AGENT HEALTH</span>
          <span className="text-[11px] text-orange-400">3 active · 1 lỗi</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Sales Bot", status: "active", emoji: "💼" },
            { name: "Coder", status: "active", emoji: "💻" },
            { name: "Research", status: "active", emoji: "🔬" },
            { name: "Support", status: "error", emoji: "🎧" },
            { name: "Writer", status: "idle", emoji: "✍️" },
            { name: "+ Tạo mới", status: "add", emoji: "➕" },
          ].map((a) => (
            <div key={a.name} className={`rounded-xl border py-2.5 px-2 flex flex-col items-center gap-1 ${
              a.status === "active" ? "bg-green-500/5 border-green-500/20" :
              a.status === "error" ? "bg-red-500/10 border-red-500/30" :
              a.status === "add" ? "bg-zinc-800/50 border-zinc-700 border-dashed" :
              "bg-zinc-900 border-zinc-800"
            }`}>
              <span className="text-lg">{a.emoji}</span>
              <span className="text-[9px] font-medium text-zinc-300 text-center leading-tight">{a.name}</span>
              {a.status !== "add" && (
                <div className={`w-1.5 h-1.5 rounded-full ${
                  a.status === "active" ? "bg-green-400" :
                  a.status === "error" ? "bg-red-400 animate-pulse" : "bg-zinc-600"
                }`}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent traces mini */}
      <div className="px-4 flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">TRACES GẦN ĐÂY</span>
          <span className="text-[11px] text-orange-400">Xem tất cả →</span>
        </div>
        <div className="space-y-1.5 overflow-hidden">
          {[
            { agent: "Sales Bot", cost: "$0.04", dur: "1.2s", status: "ok" },
            { agent: "Coder", cost: "$0.12", dur: "3.4s", status: "ok" },
            { agent: "Research", cost: "$0.08", dur: "2.1s", status: "running" },
            { agent: "Support", cost: "—", dur: "—", status: "error" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-zinc-900 rounded-xl px-3 py-2 border border-zinc-800">
              <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "ok" ? "bg-green-400" : t.status === "running" ? "bg-blue-400 animate-pulse" : "bg-red-400"}`}/>
              <span className="text-[12px] font-medium text-white flex-1">{t.agent}</span>
              <span className="text-[10px] text-zinc-500">{t.dur}</span>
              <span className="text-[10px] font-semibold text-zinc-400">{t.cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="h-20 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl flex items-center px-4 pb-4 gap-1 mt-2 shrink-0">
        {[
          { icon: "📊", label: "Dashboard", active: true },
          { icon: "💬", label: "Chat", active: false },
          { icon: "🤖", label: "Agents", active: false },
          { icon: "⚡", label: "Ops", active: false },
          { icon: "⚙️", label: "System", active: false },
        ].map((tab) => (
          <button key={tab.label} className="flex-1 flex flex-col items-center gap-0.5 pt-1">
            <div className={`w-9 h-7 rounded-xl flex items-center justify-center ${tab.active ? "bg-orange-500/20" : ""}`}>
              <span className="text-sm">{tab.icon}</span>
            </div>
            <span className={`text-[9px] font-medium ${tab.active ? "text-orange-400" : "text-zinc-500"}`}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="absolute top-14 right-3 bg-purple-500/20 border border-purple-500/40 rounded-xl px-2.5 py-1">
        <span className="text-[10px] font-bold text-purple-400">C — Dashboard Hero</span>
      </div>
    </div>
  );
}
