import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Users,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Stethoscope,
  ShieldCheck,
  Plus,
  Menu,
  X,
  ChevronRight,
  Bell,
  Heart
} from 'lucide-react';
import { useAppContext, AppProvider } from './context/AppContext';

// Import Pages
import { Dashboard } from './pages/Dashboard';
import { NewSession } from './pages/NewSession';
import { SessionHistory } from './pages/SessionHistory';
import { SessionDetail } from './pages/SessionDetail';
import { PhysicianView } from './pages/PhysicianView';
import { TemplatesManager } from './pages/TemplatesManager';
import { Settings } from './pages/Settings';
import { StaffManagement } from './pages/StaffManagement';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAppContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-gradient-primary opacity-20" />
        </div>
        <p className="text-text-muted text-sm font-semibold tracking-wider uppercase animate-pulse">Loading AI4CARE...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    className="h-full"
  >
    {children}
  </motion.div>
);

// Helper: generate color from string
const stringToColor = (str: string) => {
  const colors = [
    'from-teal-500 to-emerald-500',
    'from-sky-500 to-blue-500',
    'from-violet-500 to-purple-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Sidebar = ({ onClose }: { mobileOpen?: boolean; onClose?: () => void }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { clinicName, user, logout, theme, toggleTheme } = useAppContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose?.();
  };

  const navGroups = [
    {
      label: 'Clinical',
      items: [
        { name: t('dashboard'), path: '/', icon: LayoutDashboard, desc: 'Overview & metrics' },
        { name: t('new_session'), path: '/session/new', icon: Activity, desc: 'Start patient intake', highlight: true },
        { name: t('sessions'), path: '/sessions', icon: Users, desc: 'Session history' },
      ]
    },
    {
      label: 'Management',
      items: [
        ...(user?.role === 'doctor' || user?.role === 'admin'
          ? [{ name: 'Staff', path: '/staff', icon: Users, desc: 'Manage clinic staff' }]
          : []),
        { name: t('templates'), path: '/templates', icon: FileText, desc: 'Disease protocols' },
        { name: t('settings'), path: '/settings', icon: SettingsIcon, desc: 'Account & clinic' },
      ]
    },
    ...(user?.role === 'superadmin' ? [{
      label: 'System',
      items: [{ name: 'Platform', path: '/superadmin', icon: ShieldCheck, desc: 'Platform admin' }]
    }] : []),
  ];

  const initials = (user?.fullName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarGradient = stringToColor(user?.fullName || 'User');

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'var(--gradient-sidebar)' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-teal-500/30 animate-pulse-glow">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-black text-lg tracking-tight">AI4CARE</h1>
              <span className="text-[9px] bg-teal-500/20 text-teal-300 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-teal-500/30">v2</span>
            </div>
            <p className="text-[10px] font-bold text-sky-400/70 uppercase tracking-[0.2em]">Clinical Intelligence</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="ml-auto text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 pt-4 pb-2">
        <Link
          to="/session/new"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 15px rgba(20,184,166,0.3)' }}
        >
          <Plus className="w-4 h-4" />
          New Patient Session
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] px-3 mb-2">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                        isActive
                          ? 'bg-gradient-primary shadow-sm shadow-teal-500/30'
                          : 'bg-white/5 group-hover:bg-white/10'
                      }`}>
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sky-400/60'}`} />
                      </div>
                      <span>{item.name}</span>
                      {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 text-teal-300/60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* System health indicator */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">All systems operational</span>
        </div>
      </div>

      {/* User Card */}
      <div className="mx-3 mb-4 p-3 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black text-white truncate">{user?.fullName || 'User'}</div>
            <div className="text-[9px] text-sky-400/60 font-bold uppercase tracking-widest truncate">{clinicName || user?.role}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-white/50 hover:text-white"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleLogout}
              className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-all text-rose-400"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return sidebarContent;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useAppContext();

  const pageTitle: Record<string, string> = {
    '/': 'Dashboard',
    '/session/new': 'New Session',
    '/sessions': 'Session History',
    '/templates': 'Templates',
    '/settings': 'Settings',
    '/staff': 'Staff Management',
    '/superadmin': 'Platform Admin',
  };
  const title = pageTitle[location.pathname] || 'AI4CARE';

  return (
    <div className="flex bg-background min-h-screen text-text transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="w-64 h-screen sticky top-0 shrink-0 hidden md:block overflow-hidden">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 md:hidden overflow-hidden"
            >
              <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar (Mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-xl z-30 sticky top-0 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shadow-sm"
          >
            <Menu className="w-5 h-5 text-text-muted" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-text text-base">{title}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-text-muted" />}
          </button>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3 border-b border-border bg-surface/60 backdrop-blur-xl z-20 sticky top-0 shrink-0">
          <div>
            <h2 className="font-black text-text text-lg">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center hover:border-teal-300 transition-all">
              <Bell className="w-4 h-4 text-text-muted" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Heart className="w-3.5 h-3.5 text-emerald-500 animate-heartbeat" />
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '14px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600,
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#14b8a6', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }}
      />
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/login"       element={<PageTransition><Login /></PageTransition>} />
            <Route path="/login/staff" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/register"    element={<PageTransition><Register /></PageTransition>} />
            <Route path="/physician/:id" element={<PageTransition><PhysicianView /></PageTransition>} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppLayout>
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/"                      element={<PageTransition><Dashboard /></PageTransition>} />
                      <Route path="/session/new"           element={<PageTransition><NewSession /></PageTransition>} />
                      <Route path="/session/resume/:id"    element={<PageTransition><NewSession /></PageTransition>} />
                      <Route path="/sessions"              element={<PageTransition><SessionHistory /></PageTransition>} />
                      <Route path="/session/:id"           element={<PageTransition><SessionDetail /></PageTransition>} />
                      <Route path="/templates"             element={<PageTransition><TemplatesManager /></PageTransition>} />
                      <Route path="/settings"              element={<PageTransition><Settings /></PageTransition>} />
                      <Route path="/staff"                 element={<PageTransition><StaffManagement /></PageTransition>} />
                      <Route path="/superadmin"            element={<PageTransition><SuperAdminDashboard /></PageTransition>} />
                      <Route path="*"                      element={<Navigate to="/" replace />} />
                    </Routes>
                  </AnimatePresence>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
      </Router>
    </AppProvider>
  );
}

export default App;
