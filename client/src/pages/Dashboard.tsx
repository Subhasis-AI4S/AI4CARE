import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, isSameDay, parseISO, isValid } from 'date-fns';
import {
  Activity, CheckCircle, Clock, AlertTriangle, User,
  TrendingUp, TrendingDown, ArrowRight, Plus, Zap,
  Stethoscope, Calendar, Star, BarChart2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

const safeFormatDate = (dateStr: string | null | undefined, formatStr = 'MMM dd, yyyy') => {
  if (!dateStr) return 'N/A';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return 'Invalid Date';
    return format(d, formatStr);
  } catch { return 'Invalid Date'; }
};

const safeIsSameDay = (dateStr: string | null | undefined, compareDate: Date) => {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return isValid(d) && isSameDay(d, compareDate);
  } catch { return false; }
};

// Auto-color from name
const avatarColor = (name: string) => {
  const palettes = [
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
const getDiseaseIcon = (complaint: string = '') => {
  const lower = complaint.toLowerCase();
  for (const [key, icon] of Object.entries(diseaseIcon)) {
    if (lower.includes(key)) return icon;
  }
  return '🏥';
};

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    completed:  { cls: 'status-completed',  icon: <CheckCircle className="w-3 h-3" />,     label: t('dashboard_flow.status_completed') },
    flagged:    { cls: 'status-flagged',    icon: <AlertTriangle className="w-3 h-3" />,   label: t('dashboard_flow.status_flagged') },
    processing: { cls: 'status-processing', icon: <Zap className="w-3 h-3 animate-pulse" />, label: 'Processing...' },
    in_progress:{ cls: 'status-pending',    icon: <Clock className="w-3 h-3" />,            label: t('dashboard_flow.status_in_progress') },
  };
  const config = map[status] || map['in_progress'];
  return <span className={`status-pill ${config.cls}`}>{config.icon}{config.label}</span>;
};

const MetricCard = ({
  title, value, icon, color, trend, href
}: {
  title: string; value: number; icon: React.ReactNode;
  color: string; trend?: { isUp: boolean; percent: number }; href?: string;
}) => {
  const card = (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="card-medical p-6 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-md`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
            trend.isUp ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                       : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
          }`}>
            {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.percent)}%
          </div>
        )}
      </div>
      <div className="text-4xl font-black text-text mb-1 tabular-nums">{value}</div>
      <div className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</div>
    </motion.div>
  );
  return href ? <Link to={href}>{card}</Link> : card;
};

const SkeletonCard = () => (
  <div className="card-medical p-6">
    <div className="flex justify-between items-start mb-4">
      <div className="skeleton w-12 h-12 rounded-2xl" />
      <div className="skeleton w-16 h-6 rounded-xl" />
    </div>
    <div className="skeleton w-16 h-10 mb-2 rounded-lg" />
    <div className="skeleton w-28 h-4 rounded-md" />
  </div>
);

export const Dashboard = () => {
  const { t } = useTranslation();
  const { logout, doctorName, user, fetchWithCsrf } = useAppContext();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user || !fetchWithCsrf) return;
      try {
        const res = await fetchWithCsrf('/api/sessions');
        if (res.status === 401 || res.status === 403) { logout(); return; }
        const data = await res.json();
        if (data) setSessions(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user, fetchWithCsrf]);

  const stats = useMemo(() => {
    const today = new Date();
    return {
      totalToday: sessions.filter(s => safeIsSameDay(s.created_at, today)).length,
      completed:  sessions.filter(s => s.status === 'completed').length,
      pending:    sessions.filter(s => s.status === 'in_progress' || s.status === 'processing').length,
      flagged:    sessions.filter(s => s.status === 'flagged').length,
    };
  }, [sessions]);

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        name: format(date, 'EEE'),
        sessions: sessions.filter(s => safeIsSameDay(s.created_at, date)).length,
      };
    });
  }, [sessions]);

  const trends = useMemo(() => {
    const last = sessions.filter(s => { const d = parseISO(s.created_at); return isValid(d) && d > subDays(new Date(), 7); }).length;
    const prev = sessions.filter(s => { const d = parseISO(s.created_at); return isValid(d) && d <= subDays(new Date(), 7) && d > subDays(new Date(), 14); }).length;
    const diff = last - prev;
    return { diff, percent: prev === 0 ? 100 : Math.round((Math.abs(diff) / prev) * 100), isUp: diff >= 0 };
  }, [sessions]);

  const recentSessions = sessions.slice(0, 8);
  const todaySessions  = sessions.filter(s => safeIsSameDay(s.created_at, new Date())).slice(0, 5);
  const flaggedSessions = sessions.filter(s => s.status === 'flagged').slice(0, 3);

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Hero Banner ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-medical rounded-3xl overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <p className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
              <Star className="w-3.5 h-3.5" /> {greeting()}, Doctor
            </p>
            <h1 className="text-white font-black text-3xl md:text-4xl tracking-tight mb-2">
              Dr. {doctorName || 'Physician'}
            </h1>
            <p className="text-white/40 text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(currentTime, 'EEEE, MMMM d, yyyy')} &nbsp;·&nbsp; {format(currentTime, 'h:mm a')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/session/new"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)', boxShadow: '0 8px 20px rgba(20,184,166,0.35)' }}
            >
              <Plus className="w-5 h-5" /> New Patient Session
            </Link>
            <Link
              to="/sessions"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-white/10 text-white border border-white/15 hover:bg-white/15 transition-all"
            >
              <BarChart2 className="w-4 h-4" /> View All Sessions
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Flagged Alerts ───────────────────────────────────── */}
      {flaggedSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-md">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-rose-700 dark:text-rose-400 text-sm">
              {flaggedSessions.length} Flagged Case{flaggedSessions.length > 1 ? 's' : ''} Require Attention
            </p>
            <p className="text-rose-600/70 dark:text-rose-500/70 text-xs font-medium">
              {flaggedSessions.map(s => s.patient_name || 'Unknown').join(', ')}
            </p>
          </div>
          <Link to="/sessions?status=flagged" className="text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            Review <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* ── Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <MetricCard href="/sessions?date=today" title="Today's Sessions" value={stats.totalToday}
                icon={<Activity className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-sky-500 to-blue-600"
                trend={trends} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <MetricCard href="/sessions?status=completed" title="Completed" value={stats.completed}
                icon={<CheckCircle className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-teal-500 to-emerald-600" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <MetricCard href="/sessions?status=in_progress" title="In Progress" value={stats.pending}
                icon={<Clock className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-amber-500 to-orange-600" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <MetricCard href="/sessions?status=flagged" title="Flagged Cases" value={stats.flagged}
                icon={<AlertTriangle className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-rose-500 to-pink-600" />
            </motion.div>
          </>
        )}
      </div>

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="card-medical xl:col-span-2 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="section-title">{t('dashboard_flow.activity_chart')}</div>
            <div className="text-xs font-bold text-text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-xl">
              Last 7 days
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700 }} allowDecimals={false} width={30} />
                <Tooltip
                  cursor={{ fill: 'rgba(20,184,166,0.05)', stroke: 'rgba(20,184,166,0.2)', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', fontFamily: 'Plus Jakarta Sans' }}
                  itemStyle={{ color: 'var(--color-text)', fontWeight: 700 }}
                  labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 11 }}
                />
                <Area dataKey="sessions" stroke="#14b8a6" strokeWidth={2.5} fill="url(#colorSessions)" dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#14b8a6', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Today's Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card-medical p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="section-title">Today</div>
            <span className="text-xs font-black bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-500/20">
              {stats.totalToday} sessions
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {todaySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Stethoscope className="w-10 h-10 text-text-muted/30 mb-3" />
                <p className="text-text-muted text-sm font-semibold">No sessions today yet</p>
                <Link to="/session/new" className="mt-3 text-teal-600 text-xs font-bold hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Start first session
                </Link>
              </div>
            ) : (
              todaySessions.map((s, i) => {
                const [c1, c2] = avatarColor(s.patient_name || 'Unknown');
                const initials = (s.patient_name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Link key={s.id} to={s.status === 'in_progress' ? `/session/resume/${s.id}` : `/session/${s.id}`}>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-2 border border-transparent hover:border-border transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-text truncate">{s.patient_name || 'Anonymous'}</div>
                        <div className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                          <span>{getDiseaseIcon(s.complaint)}</span>
                          <span className="truncate">{safeFormatDate(s.created_at, 'h:mm a')}</span>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </motion.div>
                  </Link>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Sessions Full List ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card-medical overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="section-title">{t('dashboard_flow.recent_sessions')}</div>
          <Link to="/sessions" className="flex items-center gap-1.5 text-sm font-bold text-teal-600 dark:text-teal-400 hover:gap-2.5 transition-all">
            {t('dashboard_flow.view_all')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40 rounded" />
                  <div className="skeleton h-3 w-64 rounded" />
                </div>
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-text-muted font-semibold mb-2">No sessions yet</p>
            <Link to="/session/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
              <Plus className="w-4 h-4" /> Start First Session
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentSessions.map((session, i) => {
              const [c1, c2] = avatarColor(session.patient_name || '?');
              const initials = (session.patient_name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const href = session.status === 'in_progress' ? `/session/resume/${session.id}` : `/session/${session.id}`;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                >
                  <Link to={href} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-2 dark:hover:bg-white/2 transition-colors group">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0"
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-text text-sm truncate">{session.patient_name || 'Anonymous'}</span>
                        <span className="text-text-muted text-xs">·</span>
                        <span className="text-text-muted text-xs font-medium">{session.patient_age ? `${session.patient_age}y` : ''} {session.gender || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span>{getDiseaseIcon(session.complaint || session.summary_complaint)}</span>
                        <span className="truncate max-w-xs font-medium">{session.summary_complaint || session.complaint || 'No complaint recorded'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-text-muted">{safeFormatDate(session.created_at, 'MMM dd')}</div>
                        <div className="text-xs text-text-muted/60">{safeFormatDate(session.created_at, 'h:mm a')}</div>
                      </div>
                      <StatusBadge status={session.status} />
                      <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
