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
  Loader2
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
  ];
  return (
    <div className="w-64 bg-surface border-r border-border h-screen flex flex-col shadow-sm transition-colors duration-300">
      <div className="h-16 flex items-center px-6 bg-gradient-header text-white">
        <Stethoscope className="w-6 h-6 mr-3" />
        <span className="font-bold text-lg tracking-wide shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">AI4CARE</span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-semibold shadow-sm border border-teal-100 dark:border-teal-800/50'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 hover:text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-4 px-2 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 shadow-sm shrink-0">
                {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden min-w-0">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={user?.fullName}>{user?.fullName || 'Doctor'}</div>
                <div className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-wider" title={clinicName}>{clinicName}</div>
            </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleTheme}
            className="flex-1 flex justify-center items-center py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium border border-transparent"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={handleLogout}
            className="flex-[3] flex justify-center items-center py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all font-medium border border-transparent"
            title="Logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
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
