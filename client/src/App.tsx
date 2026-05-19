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
  Loader2,
  ShieldCheck
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

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 opacity-50"><Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
};



const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { clinicName, user, logout, theme, toggleTheme } = useAppContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('new_session'), path: '/session/new', icon: Activity },
    { name: t('sessions'), path: '/sessions', icon: Users },
    ...(user?.role === 'doctor' || user?.role === 'admin' ? [{ name: 'Staff Management', path: '/staff', icon: Users }] : []),
    { name: t('templates'), path: '/templates', icon: FileText },
    { name: t('settings'), path: '/settings', icon: SettingsIcon },
    ...(user?.role === 'superadmin' ? [{ name: 'Platform Management', path: '/superadmin', icon: ShieldCheck }] : []),
  ];
  return (
    <div className="w-64 bg-background border-r border-border h-screen flex flex-col transition-premium relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 mb-2 mt-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-text">AI4CARE</h1>
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] opacity-80">Intelligence</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 relative z-10 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-xl transition-premium group hover-lift ${
                    isActive
                      ? 'bg-gradient-primary text-white font-bold shadow-xl shadow-emerald-500/20'
                      : 'text-text-muted hover:bg-surface hover:text-text'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-text-muted group-hover:text-accent'}`} />
                  <span className="text-sm tracking-wide">{item.name}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-3 mx-4 mb-6 rounded-xl glass-adaptive relative z-10 border border-border/10 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3 px-1 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shadow-md shrink-0 border border-white/20 text-xs">
                {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden min-w-0">
                <div className="text-xs font-bold text-text truncate" title={user?.fullName}>{user?.fullName || 'Doctor'}</div>
                <div className="text-[9px] font-bold text-text-muted truncate uppercase tracking-tight" title={clinicName}>{clinicName}</div>
            </div>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={toggleTheme}
            className="flex-1 flex justify-center items-center py-2 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text transition-premium border border-border/10"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-warning" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={handleLogout}
            className="flex-[3] flex justify-center items-center py-2 rounded-lg text-danger hover:bg-danger/10 transition-premium border border-danger/10 font-bold text-[10px]"
            title="Logout"
          >
            <LogOut className="w-3 h-3 mr-1.5" />
            {t('logout') || 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex bg-background min-h-screen text-text transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen bg-background transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '16px',
          background: '#fff',
          color: '#1e293b',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      }} />
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/login/staff" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/physician/:id" element={<PageTransition><PhysicianView /></PageTransition>} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppLayout>
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                      <Route path="/session/new" element={<PageTransition><NewSession /></PageTransition>} />
                      <Route path="/session/resume/:id" element={<PageTransition><NewSession /></PageTransition>} />
                      <Route path="/sessions" element={<PageTransition><SessionHistory /></PageTransition>} />
                      <Route path="/session/:id" element={<PageTransition><SessionDetail /></PageTransition>} />
                      <Route path="/templates" element={<PageTransition><TemplatesManager /></PageTransition>} />
                      <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
                      <Route path="/staff" element={<PageTransition><StaffManagement /></PageTransition>} />
                      <Route path="/superadmin" element={<PageTransition><SuperAdminDashboard /></PageTransition>} />
                      <Route path="*" element={<Navigate to="/" replace />} />
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
