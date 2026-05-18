import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Stethoscope, Mail, Lock, AlertCircle, ArrowRight, Loader2, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

export const Login = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isStaffMode = location.pathname === '/login/staff';
    const [tenantId, setTenantId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();
    const { login, fetchWithCsrf } = useAppContext();
 
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            return setError('Password must be at least 6 characters long');
        }

        setIsSubmitting(true);
 
         try {
             if (!fetchWithCsrf) throw new Error('Security context not initialized');
             
             const res = await fetchWithCsrf('/api/auth/login', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ email, password, tenantId })
             });
             
             const data = await res.json();
             
             if (!res.ok) {
                 throw new Error(data.error || 'Login failed');
             }
 
             login(data.user);
             if (data.user.role === 'superadmin') {
                 navigate('/superadmin');
             } else {
                 navigate('/');
             }
         } catch (err: any) {
             setError(err.message);
         } finally {
             setIsSubmitting(false);
         }
     };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-100/20 rounded-full blur-[120px] opacity-50 outline-none select-none pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px] opacity-50 outline-none select-none pointer-events-none" />
            
            <div className="w-full max-w-md p-8 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-header rounded-2xl flex items-center justify-center shadow-lg mb-4 transform hover:rotate-6 transition-transform">
                        <Stethoscope className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-text tracking-tight">
                        {isStaffMode ? 'Staff Sign In' : 'Clinic Sign In'}
                    </h1>
                    <p className="text-text-muted mt-2 font-medium text-center">
                        {isStaffMode ? 'Access your clinic workspace' : 'Cloud Clinical Documentation'}
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {isStaffMode && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text ml-1">{t('common.clinic_id')}</label>
                                <div className="relative group">
                                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={tenantId}
                                        onChange={(e) => setTenantId(e.target.value)}
                                        className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text placeholder:text-text-muted font-mono text-sm"
                                        placeholder="Enter clinic unique ID"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text placeholder:text-text-muted"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text placeholder:text-text-muted"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-header text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none mt-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center flex flex-col gap-4">
                        <Link 
                            to={isStaffMode ? '/login' : '/login/staff'} 
                            className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center justify-center gap-2 bg-teal-50 dark:bg-teal-900/10 py-2 rounded-xl"
                        >
                            {isStaffMode ? 'Switch to Admin Login' : 'Switch to Staff Login'}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        
                        <p className="text-text-muted text-sm font-medium">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-teal-600 font-bold hover:text-teal-700 transition-colors ml-1">
                                Join AI4CARE
                            </Link>
                        </p>
                    </div>
                </div>
                
                <p className="text-center text-text-muted text-xs mt-8 font-medium">
                    &copy; 2024 AI4CARE SaaS v1.0. All clinical data is encrypted.
                </p>
            </div>
        </div>
    );
};
