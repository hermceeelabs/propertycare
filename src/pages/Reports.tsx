import React from 'react';
import { BarChart3, TrendingUp, PieChart, Building2, Wrench, ShieldCheck, DollarSign, ArrowUpRight } from 'lucide-react';
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

  // Property Revenue vs Expense vs Net Profit
  const propertyProfitData = dbState.properties.map(p => {
    const pUnits = dbState.units.filter(u => u.property_id === p.id);
    const revenue = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + u.monthly_rent, 0);
    const pExpenses = (dbState.expenses || []).filter(e => e.property_id === p.id);
    const expense = pExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = revenue - expense;
    return {
      name: p.name.split(' ')[0],
      Revenue: revenue,
      Expenses: Math.round(expense),
      Profit: Math.round(netProfit)
    };
  });

  // Expense by category breakdown
  const expenseCatCounts: Record<string, number> = {};
  (dbState.expenses || []).forEach(e => {
    expenseCatCounts[e.category] = (expenseCatCounts[e.category] || 0) + e.amount;
  });
  const expenseData = Object.entries(expenseCatCounts).map(([name, value]) => ({ name, value: Math.round(value) }));

  const totalRevenue = propertyProfitData.reduce((acc, p) => acc + p.Revenue, 0);
  const totalExpenses = propertyProfitData.reduce((acc, p) => acc + p.Expenses, 0);
  const totalNetProfit = totalRevenue - totalExpenses;
  const avgMargin = totalRevenue > 0 ? Math.round((totalNetProfit / totalRevenue) * 100) : 0;

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics, Unit Economics & Financial Yields</h1>
        <p className="text-sm text-slate-500">Portfolio cash flow, gross rent collections, operating expenses, and net profit margins</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block uppercase">Gross Monthly Revenue</span>
          <span className="text-2xl font-extrabold text-slate-900">${totalRevenue.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-xs text-rose-800 font-semibold block uppercase">Total Operating Expenses</span>
          <span className="text-2xl font-extrabold text-rose-700">-${totalExpenses.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs text-emerald-800 font-semibold block uppercase">Net Operating Income (NOI)</span>
          <span className="text-2xl font-extrabold text-emerald-600">${totalNetProfit.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-brand-200 bg-brand-50/40 shadow-xs">
          <span className="text-xs text-brand-800 font-semibold block uppercase">Portfolio Profit Margin</span>
          <span className="text-2xl font-extrabold text-brand-700">{avgMargin}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Revenue vs Expenses vs Profit by Property */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" /> Revenue vs Expenses vs Profit by Property (CAD)
          </h3>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyProfitData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [`$${value.toLocaleString()} CAD`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold pt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600"></span> Gross Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500"></span> Operating Expenses</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> Net Profit</span>
          </div>
        </div>

        {/* Chart 2: Operating Expenses Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-500" /> Operating Expenditure by Category (CAD)
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()} CAD`, 'Cost']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No expense records logged yet</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {expenseData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                {d.name}: <strong>${d.value.toLocaleString()} CAD</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
