import React, { useState, useRef, useEffect } from 'react';
import {
  Truck, Wrench, MapPin, Phone, User, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Eye, Check, X, Building2, Home,
  LayoutDashboard, DollarSign, Receipt, ShieldCheck, Mail, Upload, Plus,
  LogOut, Paperclip, Sparkles, ChevronRight, Search, Filter, Edit3, Lock
} from 'lucide-react';
import { DatabaseState, store, supabase } from '../../services/supabase';
import {
  MaintenanceRequest, Vendor, Property, Unit, Bill, Expense,
  MaintenanceAttachment, MaintenanceStatus, CurrencyCode
} from '../../types/database';
import { useCurrency, CURRENCIES } from '../../context/CurrencyContext';
import { PortalMediaModal, PortalMediaItem } from '../../components/PortalMediaModal';

export type ContractorNavTab = 'overview' | 'work_orders' | 'schedule' | 'invoices' | 'sites' | 'profile';

interface ContractorPortalProps {
  dbState: DatabaseState;
  vendorId?: string;
  onClosePreview?: () => void;
}

export const ContractorPortal: React.FC<ContractorPortalProps> = ({
  dbState,
  vendorId = dbState.vendors[0]?.id,
  onClosePreview
}) => {
  const { formatMoney, currentCurrency, setCurrency, currencyConfig, convertAmount } = useCurrency();
  const [currentTab, setCurrentTab] = useState<ContractorNavTab>(() => {
    const saved = localStorage.getItem('propertyflow_contractor_tab') as ContractorNavTab;
    const valid: ContractorNavTab[] = ['overview', 'work_orders', 'schedule', 'invoices', 'sites', 'profile'];
    return valid.includes(saved) ? saved : 'overview';
  });

  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId || dbState.vendors[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMediaItem, setActiveMediaItem] = useState<PortalMediaItem | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Interactive Quote & Completion Modal State
  const [selectedOrderForQuote, setSelectedOrderForQuote] = useState<MaintenanceRequest | null>(null);
  const [quoteAmountInput, setQuoteAmountInput] = useState<string>('');
  const [actualCostInput, setActualCostInput] = useState<string>('');
  const [scheduledDateInput, setScheduledDateInput] = useState<string>('');
  const [resolutionNotesInput, setResolutionNotesInput] = useState<string>('');
  const [newOrderAttachments, setNewOrderAttachments] = useState<MaintenanceAttachment[]>([]);

  // Submit New Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDesc, setInvoiceDesc] = useState<string>('');
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Profile Editor State
  const [editCompany, setEditCompany] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServiceArea, setEditServiceArea] = useState('');
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState('');
  const [emailChangeReason, setEmailChangeReason] = useState('');

  const mainScrollRef = useRef<HTMLElement>(null);

  const vendor: Vendor =
    (dbState.vendors || []).find(v => v.id === (vendorId || selectedVendorId)) ||
    dbState.vendors[0] || {
      id: 'vendor-1',
      name: 'Marcus Vance',
      company: 'Apex Mechanical & Plumbing Ltd',
      email: 'service@apexplumbing.com',
      phone: '+1 (416) 555-0149',
      category: 'Plumbing',
      service_area: 'Greater Toronto Area & Lagos Island',
      status: 'Active',
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z'
    };

  useEffect(() => {
    if (vendor) {
      setEditCompany(vendor.company || '');
      setEditContactName(vendor.name || '');
      setEditPhone(vendor.phone || '');
      setEditServiceArea(vendor.service_area || '');
    }
  }, [vendor.id]);

  const handleTabChange = (tab: ContractorNavTab) => {
    setCurrentTab(tab);
    localStorage.setItem('propertyflow_contractor_tab', tab);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // =========================================================================
  // STRICT DATA ISOLATION: ONLY WORK ORDERS, BILLS & SITES FOR THIS VENDOR
  // =========================================================================
  const assignedRequests = (dbState.maintenance_requests || []).filter(
    m => m.vendor_id === vendor.id || m.assigned_vendor_id === vendor.id
  );

  const vendorBills = (dbState.bills || []).filter(b => b.vendor_id === vendor.id);
  const vendorExpenses = (dbState.expenses || []).filter(e => e.vendor_id === vendor.id);

  // Properties & Units where this contractor has active or historical dispatches
  const assignedUnitIds = Array.from(new Set(assignedRequests.map(r => r.unit_id).filter(Boolean)));
  const assignedUnits = (dbState.units || []).filter(u => assignedUnitIds.includes(u.id));
  const assignedPropertyIds = Array.from(
    new Set([
      ...assignedRequests.map(r => r.property_id).filter(Boolean),
      ...assignedUnits.map(u => u.property_id).filter(Boolean),
      ...vendorBills.map(b => b.property_id).filter(Boolean)
    ])
  );
  const assignedProperties = (dbState.properties || []).filter(p => assignedPropertyIds.includes(p.id));

  // Helper: Get property's native currency
  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
  };

  // KPIs
  const activeOrders = assignedRequests.filter(
    r => r.status !== 'Completed' && r.status !== 'Cancelled'
  );
  const emergencyOrders = activeOrders.filter(
    r => r.priority === 'Emergency' || r.priority === 'High' || r.priority === 'Urgent'
  );
  const completedOrders = assignedRequests.filter(r => r.status === 'Completed');

  // Financials converted to active display currency
  const totalApprovedQuotesInCurr = assignedRequests.reduce((sum, r) => {
    const unit = dbState.units.find(u => u.id === r.unit_id);
    const propId = r.property_id || unit?.property_id;
    const native = getPropNativeCurrency(propId);
    const amt = r.actual_cost || r.estimated_cost || 0;
    return sum + convertAmount(amt, native, currentCurrency);
  }, 0);

  const totalPaidInvoicesInCurr = vendorBills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => {
      const native = getPropNativeCurrency(b.property_id);
      return sum + convertAmount(b.amount || 0, native, currentCurrency);
    }, 0);

  const pendingInvoiceAmountInCurr = vendorBills
    .filter(b => b.status !== 'Paid')
    .reduce((sum, b) => {
      const native = getPropNativeCurrency(b.property_id);
      return sum + convertAmount(b.amount || 0, native, currentCurrency);
    }, 0);

  // Filtered Work Orders
  const filteredRequests = assignedRequests.filter(req => {
    if (statusFilter !== 'All') {
      if (statusFilter === 'Open' && (req.status === 'Completed' || req.status === 'Cancelled')) return false;
      if (statusFilter !== 'Open' && req.status !== statusFilter) return false;
    }
    if (priorityFilter !== 'All' && req.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const unit = dbState.units.find(u => u.id === req.unit_id);
      const prop = dbState.properties.find(p => p.id === (req.property_id || unit?.property_id));
      const matchText = `${req.id} ${req.title || ''} ${req.description} ${req.category} ${prop?.name || ''} ${unit?.unit_number || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  // Update ticket status in both store and Supabase
  const handleUpdateTicketStatus = async (requestId: string, newStatus: MaintenanceStatus) => {
    const completedAt = newStatus === 'Completed' ? new Date().toISOString() : undefined;
    store.updateMaintenanceRequest(requestId, {
      status: newStatus,
      ...(completedAt ? { completed_at: completedAt } : {})
    });

    try {
      await supabase
        .from('maintenance_requests')
        .update({
          status: newStatus,
          ...(completedAt ? { completed_at: completedAt } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
    } catch (err) {
      console.warn('Failed to sync contractor ticket status to Supabase:', err);
    }

    showToast(`Work Order #${requestId.slice(0, 8)} marked as "${newStatus}".`);
  };

  // Open Quote / Field Report Modal
  const openOrderUpdateModal = (req: MaintenanceRequest) => {
    setSelectedOrderForQuote(req);
    setQuoteAmountInput(req.estimated_cost ? String(req.estimated_cost) : '');
    setActualCostInput(req.actual_cost ? String(req.actual_cost) : '');
    setScheduledDateInput(req.scheduled_date || new Date().toISOString().split('T')[0]);
    setResolutionNotesInput(req.resolution_notes || '');
    setNewOrderAttachments([]);
  };

  const handleFieldFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        const att: MaintenanceAttachment = {
          id: `att-vendor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: base64Url,
          type: file.type || 'application/pdf',
          size: file.size,
          uploaded_at: new Date().toISOString()
        };
        setNewOrderAttachments(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSaveOrderFieldReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForQuote) return;

    const estCost = quoteAmountInput ? Number(quoteAmountInput) : selectedOrderForQuote.estimated_cost;
    const actCost = actualCostInput ? Number(actualCostInput) : selectedOrderForQuote.actual_cost;
    const mergedAttachments = [
      ...(selectedOrderForQuote.attachments || []),
      ...newOrderAttachments
    ];

    const updates: Partial<MaintenanceRequest> = {
      estimated_cost: estCost,
      actual_cost: actCost,
      scheduled_date: scheduledDateInput || selectedOrderForQuote.scheduled_date,
      resolution_notes: resolutionNotesInput.trim() || selectedOrderForQuote.resolution_notes,
      attachments: mergedAttachments
    };

    store.updateMaintenanceRequest(selectedOrderForQuote.id, updates);

    try {
      await supabase
        .from('maintenance_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderForQuote.id);
    } catch (err) {
      console.warn('Could not sync contractor field report:', err);
    }

    showToast(`Saved quote, schedule & field report for Work Order #${selectedOrderForQuote.id.slice(0, 8)}.`);
    setSelectedOrderForQuote(null);
  };

  // Submit Contractor Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(invoiceAmount);
    if (!numAmt || numAmt <= 0 || !invoiceDesc.trim()) return;

    const linkedOrder = assignedRequests.find(r => r.id === invoiceOrderId) || assignedRequests[0];
    const unit = linkedOrder ? dbState.units.find(u => u.id === linkedOrder.unit_id) : undefined;
    const propId = linkedOrder?.property_id || unit?.property_id || assignedProperties[0]?.id || 'prop-1';

    const newBill: Bill = {
      id: `bill-vendor-${Date.now()}`,
      property_id: propId,
      unit_id: linkedOrder?.unit_id,
      vendor_id: vendor.id,
      bill_number: invoiceNumber.trim() || `INV-${Date.now().toString().slice(-5)}`,
      description: invoiceDesc.trim(),
      amount: numAmt,
      due_date: invoiceDueDate,
      status: 'Pending',
      category: vendor.category as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.addBill(newBill);

    if (linkedOrder) {
      store.updateMaintenanceRequest(linkedOrder.id, {
        actual_cost: numAmt
      });
    }

    setShowInvoiceModal(false);
    setInvoiceAmount('');
    setInvoiceDesc('');
    setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    showToast(`Invoice ${newBill.bill_number} submitted to PropertyFlow Accounting for settlement.`);
  };

  // Save Contractor Profile
  const handleSaveVendorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.updateVendor(vendor.id, {
      company: editCompany.trim() || vendor.company,
      name: editContactName.trim() || vendor.name,
      phone: editPhone.trim() || vendor.phone,
      service_area: editServiceArea.trim() || vendor.service_area
    });
    showToast('Trade contractor profile and dispatch contact details updated.');
  };

  // Submit Email Change Request
  const handleRequestEmailChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedEmail.trim()) return;

    store.addTask({
      id: `task-vendor-email-${Date.now()}`,
      assigned_to: 'Operations Admin',
      task_type: 'Contractor Email Change',
      title: `Contractor Email Update Request: ${vendor.company} (${vendor.email} → ${requestedEmail.trim()})`,
      description: `Trade contractor ${vendor.name} (${vendor.company}) requested a login/dispatch email update.\nNew Email: ${requestedEmail.trim()}\nReason: ${emailChangeReason.trim() || 'Corporate dispatch inbox update'}`,
      priority: 'Normal',
      status: 'Pending',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      related_entity_type: 'Vendor',
      related_entity_id: vendor.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setShowEmailChangeModal(false);
    setRequestedEmail('');
    setEmailChangeReason('');
    showToast('Email change request logged with PropertyFlow Operations Admin.');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('propertyflow_active_tab');
    localStorage.removeItem('propertyflow_contractor_tab');
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Helper to build standard field documents for each work order
  const getWorkOrderDocuments = (req: MaintenanceRequest, prop?: Property, unit?: Unit): PortalMediaItem[] => {
    const native = getPropNativeCurrency(prop?.id || req.property_id);
    const estCost = req.estimated_cost || 450;
    const actCost = req.actual_cost || estCost;
    const amtStr = `${CURRENCIES[native]?.symbol || '$'}${actCost.toLocaleString()} ${native}`;

    const docs: PortalMediaItem[] = [
      {
        type: 'document',
        url: `/documents/work-orders/${req.id}-dispatch-scope.pdf`,
        title: `Dispatch_Work_Order_Scope_${req.id}.pdf`,
        propertyName: prop?.name || 'Portfolio Property',
        unitNumber: unit?.unit_number,
        vendorOrAuditor: `${vendor.company} (${vendor.name})`,
        date: (req.reported_date || req.created_at || '2026-10-15').slice(0, 10),
        amountFormatted: amtStr,
        status: req.status,
        referenceId: `WO-SCOPE-${req.id.toUpperCase()}`,
        caption: `Official trade work order scope for ${req.category}: "${req.description}". Includes site entry protocol, tenant contact authorization, and SLA compliance window.`
      },
      {
        type: 'document',
        url: `/documents/work-orders/${req.id}-quote-estimate.pdf`,
        title: `Contractor_Quote_Estimate_${req.id}.pdf`,
        propertyName: prop?.name || 'Portfolio Property',
        unitNumber: unit?.unit_number,
        vendorOrAuditor: `${vendor.company} (${vendor.name})`,
        date: (req.scheduled_date || req.created_at || '2026-10-16').slice(0, 10),
        amountFormatted: amtStr,
        status: req.status === 'Completed' ? 'Approved & Settled' : 'Ratified Estimate',
        referenceId: `QT-${req.id.toUpperCase()}`,
        caption: `Itemized parts, labor, and call-out estimate submitted by ${vendor.company} for ${req.category} remediation at ${prop?.name || 'site'}${unit ? ` Suite ${unit.unit_number}` : ''}.`
      }
    ];

    if (req.status === 'Completed') {
      docs.push({
        type: 'document',
        url: `/documents/work-orders/${req.id}-completion-certificate.pdf`,
        title: `Completion_SignOff_Certificate_${req.id}.pdf`,
        propertyName: prop?.name || 'Portfolio Property',
        unitNumber: unit?.unit_number,
        vendorOrAuditor: `${vendor.company} (${vendor.name})`,
        date: (req.completed_at || req.updated_at || '2026-10-20').slice(0, 10),
        amountFormatted: amtStr,
        status: 'Completed & Verified',
        referenceId: `CERT-${req.id.toUpperCase()}`,
        caption: req.resolution_notes || `Certified trade completion and safety verification signed off by ${vendor.name} (${vendor.company}).`
      });
    }

    return docs;
  };

  const navSections = [
    {
      title: 'Field Dispatch & Triage',
      items: [
        { id: 'overview' as ContractorNavTab, label: 'Field Command Overview', icon: LayoutDashboard },
        {
          id: 'work_orders' as ContractorNavTab,
          label: 'Work Orders & Dispatches',
          icon: Wrench,
          badge: activeOrders.length > 0 ? `${activeOrders.length}` : undefined
        },
        {
          id: 'schedule' as ContractorNavTab,
          label: 'Service Timetable & SLA',
          icon: Calendar,
          badge: `${assignedRequests.filter(r => !!r.scheduled_date).length}`
        }
      ]
    },
    {
      title: 'Billing & Credentials',
      items: [
        {
          id: 'invoices' as ContractorNavTab,
          label: 'Quotes, Invoices & Ledger',
          icon: Receipt,
          badge: vendorBills.length > 0 ? `${vendorBills.length}` : undefined
        },
        {
          id: 'sites' as ContractorNavTab,
          label: 'Assigned Sites & Contacts',
          icon: Building2,
          badge: `${assignedProperties.length}`
        },
        {
          id: 'profile' as ContractorNavTab,
          label: 'Trade Profile & Compliance',
          icon: ShieldCheck
        }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-cream-100 text-stone-900 font-sans antialiased overflow-hidden">
      {/* =========================================================================
          PERSISTENT SLATE SIDEBAR (Identical Design System to Owner/Landlord/Rep)
          ========================================================================= */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none hidden md:flex">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-900/40">
              PF
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm leading-tight">PropertyFlow</h1>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Contractor Portal</span>
            </div>
          </div>
          {onClosePreview && (
            <button
              onClick={onClosePreview}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Exit Preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trade Vendor Identity Card */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px]">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
            Registered Trade Partner
          </span>
          <span className="font-bold text-stone-100 block truncate mt-0.5">
            {vendor.company}
          </span>
          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {vendor.category} Specialist • {vendor.status}
          </span>
        </div>

        {/* Currency Switcher */}
        <div className="px-3 py-2 mx-3 my-2 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Currency:
          </span>
          <select
            value={currentCurrency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
            title="Switch Operational Currency"
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol.trim()})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {section.title}
              </span>
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                        : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer User Profile & Sign Out */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                {(vendor.name?.[0] || 'C').toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{vendor.name}</span>
                <span className="text-[10px] text-slate-400 truncate block">{vendor.email}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Mobile / Action Header */}
        <header className="bg-cream-50/90 border-b border-cream-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
              <Truck className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{vendor.company}</span>
              <span className="text-stone-300">•</span>
              <span className="text-amber-700">{vendor.category}</span>
            </div>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-stone-500">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              Coverage: <strong className="text-stone-800">{vendor.service_area}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile Tab Switcher */}
            <select
              value={currentTab}
              onChange={(e) => handleTabChange(e.target.value as ContractorNavTab)}
              className="md:hidden bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-800"
            >
              <option value="overview">Field Overview</option>
              <option value="work_orders">Work Orders ({activeOrders.length})</option>
              <option value="schedule">Service Timetable</option>
              <option value="invoices">Invoices & Ledger</option>
              <option value="sites">Assigned Sites</option>
              <option value="profile">Trade Profile</option>
            </select>

            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" /> Submit Trade Invoice
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div className="mx-8 mt-4 p-3.5 rounded-2xl bg-emerald-950 text-emerald-200 border border-emerald-800 flex items-center justify-between text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {toastMsg.text}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Scrollable Viewport */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* =====================================================================
              TAB 1: FIELD COMMAND OVERVIEW
              ===================================================================== */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Contractor Field Command Center
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Real-time work order dispatches, emergency SLA tracking, site access briefs & trade billing for {vendor.company}
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              {/* KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Active Work Orders</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Wrench className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900">{activeOrders.length}</div>
                  <p className="text-xs text-amber-700 font-semibold">
                    {emergencyOrders.length} Priority / Emergency dispatches
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Completed Repairs</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900">{completedOrders.length}</div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    98.4% On-Time SLA Compliance
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Settled Trade Payouts</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900 truncate">
                    {formatMoney(totalPaidInvoicesInCurr || totalApprovedQuotesInCurr)}
                  </div>
                  <p className="text-xs text-stone-500">
                    {vendorBills.filter(b => b.status === 'Paid').length} paid invoices in ledger
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Pending Invoices</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900 truncate">
                    {formatMoney(pendingInvoiceAmountInCurr)}
                  </div>
                  <p className="text-xs text-purple-700 font-semibold">
                    {vendorBills.filter(b => b.status !== 'Paid').length} awaiting remittance
                  </p>
                </div>
              </div>

              {/* Two-Column Action Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Priority Dispatches Column (2 cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Active Field Dispatches Requiring Action
                      </h3>
                      <p className="text-xs text-stone-500">Accept dispatches, update repair progress, or upload completion sign-offs</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('work_orders')}
                      className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      All Work Orders ({assignedRequests.length}) <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {activeOrders.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-stone-700">All assigned work orders are completed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeOrders.slice(0, 4).map(req => {
                        const unit = dbState.units.find(u => u.id === req.unit_id);
                        const prop = dbState.properties.find(p => p.id === (req.property_id || unit?.property_id));
                        const tenant = dbState.tenants.find(t => t.id === req.tenant_id);

                        return (
                          <div
                            key={req.id}
                            className="p-4 bg-stone-50/80 hover:bg-white rounded-2xl border border-stone-200 transition-all space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  req.priority === 'Emergency' || req.priority === 'Urgent'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : req.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {req.priority}
                                </span>
                                <span className="text-xs font-bold text-stone-900">
                                  {prop?.name || 'Property'} • Suite {unit?.unit_number || 'Common'}
                                </span>
                                <span className="text-[11px] text-stone-400 font-mono">#{req.id.slice(0, 8)}</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {req.status}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-stone-800 leading-relaxed">{req.description}</p>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/70 text-[11px] text-stone-600">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-emerald-600" />
                                  {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Site Manager'}
                                </span>
                                {tenant?.phone && (
                                  <a href={`tel:${tenant.phone}`} className="font-bold text-emerald-700 hover:underline flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {tenant.phone}
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openOrderUpdateModal(req)}
                                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  Quote / Field Notes
                                </button>
                                {req.status !== 'In Progress' && (
                                  <button
                                    onClick={() => handleUpdateTicketStatus(req.id, 'In Progress')}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Start Work
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateTicketStatus(req.id, 'Completed')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  Complete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Service Summary & Quick Links */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">SLA Standing</span>
                        <h4 className="font-extrabold text-sm text-white">Preferred Trade Partner</h4>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All emergency dispatches require initial resident phone contact within <strong>2 hours</strong> and site attendance within <strong>24 hours</strong>.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Assigned Assets</span>
                        <strong className="text-base text-white">{assignedProperties.length} Properties</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Serviced Units</span>
                        <strong className="text-base text-amber-400">{assignedUnits.length} Suites</strong>
                      </div>
                    </div>
                  </div>

                  {/* Recent Invoices Mini-Card */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">Recent Trade Invoices</h4>
                      <button
                        onClick={() => handleTabChange('invoices')}
                        className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        View Ledger
                      </button>
                    </div>
                    {vendorBills.length === 0 ? (
                      <p className="text-xs text-stone-400 py-3">No invoices submitted yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {vendorBills.slice(0, 3).map(bill => {
                          const native = getPropNativeCurrency(bill.property_id);
                          const amt = convertAmount(bill.amount, native, currentCurrency);
                          return (
                            <div key={bill.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-2">
                                <strong className="text-stone-900 block truncate">{bill.bill_number}</strong>
                                <span className="text-[11px] text-stone-500 truncate block">{bill.description}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-stone-900 block">{formatMoney(amt)}</span>
                                <span className={`text-[10px] font-bold ${
                                  bill.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                                }`}>
                                  {bill.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: WORK ORDERS & DISPATCHES
              ===================================================================== */}
          {currentTab === 'work_orders' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Work Orders & Field Dispatches
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Manage assigned repair tickets, submit cost estimates, inspect resident evidence & attach completion certificates
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              {/* Filter & Search Bar (Below Separator) */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {['All', 'Open', 'Assigned', 'In Progress', 'Completed'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Emergency">Emergency</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ticket, suite, property..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 w-52 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Work Orders List */}
              <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-stone-200">
                    <Wrench className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs text-stone-500 font-semibold">No work orders match the selected filters.</p>
                  </div>
                ) : (
                  filteredRequests.map(req => {
                    const unit = dbState.units.find(u => u.id === req.unit_id);
                    const property = dbState.properties.find(p => p.id === (req.property_id || unit?.property_id));
                    const tenant = dbState.tenants.find(t => t.id === req.tenant_id);
                    const native = getPropNativeCurrency(property?.id);
                    const quoteAmt = req.actual_cost || req.estimated_cost || 450;
                    const quoteInCurr = convertAmount(quoteAmt, native, currentCurrency);
                    const orderDocs = getWorkOrderDocuments(req, property, unit);
                    const attachments = req.attachments || [];

                    return (
                      <div
                        key={req.id}
                        className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5 hover:border-slate-300 transition-all"
                      >
                        {/* Top Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              req.priority === 'Emergency' || req.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : req.priority === 'High'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {req.priority}
                            </span>
                            <span className="text-xs font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded border border-blue-200">
                              {req.category}
                            </span>
                            <span className="text-xs font-bold text-stone-400 font-mono">
                              Work Order #{req.id}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                              Status: {req.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openOrderUpdateModal(req)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Update Quote / Upload Proof
                            </button>

                            {req.status !== 'Completed' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateTicketStatus(req.id, 'In Progress')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    req.status === 'In Progress'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                  }`}
                                >
                                  In Progress
                                </button>
                                <button
                                  onClick={() => handleUpdateTicketStatus(req.id, 'Completed')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                                </button>
                              </>
                            ) : (
                              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Completed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description & Notes */}
                        <div className="space-y-2">
                          <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                            {req.title ? `${req.title} — ` : ''}{req.description}
                          </h3>
                          {req.admin_notes && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900">
                              <strong className="block text-amber-950 font-bold mb-0.5">Management Dispatch Instructions:</strong>
                              {req.admin_notes}
                            </div>
                          )}
                          {req.resolution_notes && (
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                              <strong className="block text-emerald-950 font-bold mb-0.5">Contractor Field Resolution Log:</strong>
                              {req.resolution_notes}
                            </div>
                          )}
                        </div>

                        {/* Site Location & Resident Contact Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                              <Building2 className="w-3.5 h-3.5 text-brand-600" /> Job Site Location
                            </div>
                            <div className="font-extrabold text-stone-900 text-sm">
                              {property?.name || 'Portfolio Asset'} • Suite {unit?.unit_number || 'General'}
                            </div>
                            <p className="text-stone-600 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              {property ? `${property.address}, ${property.city}, ${property.province}` : 'Address on file'}
                            </p>
                          </div>

                          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                              <User className="w-3.5 h-3.5 text-emerald-600" /> Resident / On-Site Contact
                            </div>
                            <div className="font-extrabold text-stone-900 text-sm">
                              {tenant ? `${tenant.first_name} ${tenant.last_name}` : req.tenant_snapshot?.tenant_name || 'Building Superintendent'}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-0.5">
                              {(tenant?.phone || req.tenant_snapshot?.phone) && (
                                <a
                                  href={`tel:${tenant?.phone || req.tenant_snapshot?.phone}`}
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                                >
                                  <Phone className="w-3.5 h-3.5" /> {tenant?.phone || req.tenant_snapshot?.phone}
                                </a>
                              )}
                              {(tenant?.email || req.tenant_snapshot?.email) && (
                                <a
                                  href={`mailto:${tenant?.email || req.tenant_snapshot?.email}`}
                                  className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium hover:underline"
                                >
                                  <Mail className="w-3.5 h-3.5" /> {tenant?.email || req.tenant_snapshot?.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Official Work Order Documents & Uploaded Media */}
                        <div className="pt-3 border-t border-stone-100 space-y-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                            Attached Work Order Documentation & Field Evidence ({orderDocs.length + attachments.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {orderDocs.map((doc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveMediaItem(doc)}
                                className="px-3 py-1.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-amber-950 transition-all cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[200px]">{doc.title}</span>
                                <Eye className="w-3.5 h-3.5 text-stone-400" />
                              </button>
                            ))}

                            {attachments.map(att => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() =>
                                  setActiveMediaItem({
                                    type: att.type.startsWith('image/')
                                      ? 'photo'
                                      : att.type.startsWith('video/')
                                      ? 'video'
                                      : att.type.startsWith('audio/')
                                      ? 'audio'
                                      : 'document',
                                    url: att.url,
                                    title: att.name,
                                    propertyName: property?.name,
                                    unitNumber: unit?.unit_number,
                                    vendorOrAuditor: vendor.company,
                                    date: (att.uploaded_at || req.created_at).slice(0, 10)
                                  })
                                }
                                className="px-3 py-1.5 bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-900 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate max-w-[180px]">{att.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Footer Metadata */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            Scheduled Attendance: <strong className="text-stone-800">{req.scheduled_date || '2026-11-14 (Standard SLA)'}</strong>
                          </span>
                          <div className="flex items-center gap-4">
                            <span>
                              Approved Quote: <strong className="text-stone-900 font-extrabold">{formatMoney(quoteInCurr)}</strong>
                            </span>
                            <button
                              onClick={() => {
                                setInvoiceOrderId(req.id);
                                setInvoiceAmount(String(quoteAmt));
                                setInvoiceDesc(`${req.category} Remediation — ${property?.name || ''} Suite ${unit?.unit_number || ''} (#${req.id})`);
                                setShowInvoiceModal(true);
                              }}
                              className="text-amber-700 hover:text-amber-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Bill This Work Order
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3: SERVICE TIMETABLE & SLA SCHEDULE
              ===================================================================== */}
          {currentTab === 'schedule' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Service Timetable & SLA Windows
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Chronological dispatch calendar, tenant access windows & target completion deadlines
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Scheduled Field Attendance Roster</h3>
                    <p className="text-xs text-stone-500">Coordinate arrival windows with residents at least 24 hours prior to entry</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {assignedRequests.length} Scheduled Slots
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 bg-stone-50/60 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4">Target Date & Window</th>
                        <th className="py-3.5 px-4">Work Order</th>
                        <th className="py-3.5 px-4">Property & Suite</th>
                        <th className="py-3.5 px-4">Resident Contact</th>
                        <th className="py-3.5 px-4">SLA Priority</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {assignedRequests.map((req, idx) => {
                        const unit = dbState.units.find(u => u.id === req.unit_id);
                        const prop = dbState.properties.find(p => p.id === (req.property_id || unit?.property_id));
                        const tenant = dbState.tenants.find(t => t.id === req.tenant_id);
                        const slotDate = req.scheduled_date || (req.reported_date ? req.reported_date : `2026-11-${String(10 + (idx % 18)).padStart(2, '0')}`);
                        const slotWindow = idx % 2 === 0 ? '09:00 AM – 12:00 PM' : '01:30 PM – 04:30 PM';

                        return (
                          <tr key={req.id} className="hover:bg-stone-50/80">
                            <td className="py-3.5 px-4">
                              <strong className="text-stone-900 block">{slotDate}</strong>
                              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> {slotWindow}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-stone-800 block">#{req.id.slice(0, 8)}</span>
                              <span className="text-stone-500 truncate max-w-[200px] block">{req.category}: {req.description}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <strong className="text-stone-900 block">{prop?.name || 'Portfolio Asset'}</strong>
                              <span className="text-stone-500">Suite {unit?.unit_number || 'Common Area'}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-stone-800 block">
                                {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Building Staff'}
                              </span>
                              {tenant?.phone && (
                                <a href={`tel:${tenant.phone}`} className="text-emerald-700 font-bold hover:underline">
                                  {tenant.phone}
                                </a>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                req.priority === 'Emergency' || req.priority === 'Urgent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.priority === 'High'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {req.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openOrderUpdateModal(req)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                Reschedule / Log
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 4: QUOTES, INVOICES & REMITTANCE LEDGER
              ===================================================================== */}
          {currentTab === 'invoices' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Quotes, Invoices & Remittance Ledger
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Track submitted contractor bills, ratified repair estimates, payment statuses & downloadable tax receipts
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              {/* Action & Summary Bar Below Separator */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Approved Quotes</span>
                    <span className="text-xl font-black text-stone-900">{formatMoney(totalApprovedQuotesInCurr)}</span>
                  </div>
                  <div className="h-8 w-px bg-stone-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Paid Remittances</span>
                    <span className="text-xl font-black text-emerald-700">{formatMoney(totalPaidInvoicesInCurr)}</span>
                  </div>
                  <div className="h-8 w-px bg-stone-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Awaiting Settlement</span>
                    <span className="text-xl font-black text-amber-600">{formatMoney(pendingInvoiceAmountInCurr)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Submit New Contractor Invoice
                </button>
              </div>

              {/* Invoices Table */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-900">Submitted Contractor Invoices ({vendorBills.length})</h3>
                  <span className="text-xs text-stone-500">All figures displayed in {currencyConfig.code}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 bg-stone-50/60 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Property & Scope</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4">Amount ({currencyConfig.code})</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Voucher / Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {vendorBills.map(bill => {
                        const prop = dbState.properties.find(p => p.id === bill.property_id);
                        const native = getPropNativeCurrency(bill.property_id);
                        const amtInCurr = convertAmount(bill.amount, native, currentCurrency);

                        return (
                          <tr key={bill.id} className="hover:bg-stone-50/80">
                            <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{bill.bill_number}</td>
                            <td className="py-3.5 px-4">
                              <strong className="text-stone-900 block">{prop?.name || 'Portfolio Property'}</strong>
                              <span className="text-stone-500">{bill.description}</span>
                            </td>
                            <td className="py-3.5 px-4 text-stone-600 font-medium">{bill.due_date}</td>
                            <td className="py-3.5 px-4 font-black text-stone-900">{formatMoney(amtInCurr)}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                bill.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bill.status === 'Overdue'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {bill.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() =>
                                  setActiveMediaItem({
                                    type: 'document',
                                    url: `/documents/invoices/${bill.bill_number}.pdf`,
                                    title: `Contractor_Tax_Invoice_${bill.bill_number}.pdf`,
                                    propertyName: prop?.name || 'Portfolio Property',
                                    vendorOrAuditor: `${vendor.company} (${vendor.name})`,
                                    date: bill.payment_date || bill.due_date,
                                    amountFormatted: formatMoney(amtInCurr),
                                    status: bill.status,
                                    referenceId: bill.bill_number,
                                    caption: bill.description
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Invoice PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 5: ASSIGNED SITES & ACCESS DIRECTORY
              ===================================================================== */}
          {currentTab === 'sites' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Assigned Properties & Site Access Directory
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Building addresses, mechanical room access codes, active resident contacts & historical site dispatches
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignedProperties.map(prop => {
                  const propRequests = assignedRequests.filter(r => {
                    const u = dbState.units.find(unit => unit.id === r.unit_id);
                    return r.property_id === prop.id || u?.property_id === prop.id;
                  });
                  const propUnits = assignedUnits.filter(u => u.property_id === prop.id);

                  return (
                    <div key={prop.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-stone-900">{prop.name}</h3>
                            <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              {prop.address}, {prop.city}, {prop.province} {prop.postal_code}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {prop.property_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Dispatches</span>
                          <strong className="text-sm text-stone-900">{propRequests.length} Orders</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Serviced Suites</span>
                          <strong className="text-sm text-stone-900">{propUnits.length} Units</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Key / Concierge</span>
                          <strong className="text-sm text-emerald-700">Lockbox Active</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Serviced Suites & Resident Contacts at {prop.name}
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {propUnits.map(u => {
                            const lease = dbState.leases.find(l => l.unit_id === u.id && l.status === 'Active');
                            const tenant = lease ? dbState.tenants.find(t => t.id === lease.tenant_id) : undefined;
                            return (
                              <div key={u.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-stone-900">Suite {u.unit_number}</strong>
                                  <span className="text-stone-400 mx-1.5">•</span>
                                  <span className="text-stone-600">{u.unit_type}</span>
                                </div>
                                {tenant ? (
                                  <a
                                    href={`tel:${tenant.phone}`}
                                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" /> {tenant.first_name} ({tenant.phone})
                                  </a>
                                ) : (
                                  <span className="text-stone-400 text-[11px]">Vacant / Key @ Desk</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 6: TRADE PROFILE & COMPLIANCE CREDENTIALS
              ===================================================================== */}
          {currentTab === 'profile' && (
            <div className="space-y-6">
              {/* Strict Single-Line Title Section */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Trade Profile, Insurance & Dispatch Credentials
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Update company dispatch phone, coverage regions, WSIB / liability certificates & corporate email
                </p>
              </div>
              <hr className="border-t border-slate-800/80" />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Editable Trade Details Form */}
                <form
                  onSubmit={handleSaveVendorProfile}
                  className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <h3 className="font-bold text-base text-stone-900">Registered Contractor Details</h3>
                      <p className="text-xs text-stone-500">Synchronized live with PropertyFlow Operations Dispatch Directory</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Verified Vendor #{vendor.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Registered Trade Company Name</label>
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Lead Field Dispatcher / Contact</label>
                      <input
                        type="text"
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">24/7 Emergency Dispatch Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Geographic Service Area</label>
                      <input
                        type="text"
                        value={editServiceArea}
                        onChange={(e) => setEditServiceArea(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-stone-700 block mb-1">Authenticated Corporate Login Email</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          readOnly
                          value={vendor.email}
                          className="flex-1 px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl font-semibold text-stone-500 cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmailChangeModal(true)}
                          className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold cursor-pointer shrink-0"
                        >
                          Request Email Change
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      Save Contractor Profile
                    </button>
                  </div>
                </form>

                {/* Compliance & Insurance Vault */}
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-stone-900">Compliance & Liability Vault</h3>
                  <p className="text-xs text-stone-500">Mandatory trade credentials verified on file with PropertyFlow Operations</p>

                  <div className="space-y-2.5">
                    {[
                      {
                        title: `Commercial_Liability_Insurance_5M_${vendor.id}.pdf`,
                        subtitle: 'Commercial General Liability ($5,000,000)',
                        status: 'Active through Dec 2026'
                      },
                      {
                        title: `WSIB_Clearance_Certificate_2026_${vendor.id}.pdf`,
                        subtitle: 'Workplace Safety & Insurance Board Clearance',
                        status: 'Verified Good Standing'
                      },
                      {
                        title: `Master_Vendor_SLA_Agreement_${vendor.id}.pdf`,
                        subtitle: 'Master Trade Rate Card & SLA Agreement',
                        status: 'Counter-Signed'
                      }
                    ].map((doc, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-stone-900">{doc.subtitle}</strong>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-[11px] text-emerald-700 font-semibold">{doc.status}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaItem({
                              type: 'document',
                              url: `/documents/compliance/${doc.title}`,
                              title: doc.title,
                              vendorOrAuditor: `${vendor.company} (${vendor.name})`,
                              date: '2026-01-15',
                              status: doc.status,
                              referenceId: `COMP-${vendor.id.toUpperCase()}-0${i + 1}`,
                              caption: `${doc.subtitle} on file for ${vendor.company}.`
                            })
                          }
                          className="text-brand-600 hover:underline font-bold text-[11px] flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Preview Certificate
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL 1: UPDATE QUOTE, SCHEDULE & UPLOAD COMPLETION PROOF
          ========================================================================= */}
      {selectedOrderForQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Update Quote, Schedule & Field Report</h3>
                <p className="text-[11px] text-slate-400">Work Order #{selectedOrderForQuote.id} • {selectedOrderForQuote.category}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForQuote(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderFieldReport} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Estimated Quote</label>
                  <input
                    type="number"
                    value={quoteAmountInput}
                    onChange={(e) => setQuoteAmountInput(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Final Actual Cost</label>
                  <input
                    type="number"
                    value={actualCostInput}
                    onChange={(e) => setActualCostInput(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDateInput}
                    onChange={(e) => setScheduledDateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Technician Field Resolution & Parts Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotesInput}
                  onChange={(e) => setResolutionNotesInput(e.target.value)}
                  placeholder="Describe diagnostics, parts replaced, pressure/safety tests performed..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-stone-700 block">Attach Site Photos, Invoices or Sign-Off PDF</label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl bg-stone-50 cursor-pointer text-stone-600 font-bold">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Upload Photos / PDF Certificates</span>
                  <input type="file" multiple onChange={handleFieldFileUpload} className="hidden" />
                </label>
                {newOrderAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {newOrderAttachments.map(a => (
                      <span key={a.id} className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-900">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForQuote(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Save Field Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SUBMIT CONTRACTOR INVOICE
          ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Submit Trade Contractor Invoice</h3>
                <p className="text-[11px] text-slate-400">Directly posts to PropertyFlow Accounts Payable & Landlord Expense Ledger</p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Link to Dispatched Work Order</label>
                <select
                  value={invoiceOrderId}
                  onChange={(e) => setInvoiceOrderId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                >
                  <option value="">General Portfolio Retainer / Multi-Site Service</option>
                  {assignedRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.id.slice(0, 8)} — {r.category}: {r.description.slice(0, 55)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Invoice Amount *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 650"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Itemized Work & Parts Description *</label>
                <textarea
                  rows={3}
                  required
                  value={invoiceDesc}
                  onChange={(e) => setInvoiceDesc(e.target.value)}
                  placeholder="Include labor hours, replacement parts, and warranty coverage..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold cursor-pointer"
                >
                  Submit Invoice for Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: REQUEST CORPORATE EMAIL CHANGE
          ========================================================================= */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Request Dispatch Email Change</h3>
              <button onClick={() => setShowEmailChangeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRequestEmailChange} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">New Corporate Email *</label>
                <input
                  type="email"
                  required
                  value={requestedEmail}
                  onChange={(e) => setRequestedEmail(e.target.value)}
                  placeholder="dispatch@company.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Reason for Change</label>
                <textarea
                  rows={2}
                  value={emailChangeReason}
                  onChange={(e) => setEmailChangeReason(e.target.value)}
                  placeholder="Updating central dispatch inbox..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailChangeModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rich Document & Media Preview Modal */}
      <PortalMediaModal
        item={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />
    </div>
  );
};
