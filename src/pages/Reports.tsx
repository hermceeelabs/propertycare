import React from 'react';
import { BarChart3, TrendingUp, PieChart, Building2, Wrench, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { DatabaseState } from '../services/supabase';

interface ReportsProps {
  dbState: DatabaseState;
}

export const ReportsPage: React.FC<ReportsProps> = ({ dbState }) => {
  // Maintenance by category data
  const maintenanceCatCounts: Record<string, number> = {};
  dbState.maintenance_requests.forEach(m => {
    maintenanceCatCounts[m.category] = (maintenanceCatCounts[m.category] || 0) + 1;
  });
  const maintenanceData = Object.entries(maintenanceCatCounts).map(([name, value]) => ({ name, value }));

  // Property rent distribution data
  const propertyRentData = dbState.properties.map(p => {
    const pUnits = dbState.units.filter(u => u.property_id === p.id);
    const rentTotal = pUnits.reduce((acc, u) => acc + u.monthly_rent, 0);
    return { name: p.name.split(' ')[0], Rent: rentTotal };
  });

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Financial Reports</h1>
        <p className="text-sm text-slate-500">Operational performance, portfolio yield & automation reliability reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Revenue by Property */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" /> Monthly Gross Rent Potential by Property (CAD)
          </h3>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyRentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()} CAD`, 'Monthly Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Rent" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Maintenance by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" /> Maintenance Volume by Trade Category
          </h3>
          <div className="h-64 w-full flex items-center justify-center pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={maintenanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {maintenanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val} Tickets`, 'Category']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
