import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, Trash2, Shield, Users, Key, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMember {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

export const StaffManagement = () => {
    const { user, logout, fetchWithCsrf } = useAppContext();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset Password state
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [resetPassword, setResetPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const fetchStaff = async () => {
        if (!fetchWithCsrf) return;
        try {
            const res = await fetchWithCsrf('/api/auth/staff');
            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            const data = await res.json();
            setStaff(data);
        } catch (err) {
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'doctor' || user?.role === 'admin') {
            fetchStaff();
        }
    }, [user]);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!fetchWithCsrf) return;
            const res = await fetchWithCsrf('/api/auth/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    fullName: newFullName
                })
            });
 
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add staff');
 
            toast.success(`Staff member ${newFullName} added successfully.`);
            setNewEmail('');
            setNewFullName('');
            setNewPassword('');
            setShowAddForm(false);
            fetchStaff();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveStaff = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

        try {
            if (!fetchWithCsrf) return;
            const res = await fetchWithCsrf(`/api/auth/staff/${id}`, {
                method: 'DELETE'
            });
 
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to remove staff');
            }
 
            toast.success('Staff member removed.');
            fetchStaff();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleResetPassword = async (id: string) => {
        if (!resetPassword || resetPassword.length < 4) {
            toast.error('Password must be at least 4 characters');
            return;
        }

        setIsResetting(true);
        try {
            if (!fetchWithCsrf) return;
            const res = await fetchWithCsrf(`/api/auth/staff/${id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: resetPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            toast.success('Password updated successfully');
            setResettingId(null);
            setResetPassword('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsResetting(false);
        }
    };

    if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Access Denied. Only doctors can manage staff.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
                        <Users className="w-8 h-8 mr-3 text-teal-600" />
                        Staff Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage users who can perform patient intake for your clinic.</p>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-medium"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {showAddForm ? 'Cancel' : 'Add Staff Member'}
                </button>
            </div>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 mb-8 overflow-hidden"
                    >
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Create New Staff Account</h2>
                        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                value={newFullName}
                                onChange={(e) => setNewFullName(e.target.value)}
                                required
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <input 
                                type="password" 
                                placeholder="Set Password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <div className="md:col-span-3 flex justify-end mt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-all font-medium"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Staff Account'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Email</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Role</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Joined</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading staff members...</td>
                            </tr>
                        ) : staff.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No staff members added yet.</td>
                            </tr>
                        ) : (
                            <AnimatePresence>
                                {staff.map((member, idx) => (
                                    <motion.tr 
                                        key={member.id} 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-slate-50 dark:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{member.full_name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{member.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${member.role === 'doctor' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                                            {new Date(member.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {resettingId === member.id ? (
                                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                                        <input 
                                                            type="text" 
                                                            placeholder="New PW" 
                                                            className="w-24 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                            value={resetPassword}
                                                            onChange={(e) => setResetPassword(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button 
                                                            onClick={() => handleResetPassword(member.id)}
                                                            disabled={isResetting}
                                                            className="p-1 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => { setResettingId(null); setResetPassword(''); }}
                                                            className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => setResettingId(member.id)}
                                                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-all"
                                                            title="Reset Password"
                                                        >
                                                            <Key className="w-5 h-5" />
                                                        </button>
                                                        {member.id !== user.id && (
                                                            <button 
                                                                onClick={() => handleRemoveStaff(member.id, member.full_name)}
                                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                                title="Remove Staff"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
