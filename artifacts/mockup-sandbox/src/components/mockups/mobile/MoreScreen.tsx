export function MoreScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] space-y-3">

        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Screen 5 / 5</p>
          <h1 className="text-xl font-bold text-white">More Screen</h1>
          <p className="text-xs text-zinc-500 mt-1">Settings, channels, skills, admin tools</p>
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

          {/* Profile header */}
          <div className="px-4 py-4 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">
                👤
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-white">Admin User</p>
                <p className="text-xs text-zinc-500">admin@goclaw.dev</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full font-medium">Owner</span>
                  <span className="text-[10px] text-zinc-500">Acme Corp</span>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">✏️</button>
            </div>
          </div>

          {/* Menu groups */}
          <div className="overflow-y-auto bg-zinc-950 py-3 px-3 space-y-3" style={{height: 510}}>

            {/* Core */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tính năng</p>
              </div>
              {[
                { icon: "⚡", label: "Skills", badge: "12", color: "text-yellow-400" },
                { icon: "🔌", label: "Channels", badge: "Telegram, Slack +2", color: "text-blue-400" },
                { icon: "🕐", label: "Cron Jobs", badge: "3 active", color: "text-green-400" },
                { icon: "🪝", label: "Webhooks", badge: null, color: "text-purple-400" },
                { icon: "🔧", label: "MCP Servers", badge: "2", color: "text-orange-400" },
              ].map((item, i, arr) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-zinc-800 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-800/50" : ""}`}>
                  <span className="text-lg w-8 text-center">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && <span className="text-xs text-zinc-500">{item.badge}</span>}
                    <span className="text-zinc-600 text-sm">›</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Data */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dữ liệu</p>
              </div>
              {[
                { icon: "🧠", label: "Memory & Knowledge", badge: null },
                { icon: "🗄️", label: "Vault", badge: "48 docs" },
                { icon: "💾", label: "Storage", badge: "2.3 GB" },
                { icon: "🗃️", label: "Sessions history", badge: null },
              ].map((item, i, arr) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-zinc-800 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-800/50" : ""}`}>
                  <span className="text-lg w-8 text-center">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && <span className="text-xs text-zinc-500">{item.badge}</span>}
                    <span className="text-zinc-600 text-sm">›</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Admin (chỉ show khi role = admin/owner) */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Admin</p>
                <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">Owner only</span>
              </div>
              {[
                { icon: "🎨", label: "Branding & Theme", badge: null },
                { icon: "🏢", label: "Tenants", badge: "3" },
                { icon: "⚙️", label: "Providers & Config", badge: null },
                { icon: "🔑", label: "API Keys", badge: "5" },
                { icon: "📦", label: "Import / Export", badge: null },
              ].map((item, i, arr) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-zinc-800 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-800/50" : ""}`}>
                  <span className="text-lg w-8 text-center">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && <span className="text-xs text-zinc-500">{item.badge}</span>}
                    <span className="text-zinc-600 text-sm">›</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Account */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              {[
                { icon: "🌙", label: "Giao diện & Theme", badge: "Dark" },
                { icon: "🌐", label: "Ngôn ngữ", badge: "Tiếng Việt" },
                { icon: "❓", label: "Trợ giúp", badge: null },
                { icon: "🚪", label: "Đăng xuất", badge: null, danger: true },
              ].map((item, i, arr) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-zinc-800 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-800/50" : ""}`}>
                  <span className="text-lg w-8 text-center">{item.icon}</span>
                  <span className={`flex-1 text-sm font-medium ${item.danger ? "text-red-400" : "text-zinc-200"}`}>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && <span className="text-xs text-zinc-500">{item.badge}</span>}
                    {!item.danger && <span className="text-zinc-600 text-sm">›</span>}
                  </div>
                </button>
              ))}
            </div>

          </div>

          {/* Bottom tab bar */}
          <div className="border-t border-zinc-800 bg-zinc-900 flex items-center justify-around px-2 py-1.5">
            {[
              { icon: "💬", label: "Chat", active: false },
              { icon: "🤖", label: "Agents", active: false },
              { icon: "📊", label: "Dash", active: false },
              { icon: "📡", label: "Monitor", active: false },
              { icon: "⋯", label: "More", active: true },
            ].map((tab) => (
              <div key={tab.label} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${tab.active ? "bg-zinc-700/40" : ""}`}>
                <span className={`text-base ${tab.active ? "text-white" : "text-zinc-500"}`}>{tab.icon}</span>
                <span className={`text-[9px] font-medium ${tab.active ? "text-white" : "text-zinc-600"}`}>{tab.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
