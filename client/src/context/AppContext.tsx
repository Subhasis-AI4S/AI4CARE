import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Define the shape of our context
interface AppContextType {
  user: any | null;
  login: (user: any) => void;
  logout: () => void;
  clinicName: string;
  doctorName: string;
  specialization: string;
  clinicAddress: string;
  clinicEmail: string;
  clinicPhone: string;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: { 
    clinic_name?: string; 
    doctor_name?: string; 
    gemini_api_key?: string; 
    auto_save?: string; 
    export_format?: string;
    specialization?: string;
    clinic_address?: string;
    clinic_email?: string;
    clinic_phone?: string;
    license_number?: string;
  }) => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  licenseNumber: string;
  fetchCsrfToken: () => Promise<string | null>;
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const savedUser = localStorage.getItem('ai4care_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return null;
    }
  });
  const [clinicName, setClinicName] = useState<string>('AI4CARE Clinic');
  const [doctorName, setDoctorName] = useState<string>('Doctor');
  const [specialization, setSpecialization] = useState<string>('');
  const [clinicAddress, setClinicAddress] = useState<string>('');
  const [clinicEmail, setClinicEmail] = useState<string>('');
  const [clinicPhone, setClinicPhone] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('ai4care_theme');
    if (savedTheme) return savedTheme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const fetchCsrfToken = async () => {
    try {
      const res = await fetch('/api/csrf-token', { credentials: 'include' });
      const data = await res.json();
      setCsrfToken(data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
      return null;
    }
  };

  const fetchWithCsrf = async (url: string, options: RequestInit = {}) => {
    let currentToken = csrfToken;
    if (!currentToken && url !== '/api/csrf-token') {
      currentToken = await fetchCsrfToken();
    }

    // Use Headers polyfill-safe approach
    const headers = new Headers(options.headers || {});
    if (currentToken) {
        headers.set('X-CSRF-Token', currentToken);
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (res.status === 403 && url !== '/api/csrf-token') {
      const newToken = await fetchCsrfToken();
      if (newToken) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('X-CSRF-Token', newToken);
        return fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include'
        });
      }
    }

    return res;
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ai4care_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const checkAuth = async () => {
    try {
      // First ensure we have a CSRF token
      await fetchCsrfToken();
      
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('ai4care_user', JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem('ai4care_user');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newUser: any) => {
    setUser(newUser);
    localStorage.setItem('ai4care_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await fetchWithCsrf('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    setUser(null);
    localStorage.removeItem('ai4care_user');
    setCsrfToken(null);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchWithCsrf('/api/settings');
      if (res.status === 401 || res.status === 403) {
        // Silently fail settings fetch if not authenticated yet
        return;
      }
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.clinic_name) setClinicName(data.clinic_name);
      if (data.doctor_name) setDoctorName(data.doctor_name);
      if (data.specialization) setSpecialization(data.specialization);
      if (data.clinic_address) setClinicAddress(data.clinic_address);
      if (data.clinic_email) setClinicEmail(data.clinic_email);
      if (data.clinic_phone) setClinicPhone(data.clinic_phone);
      if (data.license_number) setLicenseNumber(data.license_number);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  const updateSettings = async (settings: any) => {
    try {
      const res = await fetchWithCsrf('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Session expired. Please login again.');
      }
      if (!res.ok) throw new Error('Failed to update settings');
      // ... same updates ...
      if (settings.clinic_name) setClinicName(settings.clinic_name);
      if (settings.doctor_name) setDoctorName(settings.doctor_name);
      if (settings.specialization) setSpecialization(settings.specialization);
      if (settings.clinic_address) setClinicAddress(settings.clinic_address);
      if (settings.clinic_email) setClinicEmail(settings.clinic_email);
      if (settings.clinic_phone) setClinicPhone(settings.clinic_phone);
      if (settings.hasOwnProperty('license_number')) setLicenseNumber(settings.license_number || '');
      
      if (user) {
        const updatedUser = { 
          ...user, 
          clinicName: settings.clinic_name || user.clinicName, 
          fullName: settings.doctor_name || user.fullName 
        };
        setUser(updatedUser);
        localStorage.setItem('ai4care_user', JSON.stringify(updatedUser));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.clinicName) setClinicName(user.clinicName);
      if (user.fullName) setDoctorName(user.fullName);
      if (user.email) setClinicEmail(user.email);
      fetchSettings();
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      user, login, logout,
      clinicName, doctorName,
      specialization, clinicAddress, clinicEmail, clinicPhone,
      licenseNumber,
      isLoading, error, fetchSettings, updateSettings,
      theme, toggleTheme,
      fetchCsrfToken, fetchWithCsrf
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
