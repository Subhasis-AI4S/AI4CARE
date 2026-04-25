import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  Users, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Search,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SuperAdminDashboard = () => {
    const { fetchWithCsrf } = useAppContext();
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tenantsRes] = await Promise.all([
                    fetchWithCsrf('/api/superadmin/stats'),
                    fetchWithCsrf('/api/superadmin/tenants')
                ]);

                if (statsRes.status === 401 || statsRes.status === 403 || tenantsRes.status === 403) {
                    toast.error("Unauthorized access.");
                    return;
                }

                const statsData = await statsRes.json();
                const tenantsData = await tenantsRes.json();

                setStats(statsData);
                setTenants(tenantsData);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load platform data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const res = await fetchWithCsrf(`/api/superadmin/tenants/${tenantId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setTenants(tenants.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
                toast.success(`Clinic ${newStatus === 'active' ? 'activated' : 'suspended'} successfully.`);
            } else {
                toast.error("Action failed.");
            }
        } catch (err) {
            toast.error("Network error.");
        }
    };

    const filteredTenants = tenants.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-teal-600" />
                        Platform Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Oversee all clinical installations and global configurations.</p>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Clinics" 
                    value={stats?.total_tenants || 0} 
                    icon={Building2} 
                    color="teal" 
                />
                <StatCard 
                    title="Total Patients" 
                    value={stats?.total_patients || 0} 
                    icon={Users} 
                    color="blue" 
                />
                <StatCard 
                    title="Total Consultations" 
                    value={stats?.total_sessions || 0} 
                    icon={Activity} 
                    color="indigo" 
                />
                <StatCard 
                    title="Platform Users" 
                    value={stats?.total_users || 0} 
                    icon={ShieldCheck} 
                    color="purple" 
                />
            </div>

            {/* Tenant Management Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Clinic Directory</h2>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by clinic name or UUID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/30">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Clinic Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Usage</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredTenants.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
                                                {clinic.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{clinic.name}</div>
                                                <div className="text-[10px] font-mono text-slate-400">{clinic.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            clinic.status === 'active' 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                            {clinic.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-center gap-6 items-center">
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{clinic.patient_count}</div>
                                                <div className="text-[10px] text-slate-400 uppercase">Patients</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{clinic.session_count}</div>
                                                <div className="text-[10px] text-slate-400 uppercase">Sessions</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={() => handleToggleStatus(clinic.id, clinic.status)}
                                            className={`p-2 rounded-lg transition-all ${
                                                clinic.status === 'active' 
                                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20' 
                                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                            }`}
                                            title={clinic.status === 'active' ? 'Suspend Clinic' : 'Activate Clinic'}
                                        >
                                            {clinic.status === 'active' ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colors: any = {
        teal: 'from-teal-500/10 to-teal-500/5 text-teal-600 border-teal-100 dark:border-teal-900/50',
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-100 dark:border-blue-900/50',
        indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-100 dark:border-indigo-900/50',
        purple: 'from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-100 dark:border-purple-900/50'
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} p-6 rounded-3xl border border shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl">
                    <Icon className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 opacity-50" />
            </div>
            <div className="text-3xl font-black mb-1">{value.toLocaleString()}</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-70">{title}</div>
        </div>
    );
};
