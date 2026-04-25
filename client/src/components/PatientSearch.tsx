import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Phone, Hash, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
}

interface PatientSearchProps {
  onSelect: (patient: Patient) => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({ onSelect }) => {
  const { fetchWithCsrf } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithCsrf!(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithCsrf]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  return (
    <div className="w-full space-y-4">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Name, Phone, or Patient ID..."
          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-slate-900 dark:text-slate-100"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="relative">
        {hasSearched && results.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-20">
            <div className="max-h-[300px] overflow-y-auto">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => onSelect(patient)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                        {patient.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {patient.contact || 'No contact'}
                        </span>
                        <span className="flex items-center gap-1 font-mono uppercase">
                          <Hash className="w-3 h-3" /> {patient.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Select
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasSearched && results.length === 0 && !loading && (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">No patients found</p>
            <p className="text-xs text-slate-400 mt-1">Try a different name, phone number, or ID</p>
          </div>
        )}
      </div>
    </div>
  );
};
