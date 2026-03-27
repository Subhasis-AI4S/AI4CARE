import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Activity, LayoutDashboard, Users, FileText, Settings as SettingsIcon, Stethoscope, LogOut, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { token, isLoading } = useAppContext();
  const location = useLocation();

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 opacity-50"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};



const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { clinicName, user, logout } = useAppContext();

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
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col shadow-sm">
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
                      ? 'bg-teal-50 text-teal-800 font-semibold shadow-sm border border-teal-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4 px-2 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 shadow-sm shrink-0">
                {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate" title={user?.fullName}>{user?.fullName || 'Doctor'}</div>
                <div className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-wider" title={clinicName}>{clinicName}</div>
            </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4 mr-3" />
          {t('logout') || 'Logout'}
        </button>
      </div>
    </div>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen bg-[#F8FAFC]">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/staff" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/physician/:id" element={<PhysicianView />} />
          <Route path="*" element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/session/new" element={<NewSession />} />
                  <Route path="/session/resume/:id" element={<NewSession />} />
                  <Route path="/sessions" element={<SessionHistory />} />
                  <Route path="/session/:id" element={<SessionDetail />} />
                  <Route path="/templates" element={<TemplatesManager />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
