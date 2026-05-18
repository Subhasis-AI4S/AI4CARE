import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

export const ForgotPassword = () => {
    const { fetchWithCsrf } = useAppContext();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!fetchWithCsrf) throw new Error('Security context not initialized');

            const res = await fetchWithCsrf('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success('Password reset link sent!');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to request password reset');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors">
            <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl overflow-hidden border border-border relative">
                
                {/* Decorative Header */}
                <div className="h-32 bg-gradient-to-r from-teal-600 to-indigo-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 transform rotate-3">
                        <Stethoscope className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Form Content */}
                <div className="px-8 py-10 relative z-10 -mt-6 bg-surface rounded-t-3xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-text tracking-tight">Forgot Password</h1>
                        <p className="text-text-muted mt-2 text-sm max-w-[280px] mx-auto">
                            Enter your email address and we'll securely send you a link to reset your password.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="text-center bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800/50 p-6 rounded-2xl animate-in fade-in zoom-in duration-300">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-800/50 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-2">Check your email</h3>
                            <p className="text-sm text-teal-700 dark:text-teal-400/80 mb-6">
                                We've sent a password reset link to <span className="font-semibold">{email}</span>. 
                                Please check your inbox and spam folder.
                            </p>
                            <Link to="/login" className="inline-flex py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-all w-full justify-center">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-text mb-1.5 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                    <input 
                                        type="email" 
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-text placeholder:text-text-muted"
                                        placeholder="dr.smith@clinic.com"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/30 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending Request...' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    {!submitted && (
                        <div className="mt-8 text-center">
                            <Link to="/login" className="inline-flex items-center text-text-muted hover:text-text font-medium transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
