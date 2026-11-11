import React, { useState, useRef } from 'react';
import { DatabaseState, store } from '../../services/supabase';
import {
  Home, CreditCard, Wrench, FileText, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ShieldCheck, Upload, Image, X, Eye, Paperclip, LogOut,
  Mic, MicOff, Video, Download, Printer, Bell, Calendar, Phone, Mail,
  User, Building2, Play, Pause, ChevronRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { useCurrency, CurrencyCode } from '../../context/CurrencyContext';
import { MaintenanceAttachment, MaintenancePriority, MaintenanceCategory, MaintenanceStatus } from '../../types/database';
import { DualCurrencyDisplay } from '../../components/DualCurrencyDisplay';

interface TenantPortalProps {
  dbState: DatabaseState;
  tenantId?: string;
  onClosePreview?: () => void;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({
  dbState,
  tenantId = dbState.tenants[0]?.id,
  onClosePreview
}) => {
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'maintenance' | 'documents' | 'notices'>('overview');
  
  // Selected Tenant (for demo/preview selector)
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId);
  const tenant = dbState.tenants.find(t => t.id === selectedTenantId) || dbState.tenants[0];
  const lease = dbState.leases.find(l => l.tenant_id === tenant?.id);
  const unit = dbState.units.find(u => u.id === lease?.unit_id);
  const property = dbState.properties.find(p => p.id === unit?.property_id);

  const tenantPayments = dbState.payments.filter(p => p.tenant_id === tenant?.id);
  const tenantRequests = dbState.maintenance_requests.filter(m => m.tenant_id === tenant?.id);

  const nativeCurr: CurrencyCode =
    property?.acquisition?.acquisition_currency ||
    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

  // Maintenance Form State
  const [newRequestDesc, setNewRequestDesc] = useState('');
  const [newRequestCategory, setNewRequestCategory] = useState<MaintenanceCategory>('Plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('Normal');
  const [attachments, setAttachments] = useState<MaintenanceAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  
  // Voicenote audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Modal viewer state for full-screen receipts / media
  const [activeMediaModal, setActiveMediaModal] = useState<{
    type: 'image' | 'video' | 'audio' | 'receipt' | 'doc';
    url: string;
    title: string;
    metadata?: any;
  } | null>(null);

  // Voicenote Recorder Start
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Audio recording is not supported in this browser environment. You can upload an audio file directly.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          const newAtt: MaintenanceAttachment = {
            id: `att-voice-${Date.now()}`,
            name: `Voicenote_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            url: base64Url,
            type: 'audio/webm',
            size: audioBlob.size,
            uploaded_at: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAtt]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      alert('Unable to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // File Upload Handlers (Photos, Videos, PDFs, Voice memos)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        const newAttachment: MaintenanceAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url: base64Url,
          type: file.type || 'application/octet-stream',
          size: file.size,
          uploaded_at: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestDesc.trim()) return;

    setIsSubmitting(true);
    try {
      const newRequest: any = {
        id: `MNT-${Date.now().toString().slice(-6)}`,
        property_id: property?.id || '',
        unit_id: unit?.id || '',
        tenant_id: tenant?.id || '',
        title: `${newRequestCategory} Issue`,
        description: newRequestDesc.trim(),
        category: newRequestCategory,
        priority: priority,
        status: 'New' as MaintenanceStatus,
        cost: 0,
        currency: nativeCurr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reported_date: new Date().toISOString().split('T')[0],
        attachments: attachments
      };

      if (store.addMaintenanceRequest) {
        await store.addMaintenanceRequest(newRequest);
      }

      setTicketSubmitted(true);
      setNewRequestDesc('');
      setAttachments([]);
      setTimeout(() => {
        setTicketSubmitted(false);
        setActiveTab('maintenance');
      }, 2500);
    } catch (err) {
      console.error('Error submitting request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceipt = (payment: any) => {
    setActiveMediaModal({
      type: 'receipt',
      url: '',
      title: `Official Digital Receipt #${payment.id}`,
      metadata: payment
    });
  };

  // Mock Circulars & Official Building Notices
  const buildingNotices = [
    {
      id: 'NOT-2026-004',
      title: 'Quarterly Central HVAC & Filter Servicing Schedule',
      date: '2026-11-08',
      type: 'Maintenance Advisory',
      priority: 'Routine',
      body: 'Please be advised that authorized HVAC engineers will inspect air handlers and replace HEPA filters for all occupied residences on Wednesday between 10:00 AM and 2:00 PM.'
    },
    {
      id: 'NOT-2026-003',
      title: 'Fiber Optic High-Speed Backbone Maintenance Notice',
      date: '2026-10-25',
      type: 'Utility Notification',
      priority: 'Important',
      body: 'Building telecommunication providers will perform scheduled infrastructure upgrades to enhance internal speeds. Expected downtime is under 15 minutes during early morning hours.'
    },
    {
      id: 'NOT-2026-002',
      title: 'Underground Parking Bay Resurfacing & Bay Cleanout',
      date: '2026-10-12',
      type: 'Facility Update',
      priority: 'General',
      body: 'Basement parking level B1 will undergo deep floor power-washing and bay line restriping. Please ensure personal items are cleared from designated bays.'
    }
  ];

  return (
    <div className="flex h-screen bg-[#fdfbf7] text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION - Dark Slate Signature */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-20 shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif text-slate-950 font-bold text-lg shadow-md shadow-amber-500/20">
                P
              </div>
              <div>
                <span className="font-serif text-lg tracking-tight font-bold text-slate-100 block leading-tight">
                  PropertyFlow
                </span>
                <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                  Resident Portal
                </span>
              </div>
            </div>
            {onClosePreview && (
              <button
                onClick={onClosePreview}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Exit Preview"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Resident Quick Profile Card */}
          <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-amber-300 font-bold text-sm">
                {tenant ? `${tenant.first_name[0]}${tenant.last_name[0]}` : 'JD'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold truncate text-slate-100">
                  {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Resident'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {unit ? `Unit ${unit.unit_number}` : 'Assigned Unit'} · {property?.name || 'Property'}
                </div>
              </div>
            </div>

            {/* Resident switcher for demo if multiple exist */}
            {dbState.tenants.length > 1 && (
              <div className="mt-3 pt-2.5 border-t border-slate-700/50">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Preview As Resident:
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-amber-400"
                >
                  {dbState.tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4" />
                <span>Home & Tenancy</span>
              </div>
              {activeTab === 'overview' && <ChevronRight className="w-4 h-4 opacity-75" />}
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'payments'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4" />
                <span>Rent & Receipts</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'payments' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {tenantPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4" />
                <span>Support & Repairs</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'maintenance' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {tenantRequests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'documents'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Lease Vault</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('notices')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'notices'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <span>Official Notices</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Resident
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
              v3.2
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto bg-[#fdfbf7] p-8">
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-stone-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
                Official Tenancy Space
              </span>
              <span className="inline-block w-1 h-1 rounded-full bg-stone-300"></span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active & Good Standing
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'Resident Executive Suite'}
              {activeTab === 'payments' && 'Rent Ledger & Digital Receipts'}
              {activeTab === 'maintenance' && 'Maintenance & Repair Requests'}
              {activeTab === 'documents' && 'Executed Lease Agreements & Vault'}
              {activeTab === 'notices' && 'Building Circulars & Official Notices'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-stone-200 px-3.5 py-1.5 rounded-xl text-right shadow-sm">
              <div className="text-[10px] uppercase font-bold text-stone-400">Residence Address</div>
              <div className="text-xs font-semibold text-slate-800">
                Unit {unit?.unit_number || 'N/A'}, {property?.name || 'Property'}
              </div>
            </div>
          </div>
        </header>

        {/* TAB 1: OVERVIEW & RESIDENCE DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Contracted Monthly Rent
                  </span>
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-200">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  <DualCurrencyDisplay
                    amount={unit?.monthly_rent || 0}
                    nativeCurrency={nativeCurr}
                    primaryClassName="text-2xl font-bold font-mono text-slate-900"
                    secondaryClassName="text-xs text-stone-500 mt-1"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Next cycle due on the 1st of every month
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Active Lease Term
                  </span>
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {lease ? `${lease.start_date} to ${lease.end_date}` : 'Ongoing 1-Year Term'}
                </div>
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  {lease?.status || 'Active'} Tenancy · Verified Compliance
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Open Repair Tickets
                  </span>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {tenantRequests.filter(r => r.status !== 'Completed').length} Pending
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  {tenantRequests.filter(r => r.status === 'Completed').length} resolved historically
                </p>
              </div>
            </div>

            {/* Quick Actions & Property Contacts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Residence Profile */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <h2 className="font-serif text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  Your Assigned Residence
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                    <div className="text-xs text-stone-400 font-medium">Estate / Building</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{property?.name || 'Grand Estate'}</div>
                    <div className="text-xs text-stone-500">{property?.address || 'Prime City Location'}</div>
                  </div>
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                    <div className="text-xs text-stone-400 font-medium">Unit & Layout</div>
                    <div className="font-semibold text-slate-800 mt-0.5">Unit {unit?.unit_number} · {unit?.bedrooms}BR / {unit?.bathrooms}BA</div>
                    <div className="text-xs text-stone-500">{unit?.square_feet ? `${unit.square_feet} sq ft` : 'Spacious Floorplan'}</div>
                  </div>
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                    <div className="text-xs text-stone-400 font-medium">Resident Primary Contact</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{tenant?.first_name} {tenant?.last_name}</div>
                    <div className="text-xs text-stone-500">{tenant?.phone} · {tenant?.email}</div>
                  </div>
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                    <div className="text-xs text-stone-400 font-medium">Emergency Facilities Line</div>
                    <div className="font-semibold text-slate-800 mt-0.5">Building Concierge 24/7</div>
                    <div className="text-xs text-stone-500">+1 (800) 555-FLOW · support@propertyflow.com</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-stone-100">
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Submit Repair Ticket
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    View Payment Receipts
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="px-4 py-2 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download Lease Agreement
                  </button>
                </div>
              </div>

              {/* Right Col: Latest Circulars */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      Building Bulletins
                    </h3>
                    <button
                      onClick={() => setActiveTab('notices')}
                      className="text-xs font-semibold text-amber-700 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {buildingNotices.slice(0, 2).map((notice) => (
                      <div key={notice.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                          <span className="font-semibold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded">
                            {notice.type}
                          </span>
                          <span>{notice.date}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{notice.title}</div>
                        <p className="text-[11px] text-stone-600 mt-1 line-clamp-2">{notice.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500">
                  Estate management broadcasts are verified and logged in compliance with residential tenancy laws.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RENT LEDGER & DIGITAL RECEIPTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-3">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900">Official Payment History & Receipts</h2>
                  <p className="text-xs text-stone-500">
                    All completed rent, service charge, and security deposit transactions with cryptographic receipt references.
                  </p>
                </div>
                <div className="text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                  Total Records: <strong>{tenantPayments.length}</strong>
                </div>
              </div>

              {tenantPayments.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payment records currently filed for this resident account.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3">Receipt / Payment ID</th>
                        <th className="py-3 px-3">Payment Date</th>
                        <th className="py-3 px-3">Payment Type</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                        <th className="py-3 px-3">Channel / Method</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-slate-700">
                      {tenantPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-semibold text-slate-900">
                            {p.id}
                          </td>
                          <td className="py-3.5 px-3">{p.payment_date || 'N/A'}</td>
                          <td className="py-3.5 px-3 font-medium">
                            {p.payment_type || 'Monthly Rent'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                            <DualCurrencyDisplay
                              amount={p.amount || p.amount_due || 0}
                              sourceCurrency={p.currency || nativeCurr}
                              amountClassName="font-bold font-mono"
                            />
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                              {p.payment_method || 'Direct Bank Wire'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => openReceipt(p)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-amber-600" />
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MAINTENANCE, REPAIRS & MULTI-MEDIA ATTACHMENTS */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            {/* Create New Request Card with Audio/Video/Photo attachments */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <h2 className="font-serif text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                Report an Issue or Maintenance Request
              </h2>
              <p className="text-xs text-stone-500 mb-6">
                Direct dispatch to building engineering and facility managers. Attach live voicenotes, videos, or photos for accurate diagnostics.
              </p>

              {ticketSubmitted && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-sm animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Maintenance Request Logged Successfully!</span> Dispatch notification sent to property management.
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Service Category
                    </label>
                    <select
                      value={newRequestCategory}
                      onChange={(e) => setNewRequestCategory(e.target.value as MaintenanceCategory)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="Plumbing">Plumbing & Water Fixtures</option>
                      <option value="Electrical">Electrical, Lighting & Power</option>
                      <option value="HVAC">Air Conditioning & Climate</option>
                      <option value="Structural">Structural & Carpentry</option>
                      <option value="Appliance">Kitchen & Built-in Appliances</option>
                      <option value="General">General Facility Inquiry</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Urgency Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="Low">Low - Cosmetic / Routine</option>
                      <option value="Normal">Normal - Standard Priority (24-48 hrs)</option>
                      <option value="High">High - Impaired Use of Facility</option>
                      <option value="Emergency">Urgent - Emergency Water / Power Risk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Description of Issue
                  </label>
                  <textarea
                    rows={3}
                    value={newRequestDesc}
                    onChange={(e) => setNewRequestDesc(e.target.value)}
                    placeholder="Provide specific details (e.g. Master bathroom sink drain is leaking water into the under-sink vanity cupboard)..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 resize-none font-medium"
                    required
                  />
                </div>

                {/* ATTACHMENT SUITE: LIVE VOICENOTE + PHOTOS + VIDEOS */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Multi-Media Diagnostic Evidence (Audio Voicenotes, Photos, Videos)
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Voicenote Record Button */}
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Record Voicenote
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        Stop Recording ({recordingDuration}s)
                      </button>
                    )}

                    {/* File Upload Button (Photo/Video/Doc) */}
                    <label className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      Attach Media / Files
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <span className="text-[11px] text-stone-400 italic">
                      Supports voice memos, MP4/MOV videos, JPEG/PNG photos, and PDF documents
                    </span>
                  </div>

                  {/* Attachment Thumbnails & Audio Players */}
                  {attachments.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {attachments.map((att) => {
                        const isAudio = att.type?.includes('audio') || att.name.endsWith('.webm') || att.name.endsWith('.mp3');
                        const isVideo = att.type?.includes('video') || att.name.endsWith('.mp4');
                        const isImg = att.type?.includes('image');

                        return (
                          <div
                            key={att.id}
                            className="relative group p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col justify-between"
                          >
                            <button
                              type="button"
                              onClick={() => removeAttachment(att.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 z-10"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>

                            <div className="h-20 w-full flex items-center justify-center bg-stone-100 rounded-lg overflow-hidden mb-2">
                              {isImg ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => setActiveMediaModal({ type: 'image', url: att.url, title: att.name })}
                                />
                              ) : isVideo ? (
                                <div
                                  onClick={() => setActiveMediaModal({ type: 'video', url: att.url, title: att.name })}
                                  className="flex flex-col items-center justify-center cursor-pointer text-stone-600 hover:text-amber-600"
                                >
                                  <Video className="w-6 h-6 mb-1" />
                                  <span className="text-[9px] font-bold">Watch Video</span>
                                </div>
                              ) : isAudio ? (
                                <div
                                  onClick={() => setActiveMediaModal({ type: 'audio', url: att.url, title: att.name })}
                                  className="flex flex-col items-center justify-center cursor-pointer text-red-600 hover:text-red-700"
                                >
                                  <Mic className="w-6 h-6 mb-1" />
                                  <span className="text-[9px] font-bold">Play Voicenote</span>
                                </div>
                              ) : (
                                <FileText className="w-6 h-6 text-stone-400" />
                              )}
                            </div>

                            <div className="text-[10px] truncate font-medium text-slate-700" title={att.name}>
                              {att.name}
                            </div>
                            <div className="text-[9px] text-stone-400">
                              {(att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'Media')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newRequestDesc.trim()}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    {isSubmitting ? 'Logging Ticket...' : 'Submit Maintenance Request'}
                  </button>
                </div>
              </form>
            </div>

            {/* List of Previous Requests */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <h3 className="font-serif text-base font-bold text-slate-900 mb-4">
                Service Request History & Status
              </h3>

              {tenantRequests.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No active or past repair tickets for this residence.
                </div>
              ) : (
                <div className="space-y-4">
                  {tenantRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{req.id}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                            {req.category}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.priority === 'Urgent'
                              ? 'bg-red-100 text-red-800'
                              : req.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          {req.description}
                        </p>
                        <div className="text-[10px] text-stone-400">
                          Reported on {req.reported_date || req.created_at?.split('T')[0]}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {req.attachments && req.attachments.length > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-1 rounded-lg text-[11px] text-stone-600">
                            <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                            <span>{req.attachments.length} Attachment{req.attachments.length > 1 ? 's' : ''}</span>
                          </div>
                        )}

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          req.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEASE VAULT & LEGAL DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900">Executed Tenancy Documents</h2>
                  <p className="text-xs text-stone-500">
                    Legally binding tenancy contracts, inventory sign-off, and inspection protocols.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Cryptographically Verified
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Master Lease Agreement */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Master Residential Tenancy Agreement</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Term: {lease ? `${lease.start_date} — ${lease.end_date}` : 'Active Period'}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-mono">
                        Ref: LEASE-{lease?.id || '2026-ACTIVE'} · PDF (2.4 MB)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Downloading official executed tenancy contract PDF...')}
                    className="p-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-slate-700 transition-colors"
                    title="Download Contract"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Move-in Condition & Inventory Report */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Move-In Inspection & Inventory Sign-Off</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        High-definition room condition audit & key schedule
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-mono">
                        Ref: INV-INSPECT-2026 · PDF (4.1 MB)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Downloading move-in condition report...')}
                    className="p-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-slate-700 transition-colors"
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Building Rules & Regulations */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-stone-200 text-slate-800 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Estate Bylaws & Resident Handbook</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Quiet hours, parking protocols, waste management & safety
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-mono">
                        Ref: BYLAW-ESTATE-V2 · PDF (1.1 MB)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Downloading estate handbook...')}
                    className="p-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-slate-700 transition-colors"
                    title="Download Handbook"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Certificate of Clean Tenancy */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Certificate of Tenancy Good Standing</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Official verification letter for banking or immigration use
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-mono">
                        Ref: CERT-STAND-092 · PDF (0.5 MB)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Generating verified tenancy standing letter...')}
                    className="p-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-slate-700 transition-colors"
                    title="Download Certificate"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BUILDING CIRCULARS & OFFICIAL NOTICES */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900">Official Circulars & Community Notices</h2>
                  <p className="text-xs text-stone-500">
                    Important alerts, service schedules, and building administration advisories.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {buildingNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{notice.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {notice.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {notice.date}
                        </span>
                        <span className="font-mono text-[11px] text-stone-400">#{notice.id}</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {notice.body}
                    </p>

                    <div className="text-[11px] text-stone-400 pt-2 flex items-center justify-between">
                      <span>Issued by: Facility Operations & Concierge Desk</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Delivered to Resident
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL VIEWER: RECEIPT / FULL MEDIA / VOICENOTE PLAYBACK */}
      {activeMediaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden">
            <button
              onClick={() => setActiveMediaModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* RECEIPT VIEW */}
            {activeMediaModal.type === 'receipt' && (
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-stone-200">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2 font-bold font-serif text-xl">
                    ✓
                  </div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">Official Electronic Receipt</h3>
                  <div className="text-xs text-stone-500 font-mono mt-0.5">
                    Transaction Ref: {activeMediaModal.metadata?.id}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Resident Name</span>
                    <span className="font-semibold text-slate-800">{tenant?.first_name} {tenant?.last_name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Residence</span>
                    <span className="font-semibold text-slate-800">Unit {unit?.unit_number}, {property?.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Payment Date</span>
                    <span className="font-semibold text-slate-800">{activeMediaModal.metadata?.payment_date}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Payment Purpose</span>
                    <span className="font-semibold text-slate-800">{activeMediaModal.metadata?.payment_type || 'Monthly Rent'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Payment Channel</span>
                    <span className="font-semibold text-slate-800">{activeMediaModal.metadata?.payment_method || 'Direct Wire Transfer'}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-stone-50 px-3 rounded-xl">
                    <span className="font-bold text-slate-800">Amount Tendered</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      <DualCurrencyDisplay
                        amount={activeMediaModal.metadata?.amount || activeMediaModal.metadata?.amount_due || 0}
                        sourceCurrency={activeMediaModal.metadata?.currency || nativeCurr}
                        amountClassName="font-bold font-mono text-emerald-700 text-sm"
                      />
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Receipt
                  </button>
                  <button
                    onClick={() => setActiveMediaModal(null)}
                    className="py-2.5 px-4 bg-stone-100 text-stone-700 font-semibold rounded-xl text-xs hover:bg-stone-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* IMAGE PREVIEW */}
            {activeMediaModal.type === 'image' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 truncate pr-6">{activeMediaModal.title}</h3>
                <img
                  src={activeMediaModal.url}
                  alt={activeMediaModal.title}
                  className="max-h-[60vh] w-auto mx-auto rounded-xl object-contain border border-stone-200"
                />
              </div>
            )}

            {/* VIDEO PREVIEW */}
            {activeMediaModal.type === 'video' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 truncate pr-6">{activeMediaModal.title}</h3>
                <video
                  controls
                  src={activeMediaModal.url}
                  className="max-h-[60vh] w-full rounded-xl bg-black"
                />
              </div>
            )}

            {/* AUDIO VOICENOTE PREVIEW */}
            {activeMediaModal.type === 'audio' && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Mic className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-slate-900">{activeMediaModal.title}</h3>
                <p className="text-xs text-stone-500">Audio diagnostic recording attached to maintenance report</p>
                <div className="pt-2">
                  <audio controls src={activeMediaModal.url} className="w-full" autoPlay />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
