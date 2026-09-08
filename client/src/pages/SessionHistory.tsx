import { useState, useEffect } from 'react';
import { format, parseISO, isSameDay, isValid, formatDistanceToNow } from 'date-fns';
import { Search, Eye, Trash2, Filter, LayoutGrid, LayoutList, Plus, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from './Dashboard';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

const safeFormatDate = (dateStr: string | null | undefined, formatStr = 'MMM dd, yyyy') => {
  if (!dateStr) return 'N/A';
  try { return format(parseISO(dateStr), formatStr); }
  catch { return 'Invalid Date'; }
};

const safeTimeAgo = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  try { const d = parseISO(dateStr); return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : ''; }
  catch { return ''; }
};

const avatarColor = (name: string) => {
  const palettes: [string, string][] = [
    ['#0ea5e9', '#0284c7'], ['#14b8a6', '#0d9488'], ['#8b5cf6', '#7c3aed'],
    ['#f59e0b', '#d97706'], ['#f43f5e', '#e11d48'], ['#10b981', '#059669'],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
};

const diseaseIcon: Record<string, string> = {
  asthma: '🫁', copd: '💨', tuberculosis: '🦠', tb: '🦠', ild: '🕸️',
  bronchiectasis: '🩺', pneumonia: '🌡️', pleural: '💧', rhinitis: '🌸', osa: '😴',
};
const getDiseaseIcon = (complaint = '') => {
  const lower = complaint.toLowerCase();
  for (const [key, icon] of Object.entries(diseaseIcon)) {
    if (lower.includes(key)) return icon;
  }
  return '🏥';
};

// ── Session Card (Grid) ───────────────────────────────────────────
const SessionCard = ({ session, onDelete }: { session: any; onDelete: (id: number) => void }) => {
  const [c1, c2] = avatarColor(session.patient_name || '?');
  const initials = (session.patient_name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const href = session.status === 'in_progress' ? `/session/resume/${session.id}` : `/session/${session.id}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="card-medical group flex flex-col overflow-hidden"
    >
      {/* Card top gradient bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

      <div className="p-5 flex-1 flex flex-col">
        {/* Avatar + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {initials}
            </div>
            <div>
              <div className="font-black text-text text-sm">{session.patient_name || 'Anonymous'}</div>
              <div className="text-xs text-text-muted font-medium">
                {session.patient_age ? `${session.patient_age}y` : '?'}
                {session.gender ? ` · ${session.gender}` : ''}
              </div>
            </div>
          </div>
          <StatusBadge status={session.status} />
        </div>

        {/* Complaint / Summary */}
        <div className="flex items-start gap-2 mb-4 flex-1">
          <span className="text-lg leading-none mt-0.5 shrink-0">{getDiseaseIcon(session.complaint || session.summary_complaint)}</span>
          <p className="text-sm text-text-muted font-medium leading-relaxed line-clamp-2 flex-1">
            {session.summary_complaint || session.complaint || 'No complaint recorded'}
          </p>
        </div>

        {/* Time */}
        <div className="text-xs text-text-muted/60 font-semibold mb-4" title={safeFormatDate(session.created_at, 'MMMM d, yyyy · h:mm a')}>
          🕐 {safeTimeAgo(session.created_at)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Link
            to={href}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}
          >
            <Eye className="w-4 h-4" />
            {session.status === 'in_progress' ? 'Continue' : 'View'}
          </Link>
          <button
            onClick={() => onDelete(session.id)}
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-muted hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Session Row (List) ────────────────────────────────────────────
const SessionRow = ({ session, idx, onDelete }: { session: any; idx: number; onDelete: (id: number) => void }) => {
  const [c1, c2] = avatarColor(session.patient_name || '?');
  const initials = (session.patient_name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const href = session.status === 'in_progress' ? `/session/resume/${session.id}` : `/session/${session.id}`;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="group hover:bg-sky-50/50 dark:hover:bg-sky-500/3 transition-colors"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-text">{session.patient_name || 'Anonymous'}</div>
            <div className="text-xs text-text-muted">{session.patient_age ? `${session.patient_age}y` : '?'} · {session.gender || 'U'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-text-muted max-w-xs">
          <span className="shrink-0">{getDiseaseIcon(session.complaint || session.summary_complaint)}</span>
          <span className="truncate">{session.summary_complaint || session.complaint || '—'}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-text">{safeFormatDate(session.created_at, 'MMM dd, yyyy')}</div>
        <div className="text-xs text-text-muted">{safeFormatDate(session.created_at, 'h:mm a')}</div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={session.status} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <Link to={href}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: 'var(--gradient-primary)' }}>
            <Eye className="w-3.5 h-3.5" />
            {session.status === 'in_progress' ? 'Continue' : 'View'}
          </Link>
          <button onClick={() => onDelete(session.id)}
            className="p-2 rounded-xl text-text-muted hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// ── Main Component ────────────────────────────────────────────────
export const SessionHistory = () => {
  const { t } = useTranslation();
  const { logout, user, fetchWithCsrf } = useAppContext();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'all';
  const dateFilter = queryParams.get('date');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const fetchSessions = async () => {
    if (!user || !fetchWithCsrf) return;
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/api/sessions');
      if (res.status === 401 || res.status === 403) { logout(); return; }
      const data = await res.json();
      if (data) setSessions(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchSessions(); }, [user]);
  useEffect(() => { setStatusFilter(queryParams.get('status') || 'all'); }, [location.search]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('sessions_flow.delete_confirm'))) return;
    try {
      if (!fetchWithCsrf) return;
      const res = await fetchWithCsrf(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.status === 401 || res.status === 403) return logout();
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== id));
        toast.success('Session deleted');
      } else {
        toast.error('Failed to delete');
      }
    } catch { toast.error('Error deleting session'); }
  };

  const filteredSessions = sessions.filter(s => {
    const nameMatch = (s.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const complaintMatch = (s.complaint || s.summary_complaint || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || complaintMatch;
    let matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    if (statusFilter === 'in_progress' && s.status === 'processing') matchesStatus = true;
    let matchesDate = true;
    if (dateFilter === 'today') {
      try {
        const d = parseISO(s.created_at);
        matchesDate = isValid(d) && isSameDay(d, new Date());
      } catch { matchesDate = false; }
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const statusOptions = [
    { value: 'all',         label: 'All Status' },
    { value: 'completed',   label: 'Completed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'flagged',     label: 'Flagged' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-text tracking-tight">{t('sessions')}</h1>
          <p className="text-text-muted mt-1 font-medium">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          to="/session/new"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 6px 16px rgba(20,184,166,0.3)' }}
        >
          <Plus className="w-4 h-4" /> New Session
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="card-medical p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder={t('sessions_flow.search_placeholder') || 'Search by patient name or complaint...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface-2 dark:bg-background border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-text-muted/60"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === opt.value
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                  : 'bg-surface-2 text-text-muted hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 border border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-teal-500 text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-teal-500 text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-medical p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-medical py-20 flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-5 shadow-sm">
            <User className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-text mb-2">No sessions found</h3>
          <p className="text-text-muted font-medium mb-6 max-w-sm">
            {searchTerm ? `No results for "${searchTerm}". Try a different search.` : 'Start your first patient intake session to see it here.'}
          </p>
          {!searchTerm && (
            <Link to="/session/new" className="btn-primary flex items-center gap-2 px-6 py-3">
              <Plus className="w-4 h-4" /> Start First Session
            </Link>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredSessions.map(session => (
              <SessionCard key={session.id} session={session} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="card-medical overflow-hidden">
          <table className="min-w-full table-medical">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Complaint</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {filteredSessions.map((s, idx) => (
                  <SessionRow key={s.id} session={s} idx={idx} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
