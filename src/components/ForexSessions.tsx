"use client";

import { useState, useEffect } from "react";

const SESSIONS = [
  { name: "Sydney", open: 22, close: 7, color: "bg-purple-500", textColor: "text-purple-400" },
  { name: "Tokyo", open: 0, close: 9, color: "bg-rose-500", textColor: "text-rose-400" },
  { name: "London", open: 8, close: 17, color: "bg-blue-500", textColor: "text-blue-400" },
  { name: "New York", open: 13, close: 22, color: "bg-emerald-500", textColor: "text-emerald-400" },
];

function isSessionActive(session: typeof SESSIONS[0], utcHour: number): boolean {
  if (session.open < session.close) {
    return utcHour >= session.open && utcHour < session.close;
  }
  return utcHour >= session.open || utcHour < session.close;
}

export function ForexSessions() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();

  return (
    <div className="glass rounded-2xl p-4">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sessions Forex</h4>
      <div className="space-y-2">
        {SESSIONS.map((session) => {
          const active = isSessionActive(session, utcHour);
          return (
            <div key={session.name} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${active ? session.color : "bg-gray-700"} ${active ? "animate-pulse" : ""}`} />
              <span className={`text-xs font-medium flex-1 ${active ? session.textColor : "text-gray-600"}`}>
                {session.name}
              </span>
              <span className="text-[10px] text-gray-500 mono whitespace-nowrap">{session.open}:00-{session.close}:00 UTC</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-800 text-center">
        <span className="text-[10px] text-gray-500">UTC: {now.toUTCString().slice(17, 25)}</span>
      </div>
    </div>
  );
}
