export function DashboardScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] space-y-3">

        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Screen 4 / 5</p>
          <h1 className="text-xl font-bold text-white">Dashboard Screen</h1>
          <p className="text-xs text-zinc-500 mt-1">Overview — stats, alerts, quick actions</p>
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white">Dashboard</h2>
              <p className="text-xs text-zinc-500">Cập nhật 30s trước</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto bg-zinc-950 px-3 py-3 space-y-3" style={{height: 510}}>

            {/* Alert banner */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 flex items-start gap-2.5">
              <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-300">Embedding provider lỗi</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Provider "openai" không phản hồi · 3 phút trước</p>
              </div>
              <button className="text-xs text-amber-400 font-medium">Fix</button>
            </div>

            {/* Stat cards row */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Requests hôm nay", value: "1,247", change: "+18%", up: true, color: "blue" },
                { label: "Tokens dùng", value: "4.2M", change: "+8%", up: true, color: "purple" },
                { label: "Agents active", value: "6/8", change: "2 idle", up: null, color: "green" },
                { label: "Chi phí hôm nay", value: "$2.40", change: "-12%", up: false, color: "orange" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-[10px] text-zinc-500 leading-tight">{stat.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.up !== null && (
                      <span className={stat.up ? "text-green-400" : "text-red-400"}>
                        {stat.up ? "↑" : "↓"}
                      </span>
                    )}
                    <span className={`text-[10px] ${stat.up ? "text-green-400" : stat.up === false ? "text-red-400" : "text-zinc-500"}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sparkline chart mockup */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">Requests 7 ngày</p>
                <div className="flex gap-1">
                  {["7d", "30d", "90d"].map((t, i) => (
                    <button key={t} className={`px-2 py-0.5 rounded text-[10px] font-medium ${i === 0 ? "bg-purple-500/20 text-purple-300" : "text-zinc-600"}`}>{t}</button>
                  ))}
                </div>
              </div>
              {/* Fake sparkline */}
              <div className="flex items-end gap-1 h-16">
                {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${h}%`,
                    background: i === 6 ? "oklch(0.62 0.19 38)" : "oklch(0.62 0.19 38 / 0.3)"
                  }}/>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {["Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Hôm nay"].map((d) => (
                  <span key={d} className="text-[8px] text-zinc-600 flex-1 text-center">{d}</span>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
                <p className="text-sm font-semibold text-white">Hoạt động gần đây</p>
                <button className="text-xs text-orange-400">Xem tất cả</button>
              </div>
              <div className="divide-y divide-zinc-800">
                {[
                  { icon: "💬", text: "Sales Assistant hoàn thành phân tích", time: "2m", status: "done" },
                  { icon: "⚙️", text: "Skill 'data_query' được invoke", time: "5m", status: "done" },
                  { icon: "🔄", text: "Memory consolidation chạy", time: "12m", status: "running" },
                  { icon: "📧", text: "Email channel nhận 3 tin mới", time: "15m", status: "done" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{item.text}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.status === "running" && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/>}
                      <span className="text-[10px] text-zinc-600">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🔍", label: "Traces" },
                { icon: "📡", label: "Events" },
                { icon: "📋", label: "Logs" },
              ].map((a) => (
                <button key={a.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center active:scale-95 transition-transform">
                  <span className="text-xl">{a.icon}</span>
                  <p className="text-xs text-zinc-400 mt-1">{a.label}</p>
                </button>
              ))}
            </div>

          </div>

          {/* Bottom tab bar */}
          <div className="border-t border-zinc-800 bg-zinc-900 flex items-center justify-around px-2 py-1.5">
            {[
              { icon: "💬", label: "Chat", active: false },
              { icon: "🤖", label: "Agents", active: false },
              { icon: "📊", label: "Dash", active: true },
              { icon: "📡", label: "Monitor", active: false },
              { icon: "⋯", label: "More", active: false },
            ].map((tab) => (
              <div key={tab.label} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${tab.active ? "bg-purple-500/15" : ""}`}>
                <span className={`text-base ${tab.active ? "text-purple-400" : "text-zinc-500"}`}>{tab.icon}</span>
                <span className={`text-[9px] font-medium ${tab.active ? "text-purple-400" : "text-zinc-600"}`}>{tab.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
