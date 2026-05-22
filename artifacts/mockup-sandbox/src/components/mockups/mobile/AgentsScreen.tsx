export function AgentsScreen() {
  const agents = [
    { emoji: "🤖", name: "Sales Assistant", type: "Agent", status: "active", model: "claude-sonnet" },
    { emoji: "📊", name: "Data Analyst", type: "Agent", status: "active", model: "gpt-4o" },
    { emoji: "✍️", name: "Content Writer", type: "Agent", status: "idle", model: "gemini-pro" },
    { emoji: "👥", name: "Support Team", type: "Team", status: "active", model: "3 agents" },
    { emoji: "🔍", name: "Research Bot", type: "Agent", status: "idle", model: "claude-opus" },
    { emoji: "⚙️", name: "DevOps Agent", type: "Agent", status: "busy", model: "gpt-4o" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] space-y-3">

        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Screen 3 / 5</p>
          <h1 className="text-xl font-bold text-white">Agents Screen</h1>
          <p className="text-xs text-zinc-500 mt-1">Card grid — swipe, search, create</p>
        </div>

        {/* Phone frame */}
        <div className="rounded-3xl border-2 border-zinc-700 bg-zinc-900 overflow-hidden shadow-2xl" style={{height: 680}}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 bg-zinc-900">
            <span className="text-xs text-white font-semibold">9:41</span>
            <div className="w-4 h-2.5 border border-white rounded-sm relative">
              <div className="absolute inset-y-0.5 left-0.5 right-1 bg-white rounded-sm"/>
            </div>
          </div>

          {/* Header */}
          <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Agents</h2>
              <button className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-orange-500/30">+</button>
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-700">
              <span className="text-zinc-500 text-sm">🔍</span>
              <span className="text-sm text-zinc-500">Tìm agent...</span>
            </div>
            {/* Filter chips */}
            <div className="flex gap-2 mt-2.5 overflow-x-auto pb-0.5">
              {["Tất cả", "Agent", "Team", "Active", "Idle"].map((f, i) => (
                <button key={f} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${
                  i === 0 ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}>{f}</button>
              ))}
            </div>
          </div>

          {/* Agent grid */}
          <div className="overflow-y-auto px-3 py-3 bg-zinc-950" style={{height: 470}}>
            <div className="grid grid-cols-2 gap-2.5">
              {agents.map((agent) => (
                <div key={agent.name} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 space-y-2 active:scale-95 transition-transform">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-xl">
                      {agent.emoji}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        agent.type === "Team"
                          ? "text-purple-300 bg-purple-500/10 border-purple-500/20"
                          : "text-blue-300 bg-blue-500/10 border-blue-500/20"
                      }`}>{agent.type}</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === "active" ? "bg-green-400" :
                          agent.status === "busy" ? "bg-orange-400" : "bg-zinc-600"
                        }`}/>
                        <span className={`text-[9px] capitalize ${
                          agent.status === "active" ? "text-green-400" :
                          agent.status === "busy" ? "text-orange-400" : "text-zinc-500"
                        }`}>{agent.status}</span>
                      </span>
                    </div>
                  </div>
                  {/* Name */}
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{agent.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{agent.model}</p>
                  </div>
                  {/* Action */}
                  <button className="w-full rounded-xl py-1.5 text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/20">
                    Chat ngay →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tab bar */}
          <div className="border-t border-zinc-800 bg-zinc-900 flex items-center justify-around px-2 py-1.5">
            {[
              { icon: "💬", label: "Chat", active: false },
              { icon: "🤖", label: "Agents", active: true },
              { icon: "📊", label: "Dash", active: false },
              { icon: "📡", label: "Monitor", active: false },
              { icon: "⋯", label: "More", active: false },
            ].map((tab) => (
              <div key={tab.label} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${tab.active ? "bg-blue-500/15" : ""}`}>
                <span className={`text-base ${tab.active ? "text-blue-400" : "text-zinc-500"}`}>{tab.icon}</span>
                <span className={`text-[9px] font-medium ${tab.active ? "text-blue-400" : "text-zinc-600"}`}>{tab.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction notes */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Interactions</p>
          <div className="space-y-1.5">
            {[
              { gesture: "Tap card", action: "Mở chat với agent ngay" },
              { gesture: "Long-press card", action: "Context menu: Edit / Clone / Delete" },
              { gesture: "Swipe card left", action: "Quick actions: Chat / Edit / Delete" },
              { gesture: "FAB (+)", action: "Tạo agent mới — Bottom sheet" },
              { gesture: "Filter chips", action: "Filter theo type / status" },
            ].map((i) => (
              <div key={i.gesture} className="flex items-center gap-3">
                <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded flex-shrink-0">{i.gesture}</span>
                <span className="text-xs text-zinc-400">{i.action}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
