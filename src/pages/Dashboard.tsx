import React, { useState } from 'react';
import {
  Building2, Home, Users, DollarSign, AlertCircle, Wrench,
  Calendar, Zap, ArrowUpRight, ArrowDownRight, ChevronRight, Play, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DatabaseState } from '../services/supabase';
import { AutomationEngine, ExecutionResult } from '../services/automationEngine';
import { AutomationRunModal } from '../components/AutomationRunModal';
import { NavTab } from '../components/Sidebar';

interface DashboardProps {
  dbState: DatabaseState;
  onNavigate: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ dbState, onNavigate }) => {
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Dynamic KPI Aggregations
  const totalProperties = 24; // Fictional portfolio total
  const totalUnits = 186;
  const occupiedUnits = 174;
  const occupancyRate = ((occupiedUnits / totalUnits) * 100).toFixed(1);

  const rentCollected = 284650;
  const outstandingRent = 18400;

  const openMaintenance = dbState.maintenance_requests.filter(m => m.status !== 'Completed' && m.status !== 'Cancelled').length;
  const expiringLeases = dbState.leases.filter(l => l.status === 'Expiring Soon').length;

  // Chart data for Rent Overview
  const rentChartData = [
    { month: 'Mar', Collected: 275000, Outstanding: 12000 },
    { month: 'Apr', Collected: 279000, Outstanding: 11500 },
    { month: 'May', Collected: 281500, Outstanding: 14200 },
    { month: 'Jun', Collected: 283000, Outstanding: 16000 },
    { month: 'Jul', Collected: 284000, Outstanding: 13500 },
    { month: 'Aug', Collected: rentCollected, Outstanding: outstandingRent },
  ];

  const handleTriggerAutomation = async (type: string) => {
    setIsRunning(true);
    let res: ExecutionResult;

    if (type === 'rent') {
      res = await AutomationEngine.runRentReminderAutomation();
    } else if (type === 'lease') {
      res = await AutomationEngine.runLeaseExpirationAutomation();
    } else {
      res = await AutomationEngine.runMaintenanceVendorAssignment();
    }

    setRunResult(res);
    setIsRunning(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>PropertyFlow Management</span>
            <span>•</span>
            <span>Operations Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Executive Overview</h1>
          <p className="text-sm text-slate-500">Centralized operations, automated tenant communications & audit monitoring</p>
        </div>

        {/* Safe Quick Automation Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerAutomation('rent')}
            disabled={isRunning}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Rent Reminders
          </button>

          <button
            onClick={() => handleTriggerAutomation('vendor')}
            disabled={isRunning}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" /> Auto-Assign Vendors
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Properties & Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Properties & Units</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalProperties} <span className="text-sm font-normal text-slate-500">props</span></div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{totalUnits} total managed units across GTA & Ottawa</p>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupancy Rate</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{occupancyRate}%</div>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">{occupiedUnits} occupied / {totalUnits - occupiedUnits} vacant units</p>
          </div>
        </div>

        {/* Monthly Rent Collection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rent Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">${rentCollected.toLocaleString()} <span className="text-xs font-normal text-slate-400">CAD</span></div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Outstanding: <span className="text-rose-600 font-bold">${outstandingRent.toLocaleString()} CAD</span>
            </p>
          </div>
        </div>

        {/* Maintenance & Expirations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Maintenance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{openMaintenance} <span className="text-sm font-normal text-slate-500">requests</span></div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{expiringLeases} leases expiring within 90 days</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rent Collection Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Rent Collection Trend (CAD)</h3>
              <p className="text-xs text-slate-500">Expected vs Collected vs Overdue Rent History</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
            >
              View Rent Ledger <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()} CAD`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Collected" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Required Panel (1 Column) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
              </h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {dbState.tasks.filter(t => t.status === 'Pending').length} Pending
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {dbState.tasks.filter(t => t.status === 'Pending').slice(0, 3).map(task => (
                <div key={task.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {task.task_type}
                    </span>
                    <span className="text-[11px] text-slate-400">{task.due_date}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 leading-tight">{task.title}</h4>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('notices')}
            className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            Review Pending Tasks & Notices <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Row 2: Upcoming Lease Expirations & Live Automation Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Lease Expirations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" /> Upcoming Lease Expirations
            </h3>
            <button
              onClick={() => onNavigate('leases')}
              className="text-xs text-brand-600 font-bold hover:underline"
            >
              View All Leases
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2">Tenant</th>
                  <th className="pb-2">Property / Unit</th>
                  <th className="pb-2">Lease End</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbState.leases.slice(0, 4).map(lease => {
                  const tenant = dbState.tenants.find(t => t.id === lease.tenant_id);
                  const unit = dbState.units.find(u => u.id === lease.unit_id);
                  const prop = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
                  return (
                    <tr key={lease.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">{tenant?.first_name} {tenant?.last_name}</td>
                      <td className="py-2.5 text-slate-600">{prop?.name} ({unit?.unit_number})</td>
                      <td className="py-2.5 text-slate-600 font-medium">{lease.end_date}</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {lease.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Automation Activity Log Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" /> Recent Automation Executions
            </h3>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs text-brand-600 font-bold hover:underline"
            >
              View Full Audit Log
            </button>
          </div>

          <div className="space-y-3">
            {dbState.automation_logs.slice(0, 4).map(log => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{log.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Type: <code className="text-slate-600 font-bold">{log.automation_type}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automation Run Feedback Modal */}
      <AutomationRunModal
        result={runResult}
        onClose={() => setRunResult(null)}
        onViewCommunications={() => onNavigate('communications')}
        onViewLogs={() => onNavigate('logs')}
      />
    </div>
  );
};
