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
    <div className="space-y-4">
      {/* Hub Tab Switcher Header */}
      <div className="px-8 pt-6 pb-0 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notices'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bell className="w-4 h-4" /> Statutory Notices (N1/N4) ({dbState.notices.length})
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'communications'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Mail className="w-4 h-4" /> Tenant Communications ({dbState.communications.length})
          </button>
        </div>

        {/* Decorative Divider */}
        <hr className="border-t border-slate-800/80" />
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'notices' && <NoticesPage dbState={dbState} />}
        {activeTab === 'communications' && (
          <CommunicationsPage dbState={dbState} onPreviewEmail={onPreviewEmail} />
        )}
      </div>
    </div>
  );
};
