import React, { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { NoticesPage } from './Notices';
import { CommunicationsPage } from './Communications';

interface LegalCommsHubProps {
  dbState: DatabaseState;
  initialTab?: 'notices' | 'communications';
  onPreviewEmail?: (commId: string) => void;
}

export const LegalCommsHub: React.FC<LegalCommsHubProps> = ({
  dbState,
  initialTab = 'notices',
  onPreviewEmail
}) => {
  const [activeTab, setActiveTab] = useState<'notices' | 'communications'>(initialTab);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Strict Single-Line Title & Subtitle at Top of Page */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          {activeTab === 'notices' ? 'Tenant Notices & Forms (N1 / N4)' : 'Tenant Communications & Campaigns'}
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          {activeTab === 'notices'
            ? 'Ontario Landlord & Tenant Board administrative draft-and-approval workflow'
            : 'Mock email delivery ledger, template previews & bulk tenant notifications'}
        </p>
      </div>

      {/* Single Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Hub Tab Switcher (Below Separator) */}
      <div className="flex items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'notices'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Bell className="w-4 h-4" /> Statutory Notices (N1/N4) ({dbState.notices.length})
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'communications'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Mail className="w-4 h-4" /> Tenant Communications ({dbState.communications.length})
        </button>
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'notices' && <NoticesPage dbState={dbState} />}
        {activeTab === 'communications' && (
          <CommunicationsPage
            dbState={dbState}
            onPreviewEmail={(comm) => onPreviewEmail?.(comm.id)}
          />
        )}
      </div>
    </div>
  );
};
