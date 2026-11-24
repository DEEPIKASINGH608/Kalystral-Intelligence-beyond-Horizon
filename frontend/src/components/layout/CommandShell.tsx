import { NavLink, useNavigate } from "react-router-dom";
import { Compass, Anchor, ShieldAlert, Cpu, History, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface CommandShellProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Command Bridge", to: "/", icon: Compass, active: true, phase: "P2" },
  { label: "Rate Forecast", to: "/forecast", icon: Cpu, active: true, phase: "P3" },
  { label: "Weather & Congestion", to: "/risk", icon: ShieldAlert, active: true, phase: "P3" },
  { label: "Decision Vault", to: "/decisions", icon: History, active: false, phase: "P5" },
  { label: "Vessel & Port Fit", to: "/optimize", icon: Anchor, active: true, phase: "P4" },
];

export function CommandShell({ children }: CommandShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      <aside className="w-full lg:w-72 lg:shrink-0 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Compass className="h-5 w-5 text-slate-950 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-wider text-base text-white truncate">
                KALYSTRAL
              </h1>
              <p className="text-xs text-cyan-400 truncate">
                Intelligence Beyond the Horizon.
              </p>
            </div>
          </div>

          <nav className="mt-5 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (!item.active) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm text-slate-500 bg-slate-900/40 border border-slate-800/60 cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800">
                      {item.phase}
                    </span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-800 border border-transparent"
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/20">
                    {item.phase}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span>Corridor Focus</span>
              <span className="font-mono text-teal-400">ECI Bulk</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Operator</span>
              <span className="font-mono text-slate-200 truncate max-w-[150px]">
                {user?.email || "Authenticated"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Team</span>
              <span className="text-slate-300">Rizzalytics</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}