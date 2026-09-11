import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Download, Printer, FileText,
  AlertTriangle, CheckCircle2, Copy, Shield,
  User, MessageSquare, FolderOpen, Calendar,
  Activity, Pill, FlaskConical, ExternalLink
} from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const safeDate = (d: string | null | undefined, f = 'MMM dd, yyyy') => {
  if (!d) return 'N/A';
  try { return format(parseISO(d), f); } catch { return 'N/A'; }
};

const avatarColor = (name: string): [string, string] => {
  const p: [string, string][] = [
    ['#0ea5e9', '#0284c7'], ['#14b8a6', '#0d9488'], ['#8b5cf6', '#7c3aed'],
    ['#f59e0b', '#d97706'], ['#f43f5e', '#e11d48'], ['#10b981', '#059669'],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

const getArr = (field: any): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter((x: string) => x?.trim());
  try {
    const p = JSON.parse(field);
    return Array.isArray(p) ? p.filter((x: string) => x?.trim()) : [];
  } catch { return field ? [field] : []; }
};

// Truncate long text to max N words
const truncate = (text: string, maxWords = 60): string => {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
};

// ─── Sub-components ──────────────────────────────────────────────

const InfoChip = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/70 mb-0.5">{label}</span>
    <span className="text-sm font-bold text-text">{value}</span>
  </div>
);

const SectionCard = ({
  title, icon, children, accent = 'teal',
  copyText
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
  copyText?: string;
}) => {
  const accentMap: Record<string, string> = {
    teal:   'text-teal-600 dark:text-teal-400',
    rose:   'text-rose-600 dark:text-rose-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    amber:  'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="card-medical p-5 group relative">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${accentMap[accent] || accentMap.teal}`}>
          {icon}
          {title}
        </div>
        {copyText && (
          <button
            onClick={() => { navigator.clipboard.writeText(copyText); toast.success('Copied'); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-surface-2 text-text-muted"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────

export const SessionDetail = () => {
  const { id } = useParams();
  const { clinicName, doctorName, logout, fetchWithCsrf } = useAppContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const load = async () => {
      if (!fetchWithCsrf) return;
      try {
        const res = await fetchWithCsrf(`/api/sessions/${id}`);
        if (res.status === 401 || res.status === 403) { logout(); return; }
        const d = await res.json();
        if (d) setData(d);
      } catch { toast.error('Failed to load session'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, fetchWithCsrf]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-3 border-teal-500 border-t-transparent animate-spin" />
        <p className="text-sm text-text-muted font-medium">Loading session…</p>
      </div>
    </div>
  );

  if (!data?.session) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-text-muted" />
        </div>
        <p className="font-bold text-text">Session not found</p>
        <Link to="/sessions" className="text-sm text-teal-500 hover:underline mt-2 inline-block">← Back to History</Link>
      </div>
    </div>
  );

  const { session, qa = [], documents = [], summary } = data;
  const [c1, c2] = avatarColor(session.name || '?');
  const initials = (session.name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const flags = getArr(summary?.clinical_flags).filter((f: string) => f !== 'Standard Intake Summary');
  const keyFindings = getArr(summary?.key_findings);
  const meds = getArr(summary?.suggested_medications);
  const tests = getArr(summary?.suggested_tests);

  const tabs = [
    { id: 'summary',   label: 'Summary',      icon: <Activity className="w-3.5 h-3.5" />,      count: null },
    { id: 'qa',        label: 'Interaction',   icon: <MessageSquare className="w-3.5 h-3.5" />, count: qa.length },
    { id: 'documents', label: 'Records',       icon: <FolderOpen className="w-3.5 h-3.5" />,   count: documents.length },
  ];

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto pb-16">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link
          to="/sessions"
          className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-teal-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToPDF(data, clinicName, doctorName)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-border text-text-muted hover:text-text hover:border-teal-400 transition-all"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <Link
            to={`/physician/${session.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 14px rgba(20,184,166,0.3)' }}
          >
            <Printer className="w-4 h-4" /> Physician View
          </Link>
        </div>
      </div>

      {/* ── Patient Header Card ──────────────────────────── */}
      <div className="card-medical overflow-hidden mb-6">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-text tracking-tight">{session.name}</h1>
            {summary?.chief_complaint && (
              <p className="text-sm text-text-muted font-medium mt-0.5 truncate">
                🏥 {summary.chief_complaint}
              </p>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-5 shrink-0">
            <InfoChip label="Age" value={session.age ? `${session.age} yrs` : 'N/A'} />
            <InfoChip label="Gender" value={session.gender || 'N/A'} />
            <InfoChip label="Date" value={safeDate(session.created_at)} />
            <InfoChip label="Time" value={safeDate(session.created_at, 'h:mm a')} />
          </div>
        </div>

        {/* Status strip */}
        {flags.length > 0 && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {flags.length} Clinical Flag{flags.length > 1 ? 's' : ''} — Review Required
            </span>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ───────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'text-white shadow-md'
                : 'text-text-muted border border-border hover:text-text'
            }`}
            style={activeTab === tab.id
              ? { background: 'var(--gradient-primary)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }
              : { background: 'var(--surface)' }
            }
          >
            {tab.icon}
            {tab.label}
            {tab.count !== null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-500/10 text-teal-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ─ Summary Tab ─ */}
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {!summary ? (
              <div className="card-medical py-16 text-center text-text-muted font-medium">
                No summary generated for this session yet.
              </div>
            ) : (
              <>
                {/* Disclaimer — compact */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-snug">
                    AI-assisted summary — must be validated by a Registered Medical Practitioner (RMP) before clinical use.
                  </p>
                </div>

                {/* Row 1: Flags + Key Findings */}
                {(flags.length > 0 || keyFindings.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flags.length > 0 && (
                      <SectionCard title="Clinical Flags" icon={<AlertTriangle className="w-3.5 h-3.5" />} accent="rose">
                        <div className="space-y-2">
                          {flags.map((f: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5 animate-pulse" />
                              <span className="text-sm text-rose-800 dark:text-rose-300 font-medium leading-snug">{f}</span>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {keyFindings.length > 0 && (
                      <SectionCard title="Key Findings" icon={<CheckCircle2 className="w-3.5 h-3.5" />} accent="teal">
                        <div className="space-y-2">
                          {keyFindings.slice(0, 4).map((kf: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                              <span className="text-sm text-text font-medium leading-snug">{kf}</span>
                            </div>
                          ))}
                          {keyFindings.length > 4 && (
                            <p className="text-xs text-text-muted text-center pt-1">+{keyFindings.length - 4} more findings</p>
                          )}
                        </div>
                      </SectionCard>
                    )}
                  </div>
                )}

                {/* Row 2: Chief Complaint */}
                <SectionCard
                  title="Chief Complaint"
                  icon={<Activity className="w-3.5 h-3.5" />}
                  accent="teal"
                  copyText={summary.chief_complaint}
                >
                  <p className="text-base font-bold text-text">
                    {summary.chief_complaint || 'No complaint recorded.'}
                  </p>
                </SectionCard>

                {/* Row 3: History — SHORT, max 60 words */}
                {summary.history_of_presenting_illness && (
                  <SectionCard
                    title="History of Presenting Illness"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    accent="teal"
                    copyText={summary.history_of_presenting_illness}
                  >
                    <p className="text-sm text-text leading-relaxed">
                      {truncate(summary.history_of_presenting_illness, 60)}
                    </p>
                  </SectionCard>
                )}

                {/* Row 4: Assessment — SHORT, max 40 words */}
                {summary.assessment_notes && (
                  <SectionCard
                    title="Assessment & Notes"
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    accent="indigo"
                    copyText={summary.assessment_notes}
                  >
                    <p className="text-sm text-text leading-relaxed">
                      {truncate(summary.assessment_notes, 40)}
                    </p>
                  </SectionCard>
                )}

                {/* Row 5: Meds + Tests */}
                {(meds.length > 0 || tests.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {meds.length > 0 && (
                      <SectionCard
                        title="Medications"
                        icon={<Pill className="w-3.5 h-3.5" />}
                        accent="teal"
                        copyText={meds.join('\n')}
                      >
                        <div className="space-y-1.5">
                          {meds.map((m: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-text">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                              {m}
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {tests.length > 0 && (
                      <SectionCard
                        title="Investigations"
                        icon={<FlaskConical className="w-3.5 h-3.5" />}
                        accent="indigo"
                        copyText={tests.join('\n')}
                      >
                        <div className="space-y-1.5">
                          {tests.map((t: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-text">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              {t}
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ─ Patient Interaction Tab ─ */}
        {activeTab === 'qa' && (
          <motion.div
            key="qa"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Initial complaint */}
            <div className="card-medical p-4 border-l-4 border-teal-400">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Initial Complaint</p>
              <p className="text-sm font-bold text-text italic">"{session.complaint}"</p>
            </div>

            {/* QA Bubbles */}
            {qa.length === 0 ? (
              <div className="card-medical py-12 text-center text-text-muted font-medium">
                No interaction recorded for this session.
              </div>
            ) : (
              qa.map((q: any, i: number) => (
                <div key={i} className="space-y-2">
                  {/* AI question */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow">
                      AI
                    </div>
                    <div
                      className="flex-1 text-sm text-text leading-relaxed px-4 py-3 rounded-2xl rounded-tl-sm"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      {q.question}
                    </div>
                  </div>
                  {/* Patient answer */}
                  {q.answer && (
                    <div className="flex items-start gap-3 flex-row-reverse">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow">
                        Pt
                      </div>
                      <div className="flex-1 text-sm text-text leading-relaxed px-4 py-3 rounded-2xl rounded-tr-sm bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                        {q.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ─ Documents Tab ─ */}
        {activeTab === 'documents' && (
          <motion.div
            key="docs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {documents.length === 0 ? (
              <div className="card-medical py-16 text-center">
                <FolderOpen className="w-10 h-10 text-text-muted/40 mx-auto mb-3" />
                <p className="font-bold text-text">No records uploaded</p>
                <p className="text-sm text-text-muted mt-1">Medical documents will appear here when uploaded.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: any, i: number) => (
                  <div key={i} className="card-medical p-4 flex flex-col gap-3 hover:shadow-md transition-shadow group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text text-sm truncate" title={doc.filename}>{doc.filename}</p>
                      <p className="text-xs text-text-muted mt-0.5">{safeDate(doc.uploaded_at, 'MMM dd, yyyy · h:mm a')}</p>
                    </div>
                    {doc.coordinator_note && (
                      <p className="text-xs text-text-muted leading-snug line-clamp-2 bg-background p-2 rounded-lg border border-border">
                        {doc.coordinator_note}
                      </p>
                    )}
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Document
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionDetail;
