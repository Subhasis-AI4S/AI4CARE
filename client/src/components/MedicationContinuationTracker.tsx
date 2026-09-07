import { useState, useEffect } from 'react';
import { Plus, X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface HomeMedication {
  id: number;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  prescribed_by?: string;
  start_date?: string;
  continuation_status: 'continuing' | 'stopped' | 'adjusted';
  stop_date?: string;
  stop_reason?: string;
  notes?: string;
}

interface MedicationContinuationTrackerProps {
  patientId: string | number;
}

const STATUS_CONFIG = {
  continuing: {
    label: 'Continuing',
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  stopped: {
    label: 'Stopped',
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
  adjusted: {
    label: 'Dose Adjusted',
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
};

const STOP_REASONS = [
  'Adverse effects / Side effects',
  'Ineffective / Poor response',
  'Condition resolved / Cured',
  'Patient non-compliance / Cost',
  'Alternative medication prescribed',
  'Drug interaction concerns',
  'Pre-procedure discontinuation',
  'Other (see notes)',
];

export const MedicationContinuationTracker = ({ patientId }: MedicationContinuationTrackerProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [medications, setMedications] = useState<HomeMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'continuing' | 'stopped' | 'adjusted'>('all');

  const [newMed, setNewMed] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    prescribed_by: '',
    start_date: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState<Partial<HomeMedication>>({});

  const loadMedications = async () => {
    if (!fetchWithCsrf) return;
    try {
      const r = await fetchWithCsrf(`/api/patients/${patientId}/home-medications`);
      const data = await r.json();
      setMedications(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadMedications();
  }, [patientId, fetchWithCsrf]);

  const handleAddMedication = async () => {
    if (!newMed.medication_name.trim() || !fetchWithCsrf) return;
    await fetchWithCsrf(`/api/patients/${patientId}/home-medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMed),
    });
    setNewMed({ medication_name: '', dosage: '', frequency: '', route: 'oral', prescribed_by: '', start_date: '', notes: '' });
    setShowAddForm(false);
    loadMedications();
  };

  const handleUpdateStatus = async (med: HomeMedication, status: HomeMedication['continuation_status'], extra?: Partial<HomeMedication>) => {
    if (!fetchWithCsrf) return;
    await fetchWithCsrf(`/api/patients/${patientId}/home-medications/${med.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...med, continuation_status: status, ...extra }),
    });
    loadMedications();
  };

  const handleDelete = async (id: number) => {
    if (!fetchWithCsrf) return;
    await fetchWithCsrf(`/api/patients/${patientId}/home-medications/${id}`, { method: 'DELETE' });
    loadMedications();
  };

  const filteredMeds = medications.filter(m => filterStatus === 'all' || m.continuation_status === filterStatus);

  const counts = {
    all: medications.length,
    continuing: medications.filter(m => m.continuation_status === 'continuing').length,
    stopped: medications.filter(m => m.continuation_status === 'stopped').length,
    adjusted: medications.filter(m => m.continuation_status === 'adjusted').length,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Home Medications</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track current medications and continuation status</p>
        </div>
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Medication
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-teal-50/50 dark:bg-teal-900/10">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">New Home Medication</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 dark:text-slate-400">Medication Name *</label>
              <input
                type="text"
                value={newMed.medication_name}
                onChange={e => setNewMed(p => ({ ...p, medication_name: e.target.value }))}
                placeholder="e.g. Budesonide Inhaler"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Dosage</label>
              <input type="text" value={newMed.dosage} onChange={e => setNewMed(p => ({ ...p, dosage: e.target.value }))} placeholder="e.g. 200mcg" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Frequency</label>
              <input type="text" value={newMed.frequency} onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))} placeholder="e.g. BD" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Route</label>
              <select value={newMed.route} onChange={e => setNewMed(p => ({ ...p, route: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="oral">Oral</option>
                <option value="inhaled">Inhaled</option>
                <option value="nebulized">Nebulized</option>
                <option value="subcutaneous">Subcutaneous</option>
                <option value="intravenous">Intravenous</option>
                <option value="intranasal">Intranasal</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Start Date</label>
              <input type="date" value={newMed.start_date} onChange={e => setNewMed(p => ({ ...p, start_date: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Prescribed By</label>
              <input type="text" value={newMed.prescribed_by} onChange={e => setNewMed(p => ({ ...p, prescribed_by: e.target.value }))} placeholder="Doctor name" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddMedication} className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-bold hover:bg-teal-600 transition-all">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {(['all', 'continuing', 'stopped', 'adjusted'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all capitalize ${
              filterStatus === status
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {status !== 'all' && (
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status]?.dot}`} />
            )}
            {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Medication Cards */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading medications...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No {filterStatus !== 'all' ? filterStatus : ''} medications found</p>
          </div>
        ) : (
          filteredMeds.map(med => {
            const cfg = STATUS_CONFIG[med.continuation_status];
            const Icon = cfg.icon;
            const isEditing = editingId === med.id;

            return (
              <div key={med.id} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} transition-all`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    med.continuation_status === 'continuing' ? 'text-emerald-500' :
                    med.continuation_status === 'stopped' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{med.medication_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {med.dosage && <span>{med.dosage}</span>}
                      {med.frequency && <span className="font-medium text-slate-600 dark:text-slate-300">{med.frequency}</span>}
                      {med.route && <span className="italic">({med.route})</span>}
                      {med.prescribed_by && <span>Rx: {med.prescribed_by}</span>}
                      {med.start_date && <span>Since: {med.start_date}</span>}
                    </div>
                    {med.continuation_status === 'stopped' && med.stop_reason && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">Reason: {med.stop_reason}</p>
                    )}
                    {med.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{med.notes}</p>}

                    {/* Status Change Quick Actions */}
                    {!isEditing && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {med.continuation_status !== 'continuing' && (
                          <button
                            onClick={() => handleUpdateStatus(med, 'continuing')}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-200 transition-all"
                          >
                            ✓ Mark Continuing
                          </button>
                        )}
                        {med.continuation_status !== 'stopped' && (
                          <button
                            onClick={() => { setEditingId(med.id); setEditForm({ ...med }); }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-200 transition-all"
                          >
                            ✕ Mark Stopped
                          </button>
                        )}
                        {med.continuation_status !== 'adjusted' && (
                          <button
                            onClick={() => handleUpdateStatus(med, 'adjusted')}
                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-200 transition-all"
                          >
                            ⚡ Mark Adjusted
                          </button>
                        )}
                        <button onClick={() => handleDelete(med.id)} className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Stop Reason Picker */}
                    {isEditing && (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Reason for stopping:</label>
                        <select
                          value={editForm.stop_reason || ''}
                          onChange={e => setEditForm(p => ({ ...p, stop_reason: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                        >
                          <option value="">Select reason...</option>
                          {STOP_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleUpdateStatus(med, 'stopped', { stop_date: new Date().toISOString().split('T')[0], stop_reason: editForm.stop_reason });
                              setEditingId(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
                          >
                            Confirm Stop
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
