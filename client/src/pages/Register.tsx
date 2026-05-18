import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Mail, Lock, AlertCircle, ArrowRight, Loader2, Hospital, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const Register = () => {
    const [formData, setFormData] = useState({
        clinicName: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();
    const { login, fetchWithCsrf } = useAppContext();
 
     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         setFormData({ ...formData, [e.target.name]: e.target.value });
     };
 
     const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault();
         setError(null);
 
        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        if (formData.password.length < 8) {
            return setError('Password must be at least 8 characters long');
        }

        // Strong password regex: 1 upper, 1 lower, 1 digit, 1 special char
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!strongPasswordRegex.test(formData.password)) {
            return setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
        }

        setIsSubmitting(true);
 
         try {
             if (!fetchWithCsrf) throw new Error('Security context not initialized');
 
             const res = await fetchWithCsrf('/api/auth/register', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     clinicName: formData.clinicName,
                     fullName: formData.fullName,
                     email: formData.email,
                     password: formData.password
                 })
             });
             
             const data = await res.json();
             
             if (!res.ok) {
                 throw new Error(data.error || 'Registration failed');
             }
 
             login(data.user);
             navigate('/');
         } catch (err: any) {
             setError(err.message);
         } finally {
             setIsSubmitting(false);
         }
     };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12 px-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-100/20 rounded-full blur-[120px] opacity-50 outline-none select-none pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px] opacity-50 outline-none select-none pointer-events-none" />
            
            <div className="w-full max-w-lg relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 bg-gradient-header rounded-xl flex items-center justify-center shadow-lg mb-4">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-text tracking-tight">Create your Clinic</h1>
                    <p className="text-text-muted mt-2 font-medium text-center">Start your journey with professional AI diagnostics</p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text ml-1">Clinic Name</label>
                                <div className="relative group">
                                    <Hospital className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        type="text"
                                        name="clinicName"
                                        required
                                        value={formData.clinicName}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-text placeholder:text-text-muted"
                                        placeholder="City Hospital"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text ml-1">Admin Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-text placeholder:text-text-muted"
                                        placeholder="Dr. John Doe"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-text placeholder:text-text-muted"
                                    placeholder="doctor@clinic.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-text placeholder:text-text-muted"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-text placeholder:text-text-muted"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-header text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Register Clinic
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border text-center">
                        <p className="text-text-muted font-medium">
                            Already registered?{' '}
                            <Link to="/login" className="text-teal-600 font-bold hover:text-teal-700 transition-colors ml-1">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
