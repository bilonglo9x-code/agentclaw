export function DirectionB() {
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

      {/* Search bar hero */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-800 rounded-2xl px-4 h-12 border border-zinc-700">
          <span className="text-zinc-400 text-sm">🔍</span>
          <span className="text-zinc-400 text-[14px] flex-1">Tìm agent, session, vault...</span>
          <div className="bg-zinc-700 rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-zinc-400 font-medium">⌘K</span>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      <div className="mx-4 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shrink-0">
        <span className="text-amber-400 text-sm">⚠️</span>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] text-amber-300 font-medium">3 yêu cầu đang chờ phê duyệt</span>
        </div>
        <span className="text-[11px] text-amber-400 font-semibold shrink-0">Xem →</span>
      </div>

      {/* Quick action grid */}
      <div className="px-4 mb-4 shrink-0">
        <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-2.5">TRUY CẬP NHANH</div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { icon: "💬", label: "Chat", color: "bg-blue-500/15 border-blue-500/30", iconColor: "text-blue-400" },
            { icon: "🤖", label: "Agents", color: "bg-orange-500/15 border-orange-500/30", iconColor: "text-orange-400" },
            { icon: "⚡", label: "Skills", color: "bg-yellow-500/15 border-yellow-500/30", iconColor: "text-yellow-400" },
            { icon: "✅", label: "Duyệt", color: "bg-red-500/15 border-red-500/30", iconColor: "text-red-400", badge: "3" },
            { icon: "📊", label: "Traces", color: "bg-purple-500/15 border-purple-500/30", iconColor: "text-purple-400" },
            { icon: "🧠", label: "Memory", color: "bg-green-500/15 border-green-500/30", iconColor: "text-green-400" },
            { icon: "🕐", label: "Cron", color: "bg-cyan-500/15 border-cyan-500/30", iconColor: "text-cyan-400" },
            { icon: "⚙️", label: "Config", color: "bg-zinc-700/50 border-zinc-700", iconColor: "text-zinc-400" },
          ].map((item) => (
            <button key={item.label} className={`relative flex flex-col items-center gap-1.5 py-3 rounded-2xl border ${item.color}`}>
              <span className={`text-xl ${item.iconColor}`}>{item.icon}</span>
              <span className="text-[10px] font-medium text-zinc-300">{item.label}</span>
              {item.badge && (
                <div className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">{item.badge}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active agents strip */}
      <div className="px-4 mb-4 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">AGENTS ĐANG CHẠY</span>
          <span className="text-[11px] text-orange-400 font-medium">3 active</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {[
            { name: "Sales Bot", emoji: "💼", sessions: 4, cpu: 72 },
            { name: "Coder", emoji: "💻", sessions: 2, cpu: 45 },
            { name: "Research", emoji: "🔬", sessions: 1, cpu: 28 },
          ].map((agent) => (
            <div key={agent.name} className="shrink-0 w-[110px] bg-zinc-900 rounded-2xl border border-zinc-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{agent.emoji}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
              </div>
              <div className="text-[12px] font-semibold text-white mb-1 truncate">{agent.name}</div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-400" style={{ width: `${agent.cpu}%` }}/>
              </div>
              <div className="text-[9px] text-zinc-500 mt-1">{agent.sessions} sessions</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="px-4 flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">HOẠT ĐỘNG GẦN ĐÂY</span>
          <span className="text-[11px] text-orange-400 font-medium">Xem tất cả →</span>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {[
            { icon: "✅", color: "#22c55e", text: "Sales Bot hoàn thành task #247", time: "2m" },
            { icon: "⚠️", color: "#f59e0b", text: "Approval cần xử lý: tool_exec", time: "5m" },
            { icon: "🕐", color: "#60a5fa", text: "Cron 'daily_report' chạy thành công", time: "15m" },
            { icon: "💬", color: "#a78bfa", text: "Chat mới từ Telegram #orders", time: "22m" },
          ].map((ev, i) => (
            <div key={i} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3.5 py-2.5 border border-zinc-800">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ev.color + "20" }}>
                <span className="text-xs">{ev.icon}</span>
              </div>
              <span className="text-[12px] text-zinc-300 flex-1 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.text}</span>
              <span className="text-[10px] text-zinc-600 shrink-0">{ev.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="h-20 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl flex items-center px-6 pb-4 gap-2 mt-2 shrink-0">
        {[
          { icon: "🏠", label: "Home", active: true },
          { icon: "💬", label: "Chat", active: false },
          { icon: "🤖", label: "Agents", active: false },
          { icon: "📡", label: "Monitor", active: false },
        ].map((tab) => (
          <button key={tab.label} className="flex-1 flex flex-col items-center gap-0.5 pt-1">
            <div className={`w-10 h-8 rounded-xl flex items-center justify-center ${tab.active ? "bg-orange-500/20" : ""}`}>
              <span className="text-base">{tab.icon}</span>
            </div>
            <span className={`text-[10px] font-medium ${tab.active ? "text-orange-400" : "text-zinc-500"}`}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="absolute top-14 right-3 bg-blue-500/20 border border-blue-500/40 rounded-xl px-2.5 py-1">
        <span className="text-[10px] font-bold text-blue-400">B — Command First</span>
      </div>
    </div>
  );
}
