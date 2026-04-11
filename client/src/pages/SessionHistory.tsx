import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Eye, Trash2, SlidersHorizontal, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from './Dashboard';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateStr) return 'N/A';
    try {
        return format(parseISO(dateStr), formatStr);
    } catch (e) {
        return 'Invalid Date';
    }
};

import { useAppContext } from '../context/AppContext';

export const SessionHistory = () => {
    const { t } = useTranslation();
    const { logout, user, fetchWithCsrf } = useAppContext();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();
    
    // Get status from URL if present
    const queryParams = new URLSearchParams(location.search);
    const initialStatus = queryParams.get('status') || 'all';
    const [statusFilter, setStatusFilter] = useState(initialStatus);

    const fetchSessions = async () => {
        if (!user || !fetchWithCsrf) return;
        setLoading(true);
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

    useEffect(() => {
        if (user) fetchSessions();
    }, [user]);

    // Also update filter if URL changes
    useEffect(() => {
        const newStatus = queryParams.get('status') || 'all';
        setStatusFilter(newStatus);
    }, [location.search]);

    const handleDelete = async (id: number) => {
        if (!confirm(t('sessions_flow.delete_confirm'))) return;
        
        try {
            if (!fetchWithCsrf) return;
            const res = await fetchWithCsrf(`/api/sessions/${id}`, {
                method: 'DELETE'
            });
            if (res.status === 401 || res.status === 403) return logout();
            
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== id));
                toast.success(t('sessions_flow.delete_success') || 'Session deleted');
            } else {
                toast.error(t('sessions_flow.delete_error'));
            }
        } catch (err) {
            console.error(err);
            toast.error(t('common.error'));
        }
    };

    const filteredSessions = sessions.filter(s => {
        const nameMatch = (s.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const complaintMatch = (s.complaint || s.summary_complaint || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSearch = nameMatch || complaintMatch;
        let matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        
        // Group 'processing' with 'in_progress' for the filter
        if (statusFilter === 'in_progress' && s.status === 'processing') {
            matchesStatus = true;
        }
        
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{t('sessions')}</h1>
                <p className="text-slate-500 mt-1">{t('sessions_flow.subtitle')}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 min-w-[300px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder={t('sessions_flow.search_placeholder')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900"
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg px-3 py-2">
                            <SlidersHorizontal className="w-4 h-4 mr-2 text-slate-400" />
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent focus:outline-none border-none outline-none cursor-pointer"
                            >
                                <option value="all">{t('sessions_flow.all_statuses')}</option>
                                <option value="completed">{t('dashboard_flow.status_completed')}</option>
                                <option value="in_progress">{t('dashboard_flow.status_in_progress')}</option>
                                <option value="flagged">{t('dashboard_flow.status_flagged')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="text-center p-12 text-slate-500">
                            {t('sessions_flow.no_sessions')}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('sessions_flow.th_patient')}</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pl-16">{t('sessions_flow.th_complaint')}</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('sessions_flow.th_date')}</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('sessions_flow.th_status')}</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('sessions_flow.th_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
                                {filteredSessions.map((s, idx) => (
                                    <motion.tr 
                                        key={s.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.patient_name}</div>
                                                    <div className="text-sm text-slate-500">{s.patient_age} yrs • {s.gender || 'U'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 dark:text-slate-100 max-w-md truncate" title={s.summary_complaint || s.complaint}>{s.summary_complaint || s.complaint}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {safeFormatDate(s.created_at)}<br/>
                                            <span className="text-xs text-slate-400">{safeFormatDate(s.created_at, 'h:mm a')}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={s.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <Link to={s.status === 'in_progress' ? `/session/resume/${s.id}` : `/session/${s.id}`} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg">
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                                <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionHistory;
