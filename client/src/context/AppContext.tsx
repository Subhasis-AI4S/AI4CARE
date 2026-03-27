import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Define the shape of our context
interface AppContextType {
  user: any | null;
  token: string | null;
  login: (token: string, user: any) => void;
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
  }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    const savedUser = localStorage.getItem('ai4care_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('ai4care_token'));
  const [clinicName, setClinicName] = useState<string>(() => {
    const savedUser = localStorage.getItem('ai4care_user');
    return savedUser ? JSON.parse(savedUser).clinicName || 'AI4CARE Clinic' : 'AI4CARE Clinic';
  });
  const [doctorName, setDoctorName] = useState<string>(() => {
    const savedUser = localStorage.getItem('ai4care_user');
    return savedUser ? JSON.parse(savedUser).fullName || 'Doctor' : 'Doctor';
  });
  const [specialization, setSpecialization] = useState<string>('');
  const [clinicAddress, setClinicAddress] = useState<string>('');
  const [clinicEmail, setClinicEmail] = useState<string>(() => {
    const savedUser = localStorage.getItem('ai4care_user');
    return savedUser ? JSON.parse(savedUser).email || '' : '';
  });
  const [clinicPhone, setClinicPhone] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const login = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('ai4care_token', newToken);
    localStorage.setItem('ai4care_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ai4care_token');
    localStorage.removeItem('ai4care_user');
  };

  const fetchSettings = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      if (data.clinic_name) setClinicName(data.clinic_name);
      if (data.doctor_name) setDoctorName(data.doctor_name);
      if (data.specialization) setSpecialization(data.specialization);
      if (data.clinic_address) setClinicAddress(data.clinic_address);
      if (data.clinic_email) setClinicEmail(data.clinic_email);
      if (data.clinic_phone) setClinicPhone(data.clinic_phone);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (settings: { 
    clinic_name?: string; 
    doctor_name?: string; 
    gemini_api_key?: string; 
    auto_save?: string; 
    export_format?: string;
    specialization?: string;
    clinic_address?: string;
    clinic_email?: string;
    clinic_phone?: string;
  }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Session expired. Please login again.');
      }
      if (!res.ok) throw new Error('Failed to update settings');
      if (settings.clinic_name) setClinicName(settings.clinic_name);
      if (settings.doctor_name) setDoctorName(settings.doctor_name);
      if (settings.specialization) setSpecialization(settings.specialization);
      if (settings.clinic_address) setClinicAddress(settings.clinic_address);
      if (settings.clinic_email) setClinicEmail(settings.clinic_email);
      if (settings.clinic_phone) setClinicPhone(settings.clinic_phone);
      
      // Update persistent user object
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
    if (user) {
      if (user.clinicName) setClinicName(user.clinicName);
      if (user.fullName) setDoctorName(user.fullName);
      if (user.email) setClinicEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      fetchSettings();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  return (
    <AppContext.Provider value={{ 
      user, token, login, logout,
      clinicName, doctorName,
      specialization, clinicAddress, clinicEmail, clinicPhone,
      isLoading, error, fetchSettings, updateSettings 
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
