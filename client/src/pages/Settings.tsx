import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Settings = () => {
    const { t } = useTranslation();
    const { clinicName, doctorName, specialization, clinicAddress, clinicEmail, clinicPhone, updateSettings, token, logout } = useAppContext();
    
    const [localClinic, setLocalClinic] = useState(clinicName);
    const [localDoctor, setLocalDoctor] = useState(doctorName);
    const [localSpecialization, setLocalSpecialization] = useState(specialization);
    const [localAddress, setLocalAddress] = useState(clinicAddress);
    const [localEmail, setLocalEmail] = useState(clinicEmail);
    const [localPhone, setLocalPhone] = useState(clinicPhone);

    useEffect(() => {
        setLocalClinic(clinicName);
        setLocalDoctor(doctorName);
        setLocalSpecialization(specialization);
        setLocalAddress(clinicAddress);
        setLocalEmail(clinicEmail);
        setLocalPhone(clinicPhone);
    }, [clinicName, doctorName, specialization, clinicAddress, clinicEmail, clinicPhone]);

    const [apiKey, setApiKey] = useState('');
    const [autoSave, setAutoSave] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!token) return;

        // Fetch current api key status
        fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return;
                if (data.gemini_api_key) setApiKey(data.gemini_api_key);
                if (data.auto_save) setAutoSave(data.auto_save === 'true');
            });
    }, [token]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await updateSettings({
                clinic_name: localClinic,
                doctor_name: localDoctor,
                specialization: localSpecialization,
                clinic_address: localAddress,
                clinic_email: localEmail,
                clinic_phone: localPhone,
                gemini_api_key: apiKey,
                auto_save: autoSave.toString(),
                export_format: 'PDF'
            });
            setMessage({ type: 'success', text: t('settings_flow.save_success') });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || t('settings_flow.save_error') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">{t('settings')}</h1>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 flex items-center ${message.type === 'success' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">{t('settings_flow.clinic_profile')}</h2>
                    <p className="text-sm text-slate-500">{t('settings_flow.clinic_profile_desc')}</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings_flow.clinic_label')}</label>
                            <input 
                                type="text"
                                value={localClinic}
                                onChange={(e) => setLocalClinic(e.target.value)}
                                autoComplete="organization"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                placeholder="Enter clinic name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings_flow.doctor_label')}</label>
                            <input 
                                type="text"
                                value={localDoctor}
                                onChange={(e) => setLocalDoctor(e.target.value)}
                                autoComplete="name"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                placeholder="Enter physician name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Specialization</label>
                            <input 
                                type="text"
                                value={localSpecialization}
                                onChange={(e) => setLocalSpecialization(e.target.value)}
                                autoComplete="off"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                placeholder="e.g. Cardiologist, GP"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Clinic Email</label>
                            <input 
                                type="email"
                                value={localEmail}
                                onChange={(e) => setLocalEmail(e.target.value)}
                                autoComplete="email"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                placeholder="clinic@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Clinic Phone</label>
                            <input 
                                type="text"
                                value={localPhone}
                                onChange={(e) => setLocalPhone(e.target.value)}
                                autoComplete="tel"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Clinic Address</label>
                        <textarea 
                            value={localAddress}
                            onChange={(e) => setLocalAddress(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium h-24 resize-none"
                            placeholder="Full address of the clinic..."
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">{t('settings_flow.ai_title')}</h2>
                    <p className="text-sm text-slate-500">{t('settings_flow.ai_desc')}</p>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings_flow.api_key_label')}</label>
                    <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono text-sm"
                        placeholder="AIzaSy..."
                    />
                    <p className="text-xs text-slate-500 mt-2">{t('settings_flow.api_key_desc')}</p>
                    
                    <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> Why is this required?
                        </h3>
                        <div className="text-xs text-indigo-800 leading-relaxed space-y-2">
                            <p>The Google Gemini API is the "brain" of AI4CARE. It is essential for:</p>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li><strong>Clinical Precision</strong>: Generating medically-relevant follow-up questions tailored to your patient's specific symptoms.</li>
                                <li><strong>Professional Documentation</strong>: Automatically drafting a structured HPI, summary, and clinical flags in formal medical English.</li>
                                <li><strong>Document Intelligence</strong>: Analyzing and summarizing uploaded medical records.</li>
                                <li><strong>Multilingual Support</strong>: Interpreting patient inputs in different languages while maintaining standard medical records in English.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">{t('settings_flow.pref_title')}</h2>
                </div>
                <div className="p-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                            className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-slate-700 font-medium">{t('settings_flow.auto_save')}</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-8">{t('settings_flow.auto_save_desc')}</p>
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
                >
                    <Save className="w-5 h-5 mr-2" />
                    {isSaving ? t('common.loading') : t('common.save')}
                </button>
            </div>
            
            <div className="mt-12 text-center text-sm text-slate-400 pb-8">
                <p className="font-semibold">AI4CARE v1.0.0</p>
                <p>AI-powered Medical History Assistant</p>
            </div>
        </div>
    );
};

export default Settings;
