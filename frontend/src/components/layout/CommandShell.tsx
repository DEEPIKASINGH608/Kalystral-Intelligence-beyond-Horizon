import React from "react";
import { Compass, Anchor, ShieldAlert, Cpu, History } from "lucide-react";

interface CommandShellProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Command Bridge", icon: Compass, active: true, phase: "P1" },
  { label: "Rate Forecast", icon: Cpu, active: false, phase: "P3" },
  { label: "Vessel & Port Fit", icon: Anchor, active: false, phase: "P4" },
  { label: "Weather & Congestion", icon: ShieldAlert, active: false, phase: "P3" },
  { label: "Decision Vault", icon: History, active: false, phase: "P5" },
];

export const CommandShell: React.FC<CommandShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-100">
      <aside className="w-full lg:w-68 bg-navy-900/90 border-b lg:border-b-0 lg:border-r border-cyan-500/15 backdrop-blur-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800/80">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Compass className="h-5 w-5 text-navy-950 stroke-[2.25]" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-wider text-lg text-white">
                KALYSTRAL
              </h1>
              <p className="text-[11px] text-cyan-400/90 tracking-wide">
                Intelligence Beyond the Horizon.
              </p>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                    item.active
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:bg-navy-800/60 cursor-not-allowed opacity-70"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-navy-950 text-slate-400 border border-slate-800">
                    {item.phase}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Corridor Focus</span>
            <span className="font-mono text-teal-400">ECI Bulk</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Team</span>
            <span className="text-slate-300 font-medium">Rizzalytics</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};