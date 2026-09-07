import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Pill, 
  FlaskConical, 
  Stethoscope, 
  ChevronDown
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { DISEASE_CATEGORIES, DISEASE_QUESTION_SETS, type Question } from '../components/SuggestiveQaIntake';

export const TemplatesManager = () => {
  const { logout, user, fetchWithCsrf } = useAppContext();
  const [activeTab, setActiveTab] = useState<'disease_qa' | 'medications' | 'investigations'>('disease_qa');

  // Disease Q&A State
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [dbQuestions, setDbQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    category: 'asthma',
    input_type: 'multi_select' as 'single_select' | 'multi_select',
    options: [{ value: '', label: '', icon: '🫁' }],
  });

  // Medication Templates State
  const [medications, setMedications] = useState<any[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medCategory, setMedCategory] = useState('all');
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    generic_name: '',
    category: 'ics_laba',
    dosage: '',
    route: 'inhaled',
    frequency: 'BD',
    default_duration: '30 days',
    notes: '',
  });

  // Investigation Templates State
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('all');
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [newInv, setNewInv] = useState({
    name: '',
    category: 'pft',
    sub_category: '',
    description: '',
    normal_range: '',
  });

  // Fetch all data
  const fetchQuestions = async () => {
    if (!fetchWithCsrf) return;
    try {
      const res = await fetchWithCsrf('/api/templates/respiratory-questions');
      if (res.status === 401 || res.status === 403) return logout();
      const data = await res.json();
      if (Array.isArray(data)) setDbQuestions(data);
    } catch {}
  };

  const fetchMedications = async () => {
    if (!fetchWithCsrf) return;
    try {
      const res = await fetchWithCsrf('/api/templates/medications');
      if (res.status === 401 || res.status === 403) return logout();
      const data = await res.json();
      if (Array.isArray(data)) setMedications(data);
    } catch {}
  };

  const fetchInvestigations = async () => {
    if (!fetchWithCsrf) return;
    try {
      const res = await fetchWithCsrf('/api/templates/investigations');
      if (res.status === 401 || res.status === 403) return logout();
      const data = await res.json();
      if (data && Array.isArray(data.flat)) setInvestigations(data.flat);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchMedications();
      fetchInvestigations();
    }
  }, [user]);

  // Combined Questions (API + Static Fallback)
  const allQuestions: Question[] = [
    ...dbQuestions,
    ...Object.values(DISEASE_QUESTION_SETS).flatMap(list => 
      list.filter(q => !dbQuestions.some(dbQ => dbQ.question_text === q.question_text))
    )
  ];

  const filteredQuestions = allQuestions.filter(q => {
    const matchesDisease = selectedDisease === 'all' || q.category === selectedDisease;
    const matchesSearch = !questionSearch || 
      q.question_text.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.options.some(o => o.label.toLowerCase().includes(questionSearch.toLowerCase()));
    return matchesDisease && matchesSearch;
  });

  const filteredMedications = medications.filter(m => {
    const matchesCat = medCategory === 'all' || m.category === medCategory;
    const matchesSearch = !medSearch || 
      (m.name || '').toLowerCase().includes(medSearch.toLowerCase()) ||
      (m.generic_name || '').toLowerCase().includes(medSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredInvestigations = investigations.filter(inv => {
    const matchesCat = invCategory === 'all' || inv.category === invCategory;
    const matchesSearch = !invSearch || 
      (inv.name || '').toLowerCase().includes(invSearch.toLowerCase()) ||
      (inv.description || '').toLowerCase().includes(invSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Handlers for Question creation
  const handleSaveQuestion = async () => {
    if (!newQuestion.question_text.trim()) return toast.error('Question title is required');
    const validOptions = newQuestion.options.filter(o => o.label.trim());
    if (validOptions.length === 0) return toast.error('Add at least one option card');

    try {
      const res = await fetchWithCsrf('/api/templates/respiratory-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: newQuestion.question_text,
          category: newQuestion.category,
          input_type: newQuestion.input_type,
          options: validOptions.map(o => ({
            value: o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
            label: o.label,
            icon: o.icon || '🫁'
          }))
        })
      });
      if (res.status === 401 || res.status === 403) return logout();
      toast.success('Disease Q&A Question Template created');
      setIsQuestionModalOpen(false);
      setNewQuestion({
        question_text: '',
        category: 'asthma',
        input_type: 'multi_select',
        options: [{ value: '', label: '', icon: '🫁' }],
      });
      fetchQuestions();
    } catch {
      toast.error('Failed to create question template');
    }
  };

  // Handlers for Medication creation
  const handleSaveMedication = async () => {
    if (!newMed.name.trim()) return toast.error('Medication name is required');
    try {
      const res = await fetchWithCsrf('/api/templates/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMed)
      });
      if (res.status === 401 || res.status === 403) return logout();
      if (!res.ok) {
        const err = await res.json();
        return toast.error(err.error || 'Failed to save medication');
      }
      toast.success('Medication added to clinical library');
      setIsMedModalOpen(false);
      setNewMed({
        name: '',
        generic_name: '',
        category: 'ics_laba',
        dosage: '',
        route: 'inhaled',
        frequency: 'BD',
        default_duration: '30 days',
        notes: '',
      });
      fetchMedications();
    } catch {
      toast.error('Failed to create medication template');
    }
  };

  // Handlers for Investigation creation
  const handleSaveInvestigation = async () => {
    if (!newInv.name.trim()) return toast.error('Investigation name is required');
    try {
      const res = await fetchWithCsrf('/api/templates/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInv)
      });
      if (res.status === 401 || res.status === 403) return logout();
      toast.success('Investigation added to panel');
      setIsInvModalOpen(false);
      setNewInv({
        name: '',
        category: 'pft',
        sub_category: '',
        description: '',
        normal_range: '',
      });
      fetchInvestigations();
    } catch {
      toast.error('Failed to create investigation template');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question template?')) return;
    try {
      await fetchWithCsrf(`/api/templates/respiratory-questions/${id}`, { method: 'DELETE' });
      toast.success('Question deleted');
      fetchQuestions();
    } catch {
      toast.error('Could not delete template');
    }
  };

  const handleDeleteMed = async (id: number) => {
    if (!confirm('Remove medication from library?')) return;
    try {
      await fetchWithCsrf(`/api/templates/medications/${id}`, { method: 'DELETE' });
      toast.success('Medication removed');
      fetchMedications();
    } catch {
      toast.error('Could not delete medication');
    }
  };

  const handleDeleteInv = async (id: number) => {
    if (!confirm('Remove investigation from template list?')) return;
    try {
      await fetchWithCsrf(`/api/templates/investigations/${id}`, { method: 'DELETE' });
      toast.success('Investigation removed');
      fetchInvestigations();
    } catch {
      toast.error('Could not delete investigation');
    }
  };

  const MED_CATEGORIES = [
    { id: 'all', label: 'All Classes' },
    { id: 'ics', label: 'ICS' },
    { id: 'laba', label: 'LABA' },
    { id: 'lama', label: 'LAMA' },
    { id: 'ics_laba', label: 'ICS + LABA' },
    { id: 'triple_therapy', label: 'Triple Therapy' },
    { id: 'saba', label: 'Rescue Bronchodilator' },
    { id: 'nebulization', label: 'Nebulization' },
    { id: 'oral_steroids', label: 'Oral Steroids' },
    { id: 'antifibrotic', label: 'Antifibrotic (ILD)' },
    { id: 'anti_tb', label: 'Anti-TB' },
    { id: 'mucolytic', label: 'Mucolytics' },
    { id: 'ltra', label: 'LTRA' },
    { id: 'biologic', label: 'Biologics' },
    { id: 'antibiotic', label: 'Antibiotics' },
    { id: 'antihistamine', label: 'Antihistamines' },
  ];

  const INV_CATEGORIES = [
    { id: 'all', label: 'All Categories' },
    { id: 'pft', label: 'Pulmonary Function Tests (PFT)' },
    { id: 'imaging', label: 'Chest Imaging (X-Ray / HRCT)' },
    { id: 'lab', label: 'Laboratory / Blood Tests' },
    { id: 'sputum', label: 'Sputum & Microbiology' },
    { id: 'procedure', label: 'Diagnostic Procedures (Bronchoscopy)' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            Clinical Templates & Library
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Standardized respiratory question modules, medication drug library, and diagnostic test panels.
          </p>
        </div>

        {/* Create Button per Tab */}
        {activeTab === 'disease_qa' && (
          <button 
            onClick={() => setIsQuestionModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Disease Question
          </button>
        )}
        {activeTab === 'medications' && (
          <button 
            onClick={() => setIsMedModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Medication Template
          </button>
        )}
        {activeTab === 'investigations' && (
          <button 
            onClick={() => setIsInvModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Investigation Template
          </button>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl">
        <button
          onClick={() => setActiveTab('disease_qa')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'disease_qa'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-md scale-[1.02]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-teal-500" />
          <span>Disease Q&A Templates</span>
          <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
            {allQuestions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('medications')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'medications'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-md scale-[1.02]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Pill className="w-4 h-4 text-blue-500" />
          <span>Medication Templates</span>
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
            {medications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('investigations')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'investigations'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md scale-[1.02]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-indigo-500" />
          <span>Investigation Templates</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
            {investigations.length}
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* TAB 1: DISEASE Q&A TEMPLATES */}
      {/* ───────────────────────────────────────────── */}
      {activeTab === 'disease_qa' && (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Disease Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {DISEASE_CATEGORIES.map(cat => {
              const count = allQuestions.filter(q => cat.id === 'all' || q.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedDisease(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedDisease === cat.id
                      ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/30 scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    selectedDisease === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={questionSearch}
              onChange={e => setQuestionSearch(e.target.value)}
              placeholder="Search questions or option cards..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Question Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
            {filteredQuestions.map((q, idx) => (
              <div 
                key={q.id || idx}
                className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                      {q.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {q.input_type === 'single_select' ? '🔘 Single-Select' : '☑️ Multi-Select'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-3 leading-snug">
                    {q.question_text}
                  </h3>

                  {/* Option Card Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {q.options.map((opt, oIdx) => (
                      <span 
                        key={oIdx} 
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium"
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {dbQuestions.some(dbQ => dbQ.id === q.id) && (
                  <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* TAB 2: MEDICATION TEMPLATES */}
      {/* ───────────────────────────────────────────── */}
      {activeTab === 'medications' && (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Controls: Category Dropdown + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={medSearch}
                onChange={e => setMedSearch(e.target.value)}
                placeholder="Search by brand name or generic (e.g. Budesonide, Formoterol)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative min-w-56">
              <select
                value={medCategory}
                onChange={e => setMedCategory(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {MED_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Medications Table / Cards */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3.5">Medication (Brand / Generic)</th>
                    <th className="px-4 py-3.5">Class / Category</th>
                    <th className="px-4 py-3.5">Standard Dosage</th>
                    <th className="px-4 py-3.5">Frequency</th>
                    <th className="px-4 py-3.5">Route</th>
                    <th className="px-4 py-3.5">Duration</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredMedications.map((m, i) => (
                    <tr key={m.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{m.name}</div>
                        {m.generic_name && (
                          <div className="text-xs text-slate-400 dark:text-slate-500">{m.generic_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {m.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-300">{m.dosage || '—'}</td>
                      <td className="px-4 py-4 font-bold text-teal-600 dark:text-teal-400">{m.frequency || '—'}</td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 capitalize">{m.route || 'oral'}</td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{m.default_duration || '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteMed(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* TAB 3: INVESTIGATION TEMPLATES */}
      {/* ───────────────────────────────────────────── */}
      {activeTab === 'investigations' && (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Controls: Category Dropdown + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="Search tests (e.g. Spirometry, HRCT Thorax, FeNO, Sputum AFB)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative min-w-56">
              <select
                value={invCategory}
                onChange={e => setInvCategory(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {INV_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Investigation Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
            {filteredInvestigations.map((inv, idx) => (
              <div 
                key={inv.id || idx}
                className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {inv.category}
                    </span>
                    {inv.sub_category && (
                      <span className="text-xs text-slate-400 font-medium">
                        {inv.sub_category}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1 leading-snug">
                    {inv.name}
                  </h3>

                  {inv.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      {inv.description}
                    </p>
                  )}

                  {inv.normal_range && (
                    <div className="text-xs font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1.5 rounded-lg border border-teal-100 dark:border-teal-800/40">
                      Ref: {inv.normal_range}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={() => handleDeleteInv(inv.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* MODAL 1: ADD DISEASE QUESTION */}
      {/* ───────────────────────────────────────────── */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-500" /> Add Disease Q&A Question
              </h2>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newQuestion.question_text}
                  onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  placeholder="e.g. What specific allergens trigger your bronchospasm?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Disease Protocol
                  </label>
                  <select
                    value={newQuestion.category}
                    onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {DISEASE_CATEGORIES.filter(d => d.id !== 'all').map(d => (
                      <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Selection Type
                  </label>
                  <select
                    value={newQuestion.input_type}
                    onChange={e => setNewQuestion({ ...newQuestion, input_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="multi_select">☑️ Multi-Select Cards</option>
                    <option value="single_select">🔘 Single-Select Option</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Visual Option Cards
                  </label>
                  <button
                    onClick={() => setNewQuestion({
                      ...newQuestion,
                      options: [...newQuestion.options, { value: '', label: '', icon: '🫁' }]
                    })}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    + Add Card
                  </button>
                </div>

                <div className="space-y-2">
                  {newQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.icon}
                        onChange={e => {
                          const opts = [...newQuestion.options];
                          opts[i].icon = e.target.value;
                          setNewQuestion({ ...newQuestion, options: opts });
                        }}
                        placeholder="Icon"
                        className="w-14 text-center px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg"
                      />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={e => {
                          const opts = [...newQuestion.options];
                          opts[i].label = e.target.value;
                          opts[i].value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                          setNewQuestion({ ...newQuestion, options: opts });
                        }}
                        placeholder="Option label (e.g. Cold Air / Seasonal change)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      {newQuestion.options.length > 1 && (
                        <button
                          onClick={() => {
                            const opts = newQuestion.options.filter((_, idx) => idx !== i);
                            setNewQuestion({ ...newQuestion, options: opts });
                          }}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-md shadow-teal-600/30"
              >
                Save Question Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* MODAL 2: ADD MEDICATION */}
      {/* ───────────────────────────────────────────── */}
      {isMedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-500" /> Add Respiratory Medication Template
              </h2>
              <button onClick={() => setIsMedModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Medication / Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMed.name}
                  onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                  placeholder="e.g. Budesonide + Formoterol (Foracort)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Generic Formulation
                </label>
                <input
                  type="text"
                  value={newMed.generic_name}
                  onChange={e => setNewMed({ ...newMed, generic_name: e.target.value })}
                  placeholder="e.g. Budesonide 200mcg + Formoterol Fumarate 6mcg"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Drug Class
                  </label>
                  <select
                    value={newMed.category}
                    onChange={e => setNewMed({ ...newMed, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {MED_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Dosage Strength
                  </label>
                  <input
                    type="text"
                    value={newMed.dosage}
                    onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                    placeholder="e.g. 200/6 mcg or 400mcg"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Route
                  </label>
                  <select
                    value={newMed.route}
                    onChange={e => setNewMed({ ...newMed, route: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="inhaled">Inhaled (DPI/MDI)</option>
                    <option value="nebulized">Nebulized</option>
                    <option value="oral">Oral</option>
                    <option value="subcutaneous">Subcutaneous</option>
                    <option value="nasal">Nasal Spray</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={newMed.frequency}
                    onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                    placeholder="e.g. BD or OD"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={newMed.default_duration}
                    onChange={e => setNewMed({ ...newMed, default_duration: e.target.value })}
                    placeholder="e.g. 30 days"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsMedModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMedication}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/30"
              >
                Save Medication Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* MODAL 3: ADD INVESTIGATION */}
      {/* ───────────────────────────────────────────── */}
      {isInvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-500" /> Add Investigation Template
              </h2>
              <button onClick={() => setIsInvModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Test / Investigation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newInv.name}
                  onChange={e => setNewInv({ ...newInv, name: e.target.value })}
                  placeholder="e.g. Spirometry Pre & Post Bronchodilator"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={newInv.category}
                    onChange={e => setNewInv({ ...newInv, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="pft">PFT (Lung Function)</option>
                    <option value="imaging">Imaging (X-Ray/CT)</option>
                    <option value="lab">Laboratory (Blood)</option>
                    <option value="sputum">Sputum & Microbiology</option>
                    <option value="procedure">Diagnostic Procedures</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Sub-Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={newInv.sub_category}
                    onChange={e => setNewInv({ ...newInv, sub_category: e.target.value })}
                    placeholder="e.g. Spirometry or HRCT"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Clinical Description / Indications
                </label>
                <textarea
                  value={newInv.description}
                  onChange={e => setNewInv({ ...newInv, description: e.target.value })}
                  placeholder="e.g. Assesses reversible airway obstruction in Asthma vs Fixed in COPD."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Normal Reference Range
                </label>
                <input
                  type="text"
                  value={newInv.normal_range}
                  onChange={e => setNewInv({ ...newInv, normal_range: e.target.value })}
                  placeholder="e.g. FEV1/FVC > 70%, FEV1 > 80% predicted"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsInvModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvestigation}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/30"
              >
                Save Investigation Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TemplatesManager;
