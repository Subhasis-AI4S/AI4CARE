import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, isSameDay, parseISO, isValid } from 'date-fns';
import { Activity, CheckCircle, Clock, AlertTriangle, User, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateStr) return 'N/A';
    try {
        const d = parseISO(dateStr);
        if (!isValid(d)) return 'Invalid Date';
        return format(d, formatStr);
    } catch (e) {
        return 'Invalid Date';
    }
};

const safeIsSameDay = (dateStr: string | null | undefined, compareDate: Date) => {
    if (!dateStr) return false;
    try {
        const d = parseISO(dateStr);
        if (!isValid(d)) return false;
        return isSameDay(d, compareDate);
    } catch (e) {
        return false;
    }
};

export const Dashboard = () => {
    const { t } = useTranslation();
    const { logout, doctorName, clinicName, user, fetchWithCsrf } = useAppContext();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            if (!user || !fetchWithCsrf) return;
            try {
                const res = await fetchWithCsrf('/api/sessions');
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                const data = await res.json();
                if (data) setSessions(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();
    }, [user, fetchWithCsrf]);

    const stats = useMemo(() => {
        const today = new Date();
        const todaySessions = (sessions || []).filter((s: any) => safeIsSameDay(s.created_at, today));
        return {
            totalToday: todaySessions.length,
            completed: sessions.filter((s: any) => s.status === 'completed').length,
            pending: sessions.filter((s: any) => s.status === 'in_progress' || s.status === 'processing').length,
            flagged: sessions.filter((s: any) => s.status === 'flagged').length,
        };
    }, [sessions]);

    const chartData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const count = (sessions || []).filter((s: any) => safeIsSameDay(s.created_at, date)).length;
            data.push({
                name: format(date, 'MMM dd'),
                sessions: count
            });
        }
        return data;
    }, [sessions]);

    const distributionData = useMemo(() => {
        const completed = sessions.filter((s: any) => s.status === 'completed').length;
        const pending = sessions.filter((s: any) => s.status === 'in_progress' || s.status === 'processing').length;
        const flagged = sessions.filter((s: any) => s.status === 'flagged').length;
        
        return [
            { name: t('dashboard_flow.status_completed'), value: completed, color: '#10b981' },
            { name: t('dashboard_flow.status_in_progress'), value: pending, color: '#f59e0b' },
            { name: t('dashboard_flow.status_flagged'), value: flagged, color: '#f43f5e' }
        ].filter((d: any) => d.value > 0);
    }, [sessions, t]);

    const trends = useMemo(() => {
        const lastWeekCount = (sessions || []).filter((s: any) => {
            const d = parseISO(s.created_at);
            return isValid(d) && d > subDays(new Date(), 7);
        }).length;
        const prevWeekCount = (sessions || []).filter((s: any) => {
            const d = parseISO(s.created_at);
            return isValid(d) && d <= subDays(new Date(), 7) && d > subDays(new Date(), 14);
        }).length;

        const diff = lastWeekCount - prevWeekCount;
        const percent = prevWeekCount === 0 ? 100 : Math.round((diff / prevWeekCount) * 100);

        return {
            diff,
            percent,
            isUp: diff >= 0
        };
    }, [sessions]);

    const recentSessions = sessions.slice(0, 5); // top 5

    if (loading) return <div className="p-8 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="relative flex flex-col md:flex-row justify-between items-center bg-slate-950 rounded-3xl p-6 text-white shadow-xl overflow-hidden group border border-white/5">
                <div className="absolute inset-0 bg-mesh opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />
                <div className="relative z-10 flex-1">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-1">
                        Welcome, <span className="text-secondary">Dr. {doctorName}</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest opacity-60">AI4CARE Intelligence Suite</p>
                </div>

                <div className="relative z-10 flex items-center gap-4 mt-4 md:mt-0">
                    <Link to="/session/new" className="bg-secondary hover:bg-secondary/90 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-secondary/25 flex items-center transition-premium active:scale-95 group/btn">
                        <Activity className="w-5 h-5 mr-2.5 group-hover:rotate-12 transition-transform" />
                        {t('new_session')}
                    </Link>
                </div>
            </div>

            {/* Metrics */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Link to="/sessions" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <MetricCard 
                            title={t('dashboard_flow.today_sessions')} 
                            value={stats.totalToday} 
                            icon={<Activity className="text-indigo-500 w-6 h-6" />} 
                            bg="bg-indigo-50" 
                            trend={trends}
                        />
                    </Link>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Link to="/sessions?status=completed" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <MetricCard title={t('completed_sessions')} value={stats.completed} icon={<CheckCircle className="text-emerald-500 w-6 h-6" />} bg="bg-emerald-50" />
                    </Link>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Link to="/sessions?status=in_progress" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <MetricCard title={t('dashboard_flow.in_progress')} value={stats.pending} icon={<Clock className="text-amber-500 w-6 h-6" />} bg="bg-amber-50" />
                    </Link>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Link to="/sessions?status=flagged" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <MetricCard title={t('dashboard_flow.flagged_cases')} value={stats.flagged} icon={<AlertTriangle className="text-rose-500 w-6 h-6" />} bg="bg-rose-50" />
                    </Link>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-xl font-semibold text-text mb-6">{t('dashboard_flow.activity_chart')}</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} allowDecimals={false} />
                                <Tooltip 
                                    cursor={{fill: 'var(--color-background)', opacity: 0.5}} 
                                    contentStyle={{backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                                    itemStyle={{color: 'var(--color-text)'}}
                                />
                                <Bar dataKey="sessions" fill="var(--color-accent)" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-xl font-semibold text-text mb-4">Case Distribution</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)'}} 
                                    itemStyle={{color: 'var(--color-text)'}}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-text">{t('dashboard_flow.recent_sessions')}</h2>
                        <Link to="/sessions" className="text-sm text-teal-600 font-medium hover:text-teal-700">{t('dashboard_flow.view_all')}</Link>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {recentSessions.length === 0 ? (
                            <div className="p-6 text-center text-text-muted">{t('common.no_data')}</div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {recentSessions.map((session: any) => (
                                    <li key={session.id}>
                                        <Link to={session.status === 'in_progress' ? `/session/resume/${session.id}` : `/session/${session.id}`} className="block p-4 hover:bg-background transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center">
                                                    <div className="bg-background p-2 rounded-full mr-3 text-text-muted">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text">{session.patient_name || 'Anonymous'} <span className="text-text-muted font-normal text-sm">({session.patient_age || '?'})</span></p>
                                                        <p className="text-xs text-text-muted">{safeFormatDate(session.created_at, 'MMM dd, yyyy h:mm a')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-sm text-text line-clamp-1 ml-11">
                                                {session.summary_complaint || session.complaint}
                                            </div>
                                            <div className="mt-2 ml-11">
                                                <StatusBadge status={session.status} />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    switch (status) {
        case 'completed':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-accent/10 text-accent uppercase tracking-wider"><CheckCircle className="w-3 h-3 mr-1" /> {t('dashboard_flow.status_completed')}</span>;
        case 'flagged':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"><AlertTriangle className="w-3 h-3 mr-1" /> {t('dashboard_flow.status_flagged')}</span>;
        case 'processing':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"><Clock className="w-3 h-3 mr-1 animate-pulse" /> AI Processing...</span>;
        default:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3 mr-1" /> {t('dashboard_flow.status_in_progress')}</span>;
    }
};

const MetricCard = ({ title, value, icon, trend }: any) => {
    return (
        <div className="glass-card p-6 rounded-[2rem] flex items-center h-full hover-lift group overflow-hidden relative border border-white/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className={`p-4 rounded-2xl mr-5 flex flex-shrink-0 bg-gradient-primary shadow-xl shadow-accent/20 relative z-10`}>
                <div className="text-white">
                    {icon && typeof icon === 'object' ? { ...icon, props: { ...icon.props, className: 'text-white w-6 h-6' } } : icon}
                </div>
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1 truncate">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-text">{value}</p>
                    {trend && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend.isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.percent)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
