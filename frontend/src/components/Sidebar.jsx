import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarClock,
  MessageSquareMore,
  BarChart3,
  Users,
  Settings,
  Rocket,
  HelpCircle,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard,   label: 'Dashboard' },
  { to: '/scheduler', icon: CalendarClock,     label: 'Scheduler' },
  { to: '/dm-bot',    icon: MessageSquareMore, label: 'DM Bot' },
  { to: '/analytics', icon: BarChart3,         label: 'Analytics' },
  { to: '/accounts',  icon: Users,             label: 'Accounts' },
  { to: '/settings',  icon: Settings,          label: 'Settings' },
  { to: '/help',      icon: HelpCircle,        label: 'Help & Docs' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-dark-800/80 backdrop-blur-md border-r border-dark-600/40 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-dark-600/30">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center shadow-lg shadow-accent-600/20">
          <Rocket size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-accent-300 to-purple-400 bg-clip-text text-transparent">
            GravityPanel
          </h1>
          <p className="text-[10px] text-dark-300 tracking-wider uppercase">Social Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-accent-600/15 text-accent-300 shadow-sm shadow-accent-600/10'
                  : 'text-dark-200 hover:text-white hover:bg-dark-600/40'
              }`
            }
          >
            <Icon
              size={18}
              className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-dark-600/30">
        <p className="text-[11px] text-dark-400">v1.0.0 • GravityPanel</p>
      </div>
    </aside>
  );
}
