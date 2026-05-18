import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

export const ResetPassword = () => {
    const { fetchWithCsrf } = useAppContext();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            toast.error('Invalid reset token.');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            if (!fetchWithCsrf) throw new Error('Security context not initialized');

            const res = await fetchWithCsrf('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await res.json();
            
            if (res.ok) {
                setSuccess(true);
                toast.success('Password successfully reset!');
            } else {
                toast.error(data.error || 'Failed to reset password');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors">
                <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl overflow-hidden border border-border p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-text tracking-tight mb-2">Password Reset Successful</h2>
                    <p className="text-text-muted mb-8">
                        Your password has been securely updated. You can now use your new password to log in to your account.
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                    >
                        Go to Login <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors">
            <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl overflow-hidden border border-border relative">
                
                {/* Decorative Header */}
                <div className="h-32 bg-gradient-to-r from-teal-600 to-indigo-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 transform rotate-3">
                        <KeyRound className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Form Content */}
                <div className="px-8 py-10 relative z-10 -mt-6 bg-surface rounded-t-3xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-text tracking-tight">Create New Password</h1>
                        <p className="text-text-muted mt-2 text-sm max-w-[280px] mx-auto">
                            Your new password must be at least 8 characters long and different from your previous password.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-text mb-1.5 ml-1">New Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-background border border-border rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text"
                                placeholder={"••••••••"}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-text mb-1.5 ml-1">Confirm New Password</label>
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={ConfirmPassword => setConfirmPassword(ConfirmPassword.target.value)}
                                className="w-full bg-background border border-border rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text"
                                placeholder={"••••••••"}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || !token}
                            className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/30 disabled:opacity-70 flex items-center justify-center mt-4"
                        >
                            {loading ? 'Reseting Password...' : 'Reset Password'}
                        </button>
                    </form>

                    {!token && (
                        <p className="mt-4 text-xs text-center text-red-500 dark:text-red-400 font-medium">
                            Missing reset token. Please use the exact link sent to your email.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
