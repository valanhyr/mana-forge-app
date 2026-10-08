import React from 'react';
import { useTranslation } from '../../hooks/use-translation';
import {
  Inbox,
  Users,
  Mail,
  History,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'tickets' | 'users' | 'emails' | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openTicketsCount?: number;
  isMockMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openTicketsCount = 0,
  isMockMode = false,
}) => {
  const { t } = useTranslation();
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets' as NavTab, label: 'Tickets', icon: Inbox, badge: openTicketsCount },
    { id: 'users' as NavTab, label: 'Users 360', icon: Users },
    { id: 'emails' as NavTab, label: 'Email Outreach', icon: Mail },
    { id: 'audit' as NavTab, label: 'Audit Log', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div>
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm tracking-wide">
              MANA FORGE
            </div>
            <div className="text-xs text-indigo-400 font-mono tracking-wider">
              FRONTDESK
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-800 text-indigo-100'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-300">
              {isMockMode ? 'Mock Store Active' : t('serverData')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isMockMode ? 'MtG Premodern Seeds Loaded' : t('serverDataHint')}
          </p>
        </div>
      </div>
    </aside>
  );
};
