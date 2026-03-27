import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, Trash2, Shield, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StaffMember {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

export const StaffManagement = () => {
    const { token, user, logout } = useAppContext();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/auth/staff', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            const data = await res.json();
            setStaff(data);
        } catch (err) {
            setError('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token && user?.role === 'doctor') {
            fetchStaff();
        }
    }, [token, user]);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/staff', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    fullName: newFullName
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add staff');

            setSuccess(`Staff member ${newFullName} added successfully.`);
            setNewEmail('');
            setNewFullName('');
            setNewPassword('');
            setShowAddForm(false);
            fetchStaff();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveStaff = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

        try {
            const res = await fetch(`/api/auth/staff/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to remove staff');
            }

            setSuccess('Staff member removed.');
            fetchStaff();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return (
            <div className="p-8 text-center text-slate-500">
                <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Access Denied. Only doctors can manage staff.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
                        <Users className="w-8 h-8 mr-3 text-teal-600" />
                        Staff Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage users who can perform patient intake for your clinic.</p>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-medium"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {showAddForm ? 'Cancel' : 'Add Staff Member'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl mb-6 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl mb-6 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {success}
                </div>
            )}

            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Create New Staff Account</h2>
                    <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={newFullName}
                            onChange={(e) => setNewFullName(e.target.value)}
                            required
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <input 
                            type="password" 
                            placeholder="Set Password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Joined</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading staff members...</td>
                            </tr>
                        ) : staff.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No staff members added yet.</td>
                            </tr>
                        ) : (
                            staff.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">{member.full_name}</td>
                                    <td className="px-6 py-4 text-slate-600">{member.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${member.role === 'doctor' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {member.id !== user.id && (
                                            <button 
                                                onClick={() => handleRemoveStaff(member.id, member.full_name)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove Staff"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
