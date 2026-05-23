export function DirectionA() {
  return (
    <div className="w-[390px] h-[844px] bg-zinc-950 text-white font-sans overflow-hidden relative flex flex-col select-none">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] font-semibold shrink-0">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="4" width="3" height="7" rx="0.5" opacity="0.4"/><rect x="4.5" y="2.5" width="3" height="8.5" rx="0.5" opacity="0.6"/><rect x="9" y="0.5" width="3" height="10.5" rx="0.5"/><rect x="13.5" y="0" width="2" height="11" rx="0.5"/></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><path d="M7.5 2.5C9.8 2.5 11.9 3.4 13.4 4.9L14.8 3.5C12.9 1.7 10.3 0.5 7.5 0.5C4.7 0.5 2.1 1.7 0.2 3.5L1.6 4.9C3.1 3.4 5.2 2.5 7.5 2.5Z" opacity="0.4"/><path d="M7.5 5.5C8.9 5.5 10.2 6.1 11.1 7L12.5 5.6C11.2 4.3 9.5 3.5 7.5 3.5C5.5 3.5 3.8 4.3 2.5 5.6L3.9 7C4.8 6.1 6.1 5.5 7.5 5.5Z" opacity="0.7"/><circle cx="7.5" cy="9.5" r="1.5"/></svg>
          <div className="flex items-center gap-0.5">
            <div className="w-[22px] h-[11px] rounded-[3px] border border-white/40 p-px flex items-center">
              <div className="w-[16px] h-full bg-white rounded-[2px]"/>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-400 text-sm">⚡</span>
          </div>
          <div>
            <div className="text-[15px] font-bold text-white leading-tight">GoClaw</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
              <span className="text-[10px] text-zinc-400">Đã kết nối</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <span className="text-sm">🔍</span>
          </button>
          <button className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <span className="text-sm">☰</span>
          </button>
        </div>
      </div>

      {/* Drawer peek (partially visible from left) */}
      <div className="absolute left-0 top-0 w-[72px] h-full bg-zinc-900/80 border-r border-zinc-700/50 z-10 flex flex-col items-center pt-20 gap-1 backdrop-blur-sm">
        {[
          { icon: "🏠", label: "Home", active: false },
          { icon: "💬", label: "Chat", active: false },
          { icon: "🤖", label: "Agents", active: true },
          { icon: "⚡", label: "Skills", active: false },
          { icon: "📊", label: "Monitor", active: false },
          { icon: "🔧", label: "System", active: false },
        ].map((item) => (
          <div key={item.label} className={`w-12 flex flex-col items-center gap-0.5 py-2 rounded-xl cursor-pointer ${item.active ? "bg-orange-500/20" : "hover:bg-zinc-800"}`}>
            <span className="text-lg">{item.icon}</span>
            <span className={`text-[8px] font-medium ${item.active ? "text-orange-400" : "text-zinc-500"}`}>{item.label}</span>
          </div>
        ))}
        <div className="flex-1"/>
        <div className="w-12 flex flex-col items-center gap-0.5 py-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
            <span className="text-xs">👤</span>
          </div>
          <span className="text-[8px] text-zinc-500">Profile</span>
        </div>
      </div>

      {/* Main content (offset by drawer) */}
      <div className="ml-[72px] flex-1 overflow-hidden flex flex-col">
        {/* Section label */}
        <div className="px-4 pt-1 pb-2">
          <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Agents</span>
        </div>

        {/* Agent cards */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">
          {[
            { name: "Sales Bot", key: "sales-bot", status: "active", model: "GPT-4o", sessions: 12, tokens: "2.4M", color: "#22c55e", emoji: "💼" },
            { name: "Code Expert", key: "coder", status: "active", model: "Claude 3.5", sessions: 7, tokens: "1.1M", color: "#22c55e", emoji: "💻" },
            { name: "Researcher", key: "research", status: "idle", model: "Gemini 1.5", sessions: 3, tokens: "890K", color: "#60a5fa", emoji: "🔬" },
            { name: "Support Agent", key: "support", status: "error", model: "GPT-4o", sessions: 0, tokens: "0", color: "#ef4444", emoji: "🎧" },
            { name: "Content Writer", key: "writer", status: "idle", model: "Claude 3.5", sessions: 5, tokens: "560K", color: "#60a5fa", emoji: "✍️" },
          ].map((agent) => (
            <div key={agent.key} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl shrink-0">
                  {agent.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[14px] font-semibold text-white truncate">{agent.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }}/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">{agent.model}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-[11px] text-zinc-500">{agent.sessions} sessions</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-medium text-zinc-400">{agent.tokens}</div>
                  <div className="text-[9px] text-zinc-600">tokens</div>
                </div>
              </div>
              {agent.status === "active" && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-800 flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500/60 rounded-full" style={{ width: "35%" }}/>
                  </div>
                  <span className="text-[9px] text-zinc-500">đang xử lý</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom FAB — new agent */}
      <div className="absolute bottom-24 right-4">
        <button className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <span className="text-white text-xl font-light">+</span>
        </button>
      </div>

      {/* Bottom tab bar */}
      <div className="absolute bottom-0 left-[72px] right-0 h-20 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl flex items-center px-2 pb-4 gap-1">
        {[
          { icon: "🏠", label: "Home", active: false },
          { icon: "💬", label: "Chat", active: false },
          { icon: "🤖", label: "Agents", active: true },
          { icon: "📡", label: "Monitor", active: false },
        ].map((tab) => (
          <button key={tab.label} className={`flex-1 flex flex-col items-center gap-1 pt-2 rounded-xl ${tab.active ? "" : ""}`}>
            <span className="text-base">{tab.icon}</span>
            <span className={`text-[10px] font-medium ${tab.active ? "text-orange-400" : "text-zinc-500"}`}>{tab.label}</span>
            {tab.active && <div className="absolute bottom-3.5 w-1 h-1 rounded-full bg-orange-400"/>}
          </button>
        ))}
      </div>

      {/* Direction label */}
      <div className="absolute top-14 right-3 bg-orange-500/20 border border-orange-500/40 rounded-xl px-2.5 py-1">
        <span className="text-[10px] font-bold text-orange-400">A — Drawer Nav</span>
      </div>
    </div>
  );
}
