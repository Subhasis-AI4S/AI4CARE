import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, ChevronDown, Pill, FlaskConical, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface Medication {
  id: number;
  name: string;
  generic_name?: string;
  category?: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  default_duration?: string;
}

interface Investigation {
  id: number;
  name: string;
  category: string;
  sub_category?: string;
  description?: string;
}

interface PrescribedItem {
  id?: number;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  notes?: string;
}

interface PrescriptionTemplateBuilderProps {
  initialMeds?: string[];
  initialTests?: string[];
  onMedsChange: (meds: string[]) => void;
  onTestsChange: (tests: string[]) => void;
}

const INVESTIGATION_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  pft: { label: 'Pulmonary Function Tests', icon: '🫁' },
  imaging: { label: 'Imaging', icon: '🖼️' },
  lab: { label: 'Laboratory Tests', icon: '🧪' },
  sputum: { label: 'Sputum Tests', icon: '🔬' },
  procedure: { label: 'Procedures', icon: '⚕️' },
};

const MEDICATION_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  ics: { label: 'ICS', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  laba: { label: 'LABA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  lama: { label: 'LAMA', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  ics_laba: { label: 'ICS+LABA', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  triple_therapy: { label: 'Triple Therapy', color: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
  saba: { label: 'SABA Rescue', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  nebulization: { label: 'Nebulization', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  oral_steroids: { label: 'Oral Steroids', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  antifibrotic: { label: 'Antifibrotic', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  anti_tb: { label: 'Anti-TB', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  mucolytic: { label: 'Mucolytic', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  ltra: { label: 'LTRA', color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' },
  biologic: { label: 'Biologic', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  antibiotic: { label: 'Antibiotic', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  antihistamine: { label: 'Antihistamine', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  nasal_steroid: { label: 'Nasal Steroid', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  xanthine: { label: 'Xanthine', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  pde4_inhibitor: { label: 'PDE-4 Inhib.', color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  antifungal: { label: 'Antifungal', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  oxygen: { label: 'Oxygen', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  custom: { label: 'Custom', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

export const PrescriptionTemplateBuilder = ({
  initialMeds = [],
  initialTests = [],
  onMedsChange,
  onTestsChange,
}: PrescriptionTemplateBuilderProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [activeTab, setActiveTab] = useState<'medications' | 'investigations'>('medications');

  // Medications state
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<Medication[]>([]);
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedItem[]>([]);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [editingMed, setEditingMed] = useState<number | null>(null);
  const [autoSavingMed, setAutoSavingMed] = useState(false);
  const medSearchRef = useRef<HTMLInputElement>(null);
  const medDropdownRef = useRef<HTMLDivElement>(null);

  // Investigations state
  const [investigationGroups, setInvestigationGroups] = useState<Record<string, Investigation[]>>({});
  const [selectedTests, setSelectedTests] = useState<Investigation[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [selectedInvCategory, setSelectedInvCategory] = useState('all');

  // Load all medications
  useEffect(() => {
    if (!fetchWithCsrf) return;
    fetchWithCsrf('/api/templates/medications')
      .then(r => r.json())
      .then((data: Medication[]) => setAllMedications(data));
  }, [fetchWithCsrf]);

  // Load investigations
  useEffect(() => {
    if (!fetchWithCsrf) return;
    fetchWithCsrf('/api/templates/investigations')
      .then(r => r.json())
      .then(data => setInvestigationGroups(data.grouped || {}));
  }, [fetchWithCsrf]);

  // Initialize from props
  useEffect(() => {
    if (initialMeds.length > 0 && prescribedMeds.length === 0) {
      setPrescribedMeds(initialMeds.map(m => ({ name: m })));
    }
  }, [initialMeds]);

  useEffect(() => {
    if (initialTests.length > 0 && selectedTests.length === 0) {
      setSelectedTests(initialTests.map((t, idx) => ({ id: -(idx + 1), name: t, category: 'custom' })));
    }
  }, [initialTests]);

  // Sync changes back to parent
  useEffect(() => {
    const medStrings = prescribedMeds.map(m => {
      let s = m.name;
      if (m.dosage) s += ` ${m.dosage}`;
      if (m.frequency) s += ` — ${m.frequency}`;
      if (m.duration) s += ` for ${m.duration}`;
      return s;
    });
    onMedsChange(medStrings);
  }, [prescribedMeds]);

  useEffect(() => {
    onTestsChange(selectedTests.map(t => t.name));
  }, [selectedTests]);

  // Fast binary-search style client-side filtering
  const handleMedSearch = useCallback((q: string) => {
    setMedSearch(q);
    if (!q.trim()) {
      setMedResults([]);
      setShowMedDropdown(false);
      return;
    }
    const lower = q.toLowerCase();
    const matches = allMedications
      .filter(m =>
        m.name.toLowerCase().includes(lower) ||
        (m.generic_name || '').toLowerCase().includes(lower)
      )
      .slice(0, 12);
    setMedResults(matches);
    setShowMedDropdown(true);
  }, [allMedications]);

  const addMedication = (med: Medication) => {
    const existing = prescribedMeds.find(m => m.name === med.name);
    if (!existing) {
      const item: PrescribedItem = {
        id: med.id,
        name: med.name,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.default_duration || '',
        route: med.route || 'oral',
      };
      setPrescribedMeds(prev => [...prev, item]);
    }
    setMedSearch('');
    setMedResults([]);
    setShowMedDropdown(false);
  };

  const addCustomMedication = async () => {
    const name = medSearch.trim();
    if (!name || !fetchWithCsrf) return;
    setAutoSavingMed(true);
    try {
      const r = await fetchWithCsrf('/api/templates/medications/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const saved = await r.json();
      addMedication({ id: saved.id, name: saved.name, category: 'custom' });
      // Refresh medications list
      const freshMeds = await fetchWithCsrf('/api/templates/medications').then(r2 => r2.json());
      setAllMedications(freshMeds);
    } catch {}
    setAutoSavingMed(false);
  };

  const removeMed = (idx: number) => {
    setPrescribedMeds(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMedField = (idx: number, field: keyof PrescribedItem, value: string) => {
    setPrescribedMeds(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addInvestigation = (inv: Investigation) => {
    if (!selectedTests.find(t => t.id === inv.id)) {
      setSelectedTests(prev => [...prev, inv]);
    }
  };

  const removeInvestigation = (id: number) => {
    setSelectedTests(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('medications')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all ${
            activeTab === 'medications'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Pill className="w-4 h-4" /> Medications
          {prescribedMeds.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-xs font-bold">
              {prescribedMeds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('investigations')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all ${
            activeTab === 'investigations'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Investigations
          {selectedTests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
              {selectedTests.length}
            </span>
          )}
        </button>
      </div>

      {/* MEDICATIONS TAB */}
      {activeTab === 'medications' && (
        <div className="p-5">
          {/* Search Bar */}
          <div className="relative mb-4" ref={medDropdownRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={medSearchRef}
                  type="text"
                  value={medSearch}
                  onChange={e => handleMedSearch(e.target.value)}
                  onFocus={() => medSearch && setShowMedDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMedDropdown(false), 200)}
                  placeholder="Search medications (e.g. Budesonide, Tiotropium, Montelukast...)"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder-slate-400"
                />
              </div>
              {medSearch.trim() && (
                <button
                  onClick={addCustomMedication}
                  disabled={autoSavingMed}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-bold hover:bg-teal-600 transition-all disabled:opacity-50"
                >
                  {autoSavingMed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Custom
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showMedDropdown && medResults.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                {medResults.map(med => {
                  const cat = MEDICATION_CATEGORY_LABELS[med.category || ''];
                  const alreadyAdded = prescribedMeds.some(m => m.name === med.name);
                  return (
                    <button
                      key={med.id}
                      onMouseDown={() => addMedication(med)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${alreadyAdded ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{med.name}</span>
                          {cat && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                          )}
                          {alreadyAdded && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        {med.generic_name && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{med.generic_name}</p>
                        )}
                        {med.dosage && (
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{med.dosage} • {med.route} • {med.frequency}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prescribed Medications List */}
          {prescribedMeds.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
              <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No medications added yet</p>
              <p className="text-xs mt-1">Search for medications from the respiratory template library above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prescribedMeds.map((med, idx) => (
                <div key={idx} className="group relative bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{med.name}</span>
                        <button
                          onClick={() => setEditingMed(editingMed === idx ? null : idx)}
                          className="text-xs text-teal-500 hover:underline"
                        >
                          {editingMed === idx ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      {editingMed === idx ? (
                        <div className="grid grid-cols-2 gap-2">
                          {(['dosage', 'frequency', 'duration', 'route'] as const).map(field => (
                            <div key={field}>
                              <label className="text-xs text-slate-400 dark:text-slate-500 capitalize">{field}</label>
                              <input
                                type="text"
                                value={med[field] || ''}
                                onChange={e => updateMedField(idx, field, e.target.value)}
                                placeholder={field}
                                className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {med.dosage && <span className="text-xs text-slate-500 dark:text-slate-400">{med.dosage}</span>}
                          {med.frequency && <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">{med.frequency}</span>}
                          {med.duration && <span className="text-xs text-slate-400">for {med.duration}</span>}
                          {med.route && <span className="text-xs text-slate-400 italic">({med.route})</span>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeMed(idx)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INVESTIGATIONS TAB */}
      {activeTab === 'investigations' && (
        <div className="p-5">
          {/* Category + Search Filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="Search investigations..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
              />
            </div>
            <div className="relative">
              <select
                value={selectedInvCategory}
                onChange={e => setSelectedInvCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(INVESTIGATION_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Grouped Investigation List */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 mb-4">
            {Object.entries(investigationGroups)
              .filter(([cat]) => selectedInvCategory === 'all' || cat === selectedInvCategory)
              .map(([cat, items]) => {
                const filtered = items.filter(inv =>
                  !invSearch || inv.name.toLowerCase().includes(invSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;
                const catInfo = INVESTIGATION_CATEGORY_LABELS[cat] || { label: cat, icon: '🔬' };
                return (
                  <div key={cat}>
                    <div className="sticky top-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                        {catInfo.icon} {catInfo.label}
                      </span>
                    </div>
                    {filtered.map(inv => {
                      const added = selectedTests.some(t => t.id === inv.id);
                      return (
                        <button
                          key={inv.id}
                          onClick={() => addInvestigation(inv)}
                          disabled={added}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white dark:hover:bg-slate-700 ${added ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${added ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                            {added && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{inv.name}</p>
                            {inv.description && <p className="text-xs text-slate-400 truncate">{inv.description}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Selected Tests */}
          {selectedTests.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                Selected Investigations ({selectedTests.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map(test => (
                  <span
                    key={test.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                  >
                    {INVESTIGATION_CATEGORY_LABELS[test.category]?.icon || '🔬'} {test.name}
                    <button onClick={() => removeInvestigation(test.id)} className="ml-1 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
