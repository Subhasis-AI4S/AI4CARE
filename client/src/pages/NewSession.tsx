import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, ArrowRight, ArrowLeft, CheckCircle2, FileText, Upload, Sparkles, AlertCircle, Languages, Plus, X } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { useGemini } from '../hooks/useGemini';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

import { useAppContext } from '../context/AppContext';
import { PatientSearch } from '../components/PatientSearch';

export const NewSession = () => {
    const { id } = useParams();
    const { logout, user, fetchWithCsrf } = useAppContext();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { generateQuestions, generateSummary, generateDocumentNote, isLoading: geminiLoading } = useGemini();

    const steps = [
        { id: 1, label: t('new_session_flow.step_1') || 'Patient' },
        { id: 2, label: t('new_session_flow.step_2') || 'Complaint' },
        { id: 3, label: t('new_session_flow.step_3') || 'Q&A' },
        { id: 4, label: t('new_session_flow.step_4') || 'Records' },
        { id: 5, label: t('new_session_flow.step_5') || 'Summary' }
    ];

    const [step, setStep] = useState(1);
    const [interviewLanguage, setInterviewLanguage] = useState('en');
    
    // Step 1: Patient
    const [patient, setPatient] = useState({ name: '', age: '', gender: 'Male', contact: '' });
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<number | null>(null);

    // Step 2: Complaint
    const [complaintText, setComplaintText] = useState('');

    // Step 3: Q&A
    const [aiQuestions, setAiQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    // Step 4: Documents
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 5: Summary
    const [summary, setSummary] = useState<any>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Initial Load for Resuming Session
    useEffect(() => {
        if (!id || !user) return;
        
        const loadSession = async () => {
            try {
                if (!fetchWithCsrf) return;
                const res = await fetchWithCsrf(`/api/sessions/${id}`);
                
                if (res.status === 401) return logout();
                if (!res.ok) throw new Error('Failed to load session');
                
                const data = await res.json();
                
                // Populate State
                setSessionId(data.session.id);
                setPatient({
                    name: data.session.name,
                    age: data.session.age?.toString() || '',
                    gender: data.session.gender || 'Male',
                    contact: data.session.contact || ''
                });
                setComplaintText(data.session.complaint || '');
                if (data.qa && data.qa.length > 0) {
                    setAiQuestions(data.qa.map((q: any) => {
                        const questionText = typeof q.question === 'string' 
                            ? q.question 
                            : (q.question?.en || q.question?.hi || q.question?.bn || 'Untitled Question');
                        return { text: questionText, source: 'DB' };
                    }));
                    setAnswers(data.qa.map((q: any) => q.answer));
                    setCurrentQIndex(data.qa.length - 1); 
                }
                if (data.documents) {
                    setDocuments(data.documents);
                }
                
                // Determine Step
                if (data.summary) {
                    setSummary(data.summary);
                    setStep(5);
                } else if (data.qa && data.qa.length > 0) {
                    // Check if all answers are filled, if so go to step 4, else step 3
                    const allAnswered = data.qa.every((q: any) => q.answer && q.answer.trim().length > 0);
                    if (allAnswered) {
                        setStep(4);
                    } else {
                        // Find first unanswered
                        const index = data.qa.findIndex((q: any) => !q.answer || q.answer.trim().length === 0);
                        setCurrentQIndex(index >= 0 ? index : data.qa.length - 1);
                        setStep(3);
                    }
                } else if (data.session.complaint) {
                    setStep(3);
                    // generate questions if none exist
                    try {
                        const questions = await generateQuestions(data.session.complaint, interviewLanguage);
                        setAiQuestions(questions);
                        setAnswers(new Array(questions.length).fill(''));
                    } catch(e) { console.error(e); }
                } else {
                    setStep(2);
                }
                
            } catch (err) {
                console.error("Error loading session:", err);
                alert("Failed to load session for resumption");
                navigate('/sessions');
            }
        };
        
        loadSession();
    }, [id, user]);

    // Polling for Summary
    useEffect(() => {
        let interval: any;
        if (step === 5 && !summary && sessionId && fetchWithCsrf) {
            interval = setInterval(async () => {
                try {
                    const res = await fetchWithCsrf(`/api/sessions/${sessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.summary) {
                            setSummary(data.summary);
                            clearInterval(interval);
                        }
                    }
                } catch (e) {}
            }, 2000);
        }
        return () => {
            if (interval) clearInterval(interval);
        }
    }, [step, summary, sessionId, fetchWithCsrf]);

    // --- Hooks Override ---
    // We recreate the voice hook to use the local interviewLanguage instead of global i18n
    const { isListening, transcript, startListening, stopListening, resetTranscript, supported } = useVoice((text) => {
        if (step === 2) {
            setComplaintText(text);
        } else if (step === 3) {
            setAnswers(prev => {
                const next = [...prev];
                next[currentQIndex] = text;
                return next;
            });
        }
    }, interviewLanguage);

    // --- Actions ---

    const handlePatientSubmit = async () => {
        if (!patient.name || !patient.age) return alert('Name and age are required');
        
        try {
            if (!fetchWithCsrf) return;
            
            let finalPatientId = selectedPatientId;

            // Only create if it's a new patient (no ID selected from search)
            if (!finalPatientId) {
                const pRes = await fetchWithCsrf('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patient)
                });
                if (pRes.status === 401) return logout();
                const pData = await pRes.json();
                finalPatientId = pData.id;
            }

            const sRes = await fetchWithCsrf('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: finalPatientId, complaint: '' })
            });
            if (sRes.status === 401) return logout();
            const sData = await sRes.json();
            setSessionId(sData.id);
            
            navigate(`/session/resume/${sData.id}`, { replace: true });
            setStep(2);
        } catch (err) {
            console.error(err);
            alert('Failed to initialize session');
        }
    };

    const handleComplaintSubmit = async () => {
        const finalComplaint = complaintText || transcript;
        if (!finalComplaint.trim()) return alert('Please enter or record a complaint');
        setComplaintText(finalComplaint);
        
        try {
            if (!fetchWithCsrf) return;
            // Save complaint to session
            const updateRes = await fetchWithCsrf(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complaint: finalComplaint })
            });
            if (updateRes.status === 401) return logout();

            const questions = await generateQuestions(finalComplaint, interviewLanguage);
            setAiQuestions(questions);
            setAnswers(new Array(questions.length).fill(''));
            resetTranscript();
            setStep(3);
        } catch (err) {
            console.error(err);
            alert('Failed to generate questions. Please check your API key in Settings or try again.');
        }
    };

    const handleAnswerSubmit = async () => {
        const currentAns = answers[currentQIndex];
        if (!currentAns.trim() && !transcript.trim()) return alert('Please provide an answer');
        
        const finalAns = currentAns || transcript;
        
        const newAnswers = [...answers];
        newAnswers[currentQIndex] = finalAns;
        setAnswers(newAnswers);
        
        resetTranscript();

        // Save to DB
        if (!fetchWithCsrf) return;
        const qaRes = await fetchWithCsrf(`/api/sessions/${sessionId}/qa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: aiQuestions[currentQIndex].text,
                answer: finalAns,
                order_index: currentQIndex
            })
        });
        if (qaRes.status === 401) return logout();

        if (currentQIndex < aiQuestions.length - 1) {
            setCurrentQIndex(currentQIndex + 1);
        } else {
            setStep(4);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        const desc = prompt(`Please briefly describe what "${file.name}" is (e.g., Blood test results, previous ECG):`, '');
        if (desc === null) return; // Cancelled
        
        setUploadingDoc(true);
        try {
            // Get AI Note
            const note = await generateDocumentNote(file.name, desc, interviewLanguage);
            
            // Upload
            const formData = new FormData();
            formData.append('document', file);
            formData.append('note', note);
            
            if (!fetchWithCsrf) return;
            const res = await fetchWithCsrf(`/api/sessions/${sessionId}/documents`, {
                method: 'POST',
                body: formData
            });
            if (res.status === 401) return logout();
            const data = await res.json();
            
            setDocuments([...documents, { ...data, coordinator_note: note }]);
        } catch (err) {
            alert('Failed to upload document');
        } finally {
            setUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGenerateSummary = async () => {
        try {
            const sumData = await generateSummary(sessionId!, interviewLanguage);
            setSummary(sumData);
            setStep(5);
        } catch (err) {
            alert('Failed to generate summary');
        }
    };

    const handleFinalize = async () => {
        try {
            if (!fetchWithCsrf) return;
            // Update summary in DB
            const sumRes = await fetchWithCsrf(`/api/sessions/${sessionId}/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(summary)
            });
            if (sumRes.status === 401) return logout();

            // Mark session complete
            await fetchWithCsrf(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' })
            });
            
            setIsComplete(true);
        } catch (err) {
            alert('Failed to finalize session');
        }
    };

    // --- Renderers ---
    const renderStepTracker = () => {
        return (
            <div className="hidden md:flex justify-between items-center mb-10 bg-surface p-5 rounded-2xl border border-border shadow-sm transition-all duration-500">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-2.5 flex-1 group">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${
                                step >= s.id 
                                    ? 'bg-accent text-white shadow-[0_0_15px_rgba(13,148,136,0.4)]' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700/50 dark:border-slate-700'
                            }`}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" /> : s.id}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                                step >= s.id ? 'text-accent' : 'text-slate-400'
                            }`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-[2px] w-full mx-4 rounded-full transition-all duration-700 ${
                                step > s.id ? 'bg-accent shadow-[0_0_10px_rgba(13,148,136,0.3)]' : 'bg-slate-100 dark:bg-slate-800'
                            }`} />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (isComplete) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Session Complete!</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md">The patient intake session has been successfully recorded and the clinical summary is ready for the physician.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate(`/physician/${sessionId}`)} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
                        Open Physician View
                    </button>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:bg-slate-800/50 transition-all shadow-sm border border-slate-200 dark:border-slate-700/50">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col space-y-4">
            <h1 className="text-3xl font-bold text-text mb-2">{t('new_session')}</h1>
            {renderStepTracker()}

            <div className="bg-surface rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-border p-8 flex-1 flex flex-col transition-all duration-300">
                
                {/* STEP 1: PATIENT INFO */}
                {step === 1 && (
                    <div className="flex-1 animate-in fade-in duration-300 overflow-y-auto pr-2">
                        <div className="mb-10">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Patient Search</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Find an existing patient globally by Name, Phone, or ID.</p>
                            <PatientSearch onSelect={(p) => {
                                setPatient({
                                    name: p.name,
                                    age: p.age.toString(),
                                    gender: p.gender || 'Male',
                                    contact: p.contact || ''
                                });
                                setSelectedPatientId(p.id);
                                toast.success(`Selected patient: ${p.name}`);
                            }} />
                        </div>

                        <div className="relative mb-10">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full font-bold text-slate-400 uppercase tracking-widest text-[10px]">OR REGISTER NEW PATIENT</span>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                            {selectedPatientId ? 'Patient Details (Selected)' : 'Direct Registration'}
                            {selectedPatientId && <button onClick={() => {
                                setPatient({ name: '', age: '', gender: 'Male', contact: '' });
                                setSelectedPatientId(null);
                            }} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg ml-2 hover:bg-slate-200 transition-colors">Clear</button>}
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name <span className="text-red-500">*</span></label>
                                <input value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Age <span className="text-red-500">*</span></label>
                                <input value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} type="number" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="e.g. 45" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gender</label>
                                <select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-teal-500">
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contact Number</label>
                                <input value={patient.contact} onChange={e => setPatient({...patient, contact: e.target.value})} type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="Optional" />
                            </div>

                            <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dashed border-teal-200 mt-4">
                                <div className="flex items-center mb-4">
                                    <Languages className="w-5 h-5 text-teal-600 mr-2" />
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Patient Interview Language</h3>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">The AI will use this language for voice recognition and follow-up questions.</p>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'en', name: 'English', icon: '🇺🇸' },
                                        { id: 'hi', name: 'Hindi', icon: '🇮🇳' },
                                        { id: 'bn', name: 'Bengali', icon: '🇧🇩' }
                                    ].map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => setInterviewLanguage(lang.id)}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${interviewLanguage === lang.id ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:border-teal-300'}`}
                                        >
                                            <span className="text-xl">{lang.icon}</span>
                                            <span className="font-bold text-sm tracking-wide">{lang.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={handlePatientSubmit} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm">
                                {t('common.next')} <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: COMPLAINT CAPTURE */}
                {step === 2 && (
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Chief Complaint</h2>
                            <div className="flex items-center text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full text-sm font-semibold border border-teal-100 dark:border-teal-800/50">
                                <Languages className="w-3.5 h-3.5 mr-1.5" /> 
                                {interviewLanguage === 'en' ? 'English' : interviewLanguage === 'hi' ? 'Hindi' : 'Bengali'} Mode
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-100 pb-4">Describe why the patient is visiting today. You can type or use voice dictation.</p>
                        
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Complaint Description</label>
                            <textarea 
                                value={complaintText}
                                onChange={e => {
                                    if (!isListening) {
                                        setComplaintText(e.target.value);
                                    }
                                }}
                                className={`w-full flex-1 min-h-[200px] p-4 bg-slate-50 dark:bg-slate-800/50 border rounded-2xl focus:ring-2 transition-all resize-none text-lg leading-relaxed ${isListening ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200 dark:border-slate-700/50 focus:ring-teal-500'}`}
                                placeholder="Start typing or click the microphone to speak..."
                            />
                            
                            <div className="mt-6 flex flex-col items-center justify-center space-y-4">
                                {supported ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <button 
                                            onClick={isListening ? stopListening : () => startListening(complaintText)}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-accent hover:bg-teal-700 hover:scale-105'} relative z-10`}
                                        >
                                            {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                                        </button>
                                        
                                        {isListening && (
                                            <div className="flex gap-1.5 h-10 items-center px-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 animate-in zoom-in duration-300">
                                                {[1,2,3,4,3,2,1].map((h, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="w-1.5 bg-red-400 rounded-full animate-bounce" 
                                                        style={{height: `${h*100/4}%`, animationDelay: `${i*0.1}s`}} 
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Voice recognition not supported in this browser. Please type.</div>
                                )}
                                <span className={`text-sm font-medium transition-opacity ${isListening ? 'text-teal-600 block' : 'text-slate-400'}`}>
                                    {isListening ? 'Listening...' : 'Click to Speak'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button onClick={() => setStep(1)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 font-medium flex items-center px-4 py-2">
                                <ArrowLeft className="w-5 h-5 mr-2" /> {t('common.back')}
                            </button>
                            <button onClick={handleComplaintSubmit} disabled={geminiLoading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm disabled:opacity-50">
                                {geminiLoading ? t('common.loading') : <>{t('common.next')}: {t('new_session_flow.step_3')} <Sparkles className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: AI Q&A */}
                {step === 3 && (
                    <div className="flex-1 animate-in fade-in flex flex-col space-y-8">
                        {geminiLoading && aiQuestions.length === 0 ? (
                            <div className="space-y-8 py-6 w-full max-w-2xl mx-auto">
                                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-3/4 animate-pulse" />
                                <div className="space-y-4">
                                    <div className="h-32 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-3xl border border-border w-full animate-pulse" />
                                    <div className="h-24 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-3xl border border-border w-5/6 animate-pulse opacity-60" />
                                </div>
                                <div className="flex items-center text-accent gap-3 font-bold animate-shimmer bg-gradient-to-r from-transparent via-accent/10 to-transparent bg-[length:400%_100%] rounded-xl p-3 w-fit">
                                    <Sparkles className="w-5 h-5 animate-spin" />
                                    <span>{t('ai_analyzing')}...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-text">Targeted Follow-up</h2>
                                    <div className="bg-accent/10 text-accent text-xs font-bold px-4 py-1.5 rounded-full border border-accent/20 uppercase tracking-widest">
                                        Question {currentQIndex + 1} of {aiQuestions.length}
                                    </div>
                                </div>
                                <p className="text-text-muted mb-6 border-b border-border pb-4">These questions were generated by AI based on the chief complaint.</p>
                                
                                <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center">
                                    <div className="bg-gradient-to-br from-accent/5 to-indigo-50 dark:to-indigo-900/10 p-10 rounded-[2.5rem] border border-accent/20 shadow-inner mb-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
                                            <Sparkles className="w-32 h-32 text-accent" />
                                        </div>
                                        {aiQuestions[currentQIndex]?.source && (
                                            <div className={`absolute top-4 left-6 text-xs font-bold px-3 py-1 rounded-full border ${aiQuestions[currentQIndex].source === 'AI' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-200' : 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 border-teal-200'} uppercase tracking-wider`}>
                                                {aiQuestions[currentQIndex].source === 'AI' ? 'Generated by AI' : 'Clinical Template'}
                                            </div>
                                        )}
                                        <h3 className="text-2xl pt-6 md:text-3xl font-semibold text-text relative z-10 leading-snug">"{aiQuestions[currentQIndex]?.text}"</h3>
                                    </div>

                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 ml-1">Patient's Answer</label>
                                    <div className="relative">
                                        <textarea 
                                            value={answers[currentQIndex]}
                                            onChange={e => {
                                                if(!isListening){
                                                    const newAnswers = [...answers];
                                                    newAnswers[currentQIndex] = e.target.value;
                                                    setAnswers(newAnswers);
                                                }
                                            }}
                                            className={`w-full min-h-[120px] p-5 bg-white dark:bg-slate-900 border rounded-2xl focus:ring-2 transition-all resize-none text-lg ${isListening ? 'border-teal-400 ring-4 ring-teal-50' : 'border-slate-300 focus:ring-teal-500'}`}
                                            placeholder="Type or dictate answer..."
                                        />
                                        {supported && (
                                            <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                                {isListening && (
                                                    <div className="flex gap-1 h-6 items-center px-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        {[1,2,3,2,1].map((h, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="w-1 bg-red-400 rounded-full animate-bounce" 
                                                                style={{height: `${h*100/4}%`, animationDelay: `${i*0.1}s`}} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={isListening ? stopListening : () => startListening(answers[currentQIndex])}
                                                    className={`p-3.5 rounded-2xl text-white shadow-lg transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 group'}`}
                                                >
                                                    {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                                    <button 
                                        onClick={() => {
                                            if(currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
                                            else setStep(2);
                                        }} 
                                        className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 font-medium flex items-center px-4 py-2"
                                    >
                                        <ArrowLeft className="w-5 h-5 mr-2" /> Previous Question
                                    </button>
                                    <button onClick={handleAnswerSubmit} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm">
                                        {currentQIndex < aiQuestions.length - 1 ? 'Next Question' : 'Finish Q&A'} <ArrowRight className="w-5 h-5 ml-2" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* STEP 4: DOCUMENTS */}
                {step === 4 && (
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Upload Records (Optional)</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-100 pb-4">Attach any relevant past medical records, test results, or referrals.</p>
                        
                        <div className="flex-1">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:bg-slate-800/50 hover:border-teal-400 transition-colors group mb-8"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png" />
                                <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Click to upload document</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">PDF, JPG, or PNG (max 10MB)</p>
                            </div>

                            {documents.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Uploaded Files</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents.map((doc, i) => (
                                            <div key={i} className="flex items-start p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-4">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1" title={doc.filename}>{doc.filename}</p>
                                                        <a 
                                                            href={`/api/documents/${doc.id}/download`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded leading-none ml-2 uppercase"
                                                        >
                                                            Open
                                                        </a>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{doc.coordinator_note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {uploadingDoc && <div className="text-center text-teal-600 animate-pulse py-4 font-medium">Processing document with AI...</div>}
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button onClick={() => setStep(3)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 font-medium flex items-center px-4 py-2">
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Q&A
                            </button>
                            <button onClick={handleGenerateSummary} disabled={geminiLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm disabled:opacity-50">
                                {geminiLoading ? 'Generating...' : <>Generate Summary <Sparkles className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUMMARY REVIEW */}
                {step === 5 && !summary && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500 py-20">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Generating AI Summary...</h2>
                        <p className="text-slate-500 dark:text-slate-400">Please wait while the engine analyzes the consultation data.</p>
                    </div>
                )}
                
                {step === 5 && summary && (
                    <div className="flex-1 animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-2xl font-bold text-text mb-1">Clinical Intake Summary</h2>
                                <p className="text-text-muted text-sm italic">Synthesized by AI4CARE Engine</p>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 dark:border-indigo-900/30 text-xs font-bold uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" /> Ready for Signature
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                            {/* Chief Complaint Card */}
                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm group hover:border-accent/40 transition-colors">
                                <label className="block text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-3">Chief Complaint</label>
                                <input 
                                    value={summary.chief_complaint || ''} 
                                    onChange={e => setSummary({...summary, chief_complaint: e.target.value})}
                                    className="w-full bg-transparent text-xl font-bold text-text focus:outline-none focus:ring-b-2 focus:ring-accent border-b border-transparent focus:border-accent transition-all pb-1"
                                />
                            </div>
                            
                            {/* Detailed History */}
                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm block">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">
                                    <FileText className="w-3.5 h-3.5" /> History of Presenting Illness
                                </label>
                                <textarea 
                                    value={summary.history_of_presenting_illness || ''} 
                                    onChange={e => setSummary({...summary, history_of_presenting_illness: e.target.value})}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 border border-border rounded-2xl text-text text-base leading-relaxed focus:ring-2 focus:ring-accent transition-all min-h-[180px] resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Key Findings */}
                                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm group">
                                    <label className="flex items-center justify-between text-[10px] font-bold text-teal-600 uppercase tracking-[0.2em] mb-4">
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Key Findings</span>
                                    </label>
                                    <div className="space-y-3">
                                        {Array.isArray(summary.key_findings) && summary.key_findings.map((finding: string, idx: number) => (
                                            <div key={idx} className="flex gap-3 items-start group/item">
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-teal-50 dark:bg-teal-900/300 shrink-0 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
                                                <textarea 
                                                    value={finding}
                                                    onChange={e => {
                                                        const newArr = [...summary.key_findings];
                                                        newArr[idx] = e.target.value;
                                                        setSummary({...summary, key_findings: newArr});
                                                    }}
                                                    className="flex-1 bg-teal-50/30 dark:bg-teal-900/30 dark:bg-slate-900/50 border border-teal-100 dark:border-teal-800/50 dark:border-slate-800 rounded-xl px-3 py-2 text-text text-sm focus:ring-2 focus:ring-teal-500 transition-all resize-none min-h-[40px]"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newArr = summary.key_findings.filter((_: any, i: number) => i !== idx);
                                                        setSummary({...summary, key_findings: newArr});
                                                    }}
                                                    className="mt-1 p-1.5 text-teal-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setSummary({...summary, key_findings: [...(summary.key_findings || []), ""]})}
                                            className="ml-5 flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50/50 dark:bg-teal-900/30 hover:bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg transition-colors mt-2"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Finding
                                        </button>
                                    </div>
                                </div>

                                {/* Clinical Flags */}
                                <div className="bg-rose-50/50 dark:bg-rose-950/10 p-6 border border-rose-100 dark:border-rose-900/30 rounded-3xl shadow-sm">
                                    <label className="flex items-center justify-between text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-4">
                                        <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Critical Clinical Flags</span>
                                    </label>
                                    <div className="space-y-3">
                                        {Array.isArray(summary.clinical_flags) && summary.clinical_flags.map((flag: string, idx: number) => (
                                            <div key={idx} className="flex gap-3 items-start group/item">
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                                                <textarea 
                                                    value={flag}
                                                    onChange={e => {
                                                        const newArr = [...summary.clinical_flags];
                                                        newArr[idx] = e.target.value;
                                                        setSummary({...summary, clinical_flags: newArr});
                                                    }}
                                                    className="flex-1 bg-white/60 dark:bg-slate-900/60 dark:bg-slate-900/50 border border-rose-200 dark:border-rose-900/30 rounded-xl px-3 py-2 text-rose-900 dark:text-rose-400 text-sm focus:ring-2 focus:ring-rose-500 font-medium transition-all resize-none min-h-[40px]"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newArr = summary.clinical_flags.filter((_: any, i: number) => i !== idx);
                                                        setSummary({...summary, clinical_flags: newArr});
                                                    }}
                                                    className="mt-1 p-1.5 text-rose-300 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setSummary({...summary, clinical_flags: [...(summary.clinical_flags || []), ""]})}
                                            className="ml-5 flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-100/50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors mt-2"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Flag
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Plan of Action */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                                <div className="p-6 bg-accent/5 dark:bg-accent/10 rounded-3xl border border-accent/10 flex flex-col gap-4">
                                    <label className="block text-[10px] font-bold text-accent uppercase tracking-widest flex items-center">
                                        <Sparkles className="w-4 h-4 mr-2" /> Suggested Medications
                                    </label>
                                    <textarea 
                                        value={summary.suggested_medications} 
                                        onChange={e => setSummary({...summary, suggested_medications: e.target.value})}
                                        className="w-full px-5 py-4 border border-accent/20 rounded-2xl text-text text-sm min-h-[120px] focus:ring-2 focus:ring-accent bg-white dark:bg-slate-900 dark:bg-slate-900/60 shadow-sm"
                                        placeholder="AI will suggest medications here..."
                                    />
                                </div>
                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/30 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 dark:border-indigo-900/20 flex flex-col gap-4">
                                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                                        <Languages className="w-4 h-4 mr-2" /> Recommended Tests
                                    </label>
                                    <textarea 
                                        value={summary.suggested_tests} 
                                        onChange={e => setSummary({...summary, suggested_tests: e.target.value})}
                                        className="w-full px-5 py-4 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl text-text text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-900/60 shadow-sm"
                                        placeholder="AI will suggest tests here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-border pt-8">
                            <button 
                                onClick={() => setStep(4)} 
                                className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-text font-bold text-sm uppercase tracking-widest flex items-center transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Records
                            </button>
                            <button 
                                onClick={handleFinalize} 
                                className="bg-emerald-600 hover:bg-emerald-700 hover:scale-105 text-white px-10 py-4 rounded-2xl font-bold flex items-center transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize Consultation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewSession;
