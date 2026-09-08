import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Stethoscope, Mail, Lock, AlertCircle, ArrowRight, Loader2,
  Activity, Shield, Mic, Brain, CheckCircle, Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { PrivacyModal } from '../components/PrivacyModal';

const features = [
  { icon: Brain, label: 'AI Clinical Summaries', desc: 'Instant Gemini-powered HPI and red-flag detection', color: 'from-sky-500 to-blue-600' },
  { icon: Mic, label: 'Voice-to-Text Intake', desc: 'Bengali, Hindi & English — hands-free patient intake', color: 'from-teal-500 to-emerald-600' },
  { icon: Activity, label: 'Disease Protocols', desc: 'Asthma, COPD, TB, ILD, Pneumonia & 6 more', color: 'from-violet-500 to-purple-600' },
  { icon: Shield, label: 'DPDP Compliant', desc: 'Indian data protection standards — fully encrypted', color: 'from-amber-500 to-orange-600' },
];

const stats = [
  { value: '10+', label: 'Disease Protocols' },
  { value: '3', label: 'Languages' },
  { value: '∞', label: 'Patients' },
];

export const Login = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isStaffMode = location.pathname === '/login/staff';
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const navigate = useNavigate();
  const { login, fetchWithCsrf } = useAppContext();

  // Rotate feature highlight
  useEffect(() => {
    const interval = setInterval(() => setActiveFeature(i => (i + 1) % features.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters long');
    setIsSubmitting(true);
    try {
      if (!fetchWithCsrf) throw new Error('Security context not initialized');
      const res = await fetchWithCsrf('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.user);
      navigate(data.user.role === 'superadmin' ? '/superadmin' : '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Panel (Hero) ─────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[55%] p-12 relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Background decorative rings */}
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full border border-teal-500/10 animate-spin-slow" />
        <div className="absolute top-[-5%] left-[0%] w-[350px] h-[350px] rounded-full border border-sky-500/8 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '18s' }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[600px] h-[600px] rounded-full border border-teal-400/8 animate-spin-slow" style={{ animationDuration: '25s' }} />

        {/* Radial glow blobs */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-sky-500/10 rounded-full blur-[60px]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-teal-500/30">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-2xl tracking-tight">AI4CARE</div>
              <div className="text-teal-400/70 text-[11px] font-bold uppercase tracking-[0.25em]">Clinical Intelligence Platform</div>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/25 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">Designed for Respiratory Clinics</span>
            </div>
            <h1 className="text-white font-black text-4xl xl:text-5xl leading-tight mb-4">
              Smarter Patient<br />
              <span className="text-gradient bg-gradient-to-r from-teal-300 to-sky-300" style={{ background: 'linear-gradient(135deg, #5eead4 0%, #7dd3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Intake & Summaries
              </span>
            </h1>
            <p className="text-white/50 text-lg font-medium leading-relaxed max-w-md">
              Multilingual voice intake, disease-specific clinical protocols, and AI-powered summaries — built for Indian respiratory departments.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 mb-10">
            {stats.map(stat => (
              <div key={stat.label}>
                <div className="text-white font-black text-3xl">{stat.value}</div>
                <div className="text-white/40 text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 cursor-default ${
                  activeFeature === i
                    ? 'bg-white/8 border border-white/12 shadow-lg'
                    : 'bg-white/3 border border-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0 transition-all duration-300 ${activeFeature === i ? 'scale-110 shadow-lg' : ''}`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{f.label}</div>
                  <div className={`text-xs transition-all duration-300 ${activeFeature === i ? 'text-white/60' : 'text-white/30'}`}>{f.desc}</div>
                </div>
                {activeFeature === i && <CheckCircle className="ml-auto w-4 h-4 text-teal-400 animate-fade-in" />}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="relative z-10 flex items-center gap-6">
          {['🔒 AES-256 Encrypted', '🇮🇳 DPDP Compliant', '🏥 Clinic-First Design'].map(badge => (
            <div key={badge} className="flex items-center gap-1.5 text-white/30 text-xs font-semibold">{badge}</div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (Form) ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo (shown only on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-black text-2xl text-text">AI4CARE</h1>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-text tracking-tight">
              {isStaffMode ? 'Staff Sign In' : 'Welcome Back'}
            </h2>
            <p className="text-text-muted mt-2 font-medium">
              {isStaffMode
                ? 'Enter your clinic ID and credentials to access'
                : 'Sign in to your AI4CARE clinical workspace'}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-surface rounded-3xl border border-border p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 animate-fade-in-up">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</span>
                </div>
              )}

              {/* Clinic ID (staff mode) */}
              {isStaffMode && (
                <div>
                  <label className="text-sm font-bold text-text-muted block mb-2">{t('common.clinic_id')}</label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={tenantId}
                      onChange={e => setTenantId(e.target.value)}
                      className="input-medical font-mono"
                      placeholder="clinic-unique-id"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-sm font-bold text-text-muted block mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-medical"
                    placeholder="your@clinic.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-text-muted">Password</label>
                  <Link to="/forgot-password" className="text-xs font-bold text-teal-600 hover:text-teal-500 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-medical"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-base mt-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                ) : (
                  <>{isStaffMode ? 'Access Workspace' : 'Sign In to AI4CARE'} <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <Link
                to={isStaffMode ? '/login' : '/login/staff'}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/15 border border-teal-200 dark:border-teal-500/20 transition-all"
              >
                {isStaffMode ? 'Switch to Admin / Doctor Login' : 'Switch to Staff Login'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-text-muted text-sm font-medium">
                New clinic?{' '}
                <Link to="/register" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
                  Register AI4CARE for your clinic
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-text-muted text-xs mt-6 font-medium">
            &copy; 2024 AI4CARE. Clinical data is encrypted.{' '}
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline"
            >
              Privacy & DPDP Policy
            </button>
          </p>
        </div>
      </div>

      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
};
