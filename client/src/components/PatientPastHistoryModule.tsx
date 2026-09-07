import { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, FileText, CheckCircle, Clock, Activity, Stethoscope } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface PastHistoryEntry {
  id: number;
  condition_name: string;
  condition_category: string;
  diagnosis_year?: string;
  status: 'ongoing' | 'cured' | 'in_remission';
  notes?: string;
  document_name?: string;
  document_path?: string;
}

interface PatientPastHistoryModuleProps {
  patientId: string | number;
}

const CONDITION_STATUS = {
  ongoing: {
    label: 'Ongoing',
    icon: Activity,
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
  cured: {
    label: 'Cured',
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  in_remission: {
    label: 'In Remission',
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
};

const CONDITION_CATEGORIES = [
  { value: 'respiratory', label: '🫁 Respiratory', conditions: [
    'Asthma', 'COPD / Emphysema', 'Chronic Bronchitis', 'Interstitial Lung Disease (ILD)',
    'Idiopathic Pulmonary Fibrosis (IPF)', 'Pulmonary Sarcoidosis', 'Tuberculosis (TB)',
    'Post-TB Sequelae', 'Bronchiectasis', 'Pulmonary Hypertension', 'Obstructive Sleep Apnea (OSA)',
    'Pleural Effusion', 'Pneumothorax', 'Allergic Bronchopulmonary Aspergillosis (ABPA)',
    'Eosinophilic Lung Disease', 'Lung Malignancy', 'Pneumonia (Recurrent)',
  ]},
  { value: 'cardiac', label: '❤️ Cardiac', conditions: [
    'Coronary Artery Disease', 'Heart Failure', 'Atrial Fibrillation', 'Hypertension', 'Valvular Heart Disease',
  ]},
  { value: 'endocrine', label: '⚗️ Endocrine', conditions: [
    'Diabetes Mellitus (Type 1)', 'Diabetes Mellitus (Type 2)', 'Hypothyroidism', 'Hyperthyroidism', 'Obesity',
  ]},
  { value: 'autoimmune', label: '🔬 Autoimmune / Rheumatology', conditions: [
    'Rheumatoid Arthritis', 'Systemic Lupus Erythematosus (SLE)', 'Systemic Sclerosis / Scleroderma',
    'Polymyositis / Dermatomyositis', 'Sjögren Syndrome', 'Vasculitis',
  ]},
  { value: 'gi', label: '🫃 Gastrointestinal', conditions: [
    'GERD / Acid Reflux', 'Peptic Ulcer Disease', 'Liver Disease / Cirrhosis',
  ]},
  { value: 'surgical', label: '✂️ Surgical', conditions: [
    'Thoracic Surgery', 'Lung Resection (Lobectomy / Pneumonectomy)', 'Pleurodesis',
  ]},
  { value: 'allergy', label: '🌸 Allergy', conditions: [
    'Allergic Rhinitis', 'Sinusitis / Nasal Polyposis', 'Drug Allergy', 'Food Allergy',
  ]},
  { value: 'other', label: '📋 Other', conditions: [] },
];

export const PatientPastHistoryModule = ({ patientId }: PatientPastHistoryModuleProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [history, setHistory] = useState<PastHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'cured' | 'in_remission'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newEntry, setNewEntry] = useState({
    condition_name: '',
    condition_category: 'respiratory',
    diagnosis_year: '',
    status: 'ongoing' as 'ongoing' | 'cured' | 'in_remission',
    notes: '',
    document: null as File | null,
  });

  const [customCondition, setCustomCondition] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('respiratory');

  const loadHistory = async () => {
    if (!fetchWithCsrf) return;
    try {
      const r = await fetchWithCsrf(`/api/patients/${patientId}/past-history`);
      const data = await r.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [patientId, fetchWithCsrf]);

  const handleAdd = async () => {
    const condName = newEntry.condition_name || customCondition;
    if (!condName.trim() || !fetchWithCsrf) return;

    const formData = new FormData();
    formData.append('condition_name', condName.trim());
    formData.append('condition_category', newEntry.condition_category);
    formData.append('diagnosis_year', newEntry.diagnosis_year);
    formData.append('status', newEntry.status);
    formData.append('notes', newEntry.notes);
    if (newEntry.document) formData.append('document', newEntry.document);

    try {
      const token = 'ai4care_secure_token_v1';
      await fetch(`/api/patients/${patientId}/past-history`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': token },
        credentials: 'include',
        body: formData,
      });
      setNewEntry({ condition_name: '', condition_category: 'respiratory', diagnosis_year: '', status: 'ongoing', notes: '', document: null });
      setCustomCondition('');
      setShowAddForm(false);
      loadHistory();
    } catch {}
  };

  const handleStatusChange = async (entry: PastHistoryEntry, status: PastHistoryEntry['status']) => {
    if (!fetchWithCsrf) return;
    await fetchWithCsrf(`/api/patients/${patientId}/past-history/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, status }),
    });
    loadHistory();
  };

  const handleDelete = async (id: number) => {
    if (!fetchWithCsrf) return;
    await fetchWithCsrf(`/api/patients/${patientId}/past-history/${id}`, { method: 'DELETE' });
    loadHistory();
  };

  const filteredHistory = history.filter(h => filterStatus === 'all' || h.status === filterStatus);
  const counts = {
    all: history.length,
    ongoing: history.filter(h => h.status === 'ongoing').length,
    cured: history.filter(h => h.status === 'cured').length,
    in_remission: history.filter(h => h.status === 'in_remission').length,
  };

  const currentCategoryConditions = CONDITION_CATEGORIES.find(c => c.value === (newEntry.condition_category || selectedCategory))?.conditions || [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-500" /> Past Medical History
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Previous diagnoses, conditions, and uploaded medical records</p>
        </div>
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Condition
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700 bg-teal-50/40 dark:bg-teal-900/10">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Add Past Medical Condition</h4>
          <div className="grid grid-cols-1 gap-3">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CONDITION_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => { setNewEntry(p => ({ ...p, condition_category: cat.value, condition_name: '' })); setSelectedCategory(cat.value); setCustomCondition(''); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                      newEntry.condition_category === cat.value
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-teal-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition name */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Condition *</label>
              {currentCategoryConditions.length > 0 ? (
                <>
                  <select
                    value={newEntry.condition_name}
                    onChange={e => { setNewEntry(p => ({ ...p, condition_name: e.target.value })); setCustomCondition(''); }}
                    className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select condition...</option>
                    {currentCategoryConditions.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">Other (specify below)</option>
                  </select>
                  {(newEntry.condition_name === '__custom__' || !newEntry.condition_name) && (
                    <input
                      type="text"
                      value={customCondition}
                      onChange={e => setCustomCondition(e.target.value)}
                      placeholder="Type condition name..."
                      className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={customCondition}
                  onChange={e => setCustomCondition(e.target.value)}
                  placeholder="Type condition name..."
                  className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year of Diagnosis</label>
                <input
                  type="text"
                  value={newEntry.diagnosis_year}
                  onChange={e => setNewEntry(p => ({ ...p, diagnosis_year: e.target.value }))}
                  placeholder="e.g. 2020"
                  className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
                <select
                  value={newEntry.status}
                  onChange={e => setNewEntry(p => ({ ...p, status: e.target.value as any }))}
                  className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="cured">Cured</option>
                  <option value="in_remission">In Remission</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</label>
              <textarea
                value={newEntry.notes}
                onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional clinical details..."
                rows={2}
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Upload Document (Optional)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-400 cursor-pointer transition-all group"
              >
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                <span className="text-sm text-slate-400 dark:text-slate-500">
                  {newEntry.document ? newEntry.document.name : 'PDF, Image (max 10MB)'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => setNewEntry(p => ({ ...p, document: e.target.files?.[0] || null }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-bold hover:bg-teal-600 transition-all">Save Condition</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {(['all', 'ongoing', 'cured', 'in_remission'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              filterStatus === status
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {status !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_STATUS[status]?.dot}`} />}
            {status === 'all' ? 'All' : CONDITION_STATUS[status].label}
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{counts[status]}</span>
          </button>
        ))}
      </div>

      {/* History Cards */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No past history recorded</p>
            <p className="text-xs mt-1">Click "Add Condition" to begin</p>
          </div>
        ) : (
          filteredHistory.map(entry => {
            const cfg = CONDITION_STATUS[entry.status];
            const Icon = cfg.icon;
            const catInfo = CONDITION_CATEGORIES.find(c => c.value === entry.condition_category);
            return (
              <div key={entry.id} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} group transition-all`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    entry.status === 'cured' ? 'text-emerald-500' :
                    entry.status === 'in_remission' ? 'text-amber-500' : 'text-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{entry.condition_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      {catInfo && <span className="text-[10px] text-slate-400">{catInfo.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {entry.diagnosis_year && <span>Diagnosed: {entry.diagnosis_year}</span>}
                    </div>
                    {entry.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic">{entry.notes}</p>}
                    {entry.document_name && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <FileText className="w-3.5 h-3.5 text-teal-500" />
                        <a
                          href={`/uploads/patient_docs/${entry.document_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {entry.document_name}
                        </a>
                      </div>
                    )}

                    {/* Status Change Actions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.status !== 'ongoing' && (
                        <button
                          onClick={() => handleStatusChange(entry, 'ongoing')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-200 transition-all"
                        >
                          Mark Ongoing
                        </button>
                      )}
                      {entry.status !== 'cured' && (
                        <button
                          onClick={() => handleStatusChange(entry, 'cured')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-200 transition-all"
                        >
                          ✓ Mark Cured
                        </button>
                      )}
                      {entry.status !== 'in_remission' && (
                        <button
                          onClick={() => handleStatusChange(entry, 'in_remission')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-200 transition-all"
                        >
                          In Remission
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
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
