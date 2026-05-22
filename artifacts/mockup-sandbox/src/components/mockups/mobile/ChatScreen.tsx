import { useState } from "react";

export function ChatScreen() {
  const [input, setInput] = useState("");
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] space-y-3">

        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-1">Screen 2 / 5</p>
          <h1 className="text-xl font-bold text-white">Chat Screen</h1>
          <p className="text-xs text-zinc-500 mt-1">Mobile-first, LobeHub-inspired</p>
        </div>

        {/* Phone frame */}
        <div className="rounded-3xl border-2 border-zinc-700 bg-zinc-900 overflow-hidden shadow-2xl" style={{height: 680}}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 bg-zinc-900">
            <span className="text-xs text-white font-semibold">9:41</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 items-end">
                <div className="w-1 h-2 bg-white rounded-sm"/>
                <div className="w-1 h-3 bg-white rounded-sm"/>
                <div className="w-1 h-4 bg-white rounded-sm"/>
                <div className="w-1 h-3 bg-zinc-600 rounded-sm"/>
              </div>
              <div className="w-4 h-2.5 border border-white rounded-sm relative">
                <div className="absolute inset-y-0.5 left-0.5 right-1 bg-white rounded-sm"/>
                <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-white rounded-r-sm"/>
              </div>
            </div>
          </div>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
            {/* back + agent info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm">🤖</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">Sales Assistant</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"/>
                </div>
                {/* Quick model badge - LobeHub pattern */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5 border border-zinc-700">claude-sonnet-3.7 ▾</span>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">🔍</button>
              <button className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">⋯</button>
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-zinc-950" style={{height: 430}}>

            {/* Date separator */}
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-zinc-800"/>
              <span className="text-[10px] text-zinc-600">Hôm nay</span>
              <div className="flex-1 h-px bg-zinc-800"/>
            </div>

            {/* Agent message */}
            <div className="flex items-end gap-2 max-w-[80%]">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
              <div>
                <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2.5">
                  <p className="text-sm text-zinc-100 leading-relaxed">Xin chào! Tôi có thể giúp gì cho bạn hôm nay? 👋</p>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 ml-2">9:35 AM</p>
              </div>
            </div>

            {/* User message */}
            <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
              <div>
                <div className="rounded-2xl rounded-br-sm px-3 py-2.5" style={{background: "oklch(0.50 0.17 38)"}}>
                  <p className="text-sm text-white leading-relaxed">Cho tôi xem báo cáo doanh thu tháng 5</p>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 mr-2 text-right">9:36 AM ✓✓</p>
              </div>
            </div>

            {/* Agent thinking */}
            <div className="flex items-end gap-2 max-w-[80%]">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
              <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay: "0ms"}}/>
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay: "150ms"}}/>
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay: "300ms"}}/>
                  </div>
                  <span className="text-xs text-zinc-500">Đang xử lý...</span>
                </div>
              </div>
            </div>

            {/* Agent response with tool */}
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
              <div className="space-y-1.5">
                {/* Tool call badge */}
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-blue-400 text-xs">⚙️ query_database</span>
                  <span className="text-[10px] text-zinc-500">· 0.3s</span>
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2.5">
                  <p className="text-sm text-zinc-100 leading-relaxed">Doanh thu tháng 5/2026:</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Tổng doanh thu</span>
                      <span className="text-green-400 font-semibold">₫482.5M</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">So tháng 4</span>
                      <span className="text-green-400">+12.3% ↑</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Input area */}
          <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-2.5">
            {/* File attachments row */}
            <div className="flex items-center gap-2 mb-2">
              <button className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">📎</button>
              <button className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">🎤</button>
              <button className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">📷</button>
              <div className="flex-1"/>
              <span className="text-xs text-zinc-600">context: 12% ▓░░░░</span>
            </div>
            {/* Text input */}
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-2xl bg-zinc-800 border border-zinc-700 px-3 py-2 min-h-[36px] flex items-center">
                <span className="text-sm text-zinc-500">Nhập tin nhắn...</span>
              </div>
              <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{background: "oklch(0.62 0.19 38)"}}>
                <span className="text-white text-sm">↑</span>
              </button>
            </div>
          </div>

          {/* Bottom tab bar */}
          <div className="border-t border-zinc-800 bg-zinc-900 flex items-center justify-around px-2 py-1.5">
            {[
              { icon: "💬", label: "Chat", active: true },
              { icon: "🤖", label: "Agents", active: false },
              { icon: "📊", label: "Dash", active: false },
              { icon: "📡", label: "Monitor", active: false },
              { icon: "⋯", label: "More", active: false },
            ].map((tab) => (
              <div key={tab.label} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${tab.active ? "bg-orange-500/15" : ""}`}>
                <span className={`text-base ${tab.active ? "text-orange-400" : "text-zinc-500"}`}>{tab.icon}</span>
                <span className={`text-[9px] font-medium ${tab.active ? "text-orange-400" : "text-zinc-600"}`}>{tab.label}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Key features */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "🔀", label: "Quick model switch", sub: "Tap model badge → chọn model khác" },
            { icon: "✏️", label: "Rename session", sub: "Long-press session → edit tên" },
            { icon: "🗃️", label: "Archive history", sub: "Swipe-left → archive / pin" },
            { icon: "⚡", label: "Tool actions", sub: "Hover message → copy, TTS, retry" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <span className="text-xl">{f.icon}</span>
              <p className="text-xs font-semibold text-white mt-1">{f.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{f.sub}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
