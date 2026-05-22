export function NavArchitecture() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] space-y-4">

        {/* Title */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-1">GoClaw Mobile Redesign</p>
          <h1 className="text-xl font-bold text-white">Navigation Architecture</h1>
        </div>

        {/* BEFORE */}
        <div className="rounded-2xl border border-red-500/30 bg-zinc-900 overflow-hidden">
          <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">❌  Hiện tại — Hamburger + Sidebar</span>
          </div>
          <div className="p-4 space-y-3">
            {/* phone mock */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden" style={{height: 200}}>
              {/* topbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 flex flex-col justify-between">
                    <div className="h-0.5 bg-zinc-400 rounded"/>
                    <div className="h-0.5 bg-zinc-400 rounded"/>
                    <div className="h-0.5 bg-zinc-400 rounded"/>
                  </div>
                  <span className="text-xs text-white font-semibold">GoClaw</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center">
                  <span className="text-orange-400 text-xs">U</span>
                </div>
              </div>
              {/* content */}
              <div className="p-3 space-y-2">
                <div className="h-3 bg-zinc-700 rounded w-3/4"/>
                <div className="h-3 bg-zinc-700 rounded w-1/2"/>
                <div className="h-3 bg-zinc-700 rounded w-2/3"/>
                <div className="mt-3 text-center">
                  <span className="text-red-400 text-xs">30+ items hidden in sidebar 😰</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center">
                <div className="text-red-400 text-lg mb-1">🍔</div>
                <p className="text-xs text-red-300 font-medium">Hamburger menu</p>
                <p className="text-xs text-zinc-500">3 taps để vào mục</p>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center">
                <div className="text-red-400 text-lg mb-1">📜</div>
                <p className="text-xs text-red-300 font-medium">30+ nav items</p>
                <p className="text-xs text-zinc-500">Cuộn không thấy cuối</p>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-center text-2xl">⬇️</div>

        {/* AFTER */}
        <div className="rounded-2xl border border-green-500/30 bg-zinc-900 overflow-hidden">
          <div className="px-4 py-2.5 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">✅  Mới — Bottom Tab Navigation</span>
          </div>
          <div className="p-4 space-y-3">
            {/* phone mock */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden" style={{height: 200}}>
              {/* content area */}
              <div className="p-3 space-y-2" style={{height: 160}}>
                <div className="h-3 bg-zinc-700 rounded w-3/4"/>
                <div className="h-3 bg-zinc-700 rounded w-1/2"/>
                <div className="h-3 bg-zinc-700 rounded w-2/3"/>
                <div className="mt-2 text-center">
                  <span className="text-green-400 text-xs">Nội dung fullscreen ✨</span>
                </div>
              </div>
              {/* bottom tabs */}
              <div className="border-t border-zinc-700 bg-zinc-900 flex items-center justify-around px-2 py-1.5">
                {[
                  { icon: "💬", label: "Chat", active: true },
                  { icon: "🤖", label: "Agents", active: false },
                  { icon: "📊", label: "Dashboard", active: false },
                  { icon: "📡", label: "Monitor", active: false },
                  { icon: "⋯", label: "More", active: false },
                ].map((tab) => (
                  <div key={tab.label} className={`flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg ${tab.active ? "text-orange-400" : "text-zinc-500"}`}>
                    <span className="text-base">{tab.icon}</span>
                    <span className="text-[9px] font-medium">{tab.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "⚡", label: "1 tap", sub: "đến mọi mục" },
                { icon: "👁️", label: "Rõ ràng", sub: "context luôn hiện" },
                { icon: "📱", label: "Native", sub: "như app thật" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-center">
                  <div className="text-base mb-1">{item.icon}</div>
                  <p className="text-xs text-green-300 font-medium">{item.label}</p>
                  <p className="text-[10px] text-zinc-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab breakdown */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">5 Tabs chính</p>
          <div className="space-y-2">
            {[
              { icon: "💬", tab: "Chat", desc: "Trò chuyện với agent — màn hình chính", color: "text-orange-400" },
              { icon: "🤖", tab: "Agents", desc: "Xem & quản lý agents, teams", color: "text-blue-400" },
              { icon: "📊", tab: "Dashboard", desc: "Overview stats, usage, alerts", color: "text-purple-400" },
              { icon: "📡", tab: "Monitor", desc: "Traces, events, logs realtime", color: "text-green-400" },
              { icon: "⋯", tab: "More", desc: "Settings, channels, skills, admin...", color: "text-zinc-400" },
            ].map((tab) => (
              <div key={tab.tab} className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{tab.icon}</span>
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${tab.color}`}>{tab.tab}</span>
                  <span className="text-xs text-zinc-500 ml-2">{tab.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
