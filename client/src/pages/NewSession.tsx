import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, ArrowRight, ArrowLeft, CheckCircle2, FileText, Upload, Sparkles, AlertCircle, Languages } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { useGemini } from '../hooks/useGemini';
import { useTranslation } from 'react-i18next';

import { useAppContext } from '../context/AppContext';

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
    const [sessionId, setSessionId] = useState<number | null>(null);

    // Step 2: Complaint
    const [complaintText, setComplaintText] = useState('');

    // Step 3: Q&A
    const [aiQuestions, setAiQuestions] = useState<string[]>([]);
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

                if (res.status === 401 || res.status === 403) return logout();
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
                    setAiQuestions(data.qa.map((q: any) => q.question));
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
                    const allAnswered = data.qa.every((q: any) => q.answer.trim().length > 0);
                    if (allAnswered && data.qa.length >= 3) {
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
                    } catch (e) { console.error(e); }
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
        if (!patient.name || !patient.age || !patient.gender || !patient.contact) {
            return alert('All patient fields (Name, Age, Gender, and Contact) are required');
        }

        // Mobile number validation: must be exactly 10 digits
        const phoneDigits = patient.contact.replace(/\D/g, ''); // Extract only digits
        if (phoneDigits.length !== 10) {
            return alert('Please enter a valid 10-digit mobile number');
        }

        // Create patient and session
        try {
            if (!fetchWithCsrf) return;
            const pRes = await fetchWithCsrf('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });
            if (pRes.status === 401 || pRes.status === 403) return logout();
            const pData = await pRes.json();

            const sRes = await fetchWithCsrf('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: pData.id, complaint: '' })
            });
            if (sRes.status === 401 || sRes.status === 403) return logout();
            const sData = await sRes.json();
            setSessionId(sData.id);
            
            navigate(`/session/resume/${sData.id}`, { replace: true });
            setStep(2);
        } catch (err) {
            console.error(err);
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
            if (updateRes.status === 401 || updateRes.status === 403) return logout();

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
                question: aiQuestions[currentQIndex],
                answer: finalAns,
                order_index: currentQIndex
            })
        });
        if (qaRes.status === 401 || qaRes.status === 403) return logout();

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
            if (res.status === 401 || res.status === 403) return logout();
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
            if (sumRes.status === 401 || sumRes.status === 403) return logout();

            // Mark session complete
            await fetchWithCsrf(`/api/sessions/${sessionId}/status`, {
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
            <div className="hidden md:flex justify-between items-center mb-10 bg-surface/50 dark:bg-slate-900/30 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm transition-all duration-500">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-2.5 flex-1 group">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${step >= s.id
                                     ? 'bg-gradient-primary text-white shadow-lg'
                                    : 'bg-background text-text-muted border border-border'
                                }`}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" /> : s.id}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${step >= s.id ? 'text-accent' : 'text-text-muted'
                                }`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-[2px] w-full mx-4 rounded-full transition-all duration-700 ${step > s.id ? 'bg-gradient-primary shadow-sm' : 'bg-background'
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
                <h1 className="text-3xl font-bold text-text mb-2">Session Complete!</h1>
                <p className="text-text-muted mb-8 max-w-md">The patient intake session has been successfully recorded and the clinical summary is ready for the physician.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate(`/physician/${sessionId}`)} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
                        Open Physician View
                    </button>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-surface text-text font-medium rounded-xl hover:bg-background transition-all shadow-sm border border-border">
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

            <div className="bg-surface rounded-2xl shadow-xl dark:shadow-none border border-border p-8 flex-1 flex flex-col transition-all duration-300">

                {/* STEP 1: PATIENT INFO */}
                {step === 1 && (
                    <div className="flex-1 animate-in fade-in duration-300 overflow-y-auto">
                        <h2 className="text-xl font-bold text-text mb-6 border-b border-border pb-4">Patient Details</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-text mb-2">Full Name <span className="text-red-500">*</span></label>
                                <input value={patient.name} onChange={e => setPatient({ ...patient, name: e.target.value })} type="text" className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-accent text-text placeholder:text-text-muted/50" placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Age <span className="text-red-500">*</span></label>
                                <input value={patient.age} onChange={e => setPatient({ ...patient, age: e.target.value })} type="number" className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-accent text-text placeholder:text-text-muted/50" placeholder="e.g. 45" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Gender <span className="text-red-500">*</span></label>
                                <select value={patient.gender} onChange={e => setPatient({ ...patient, gender: e.target.value })} className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-accent text-text">
                                    <option className="bg-surface text-text">Male</option>
                                    <option className="bg-surface text-text">Female</option>
                                    <option className="bg-surface text-text">Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-text mb-2">Contact Number <span className="text-red-500">*</span></label>
                                <input 
                                    value={patient.contact} 
                                    onChange={e => {
                                        const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPatient({ ...patient, contact: cleanVal });
                                    }} 
                                    type="tel" 
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-accent text-text placeholder:text-text-muted/50" 
                                    placeholder="e.g. 9876543210" 
                                />
                                <p className="text-[10px] text-text-muted mt-1 ml-1">Must be exactly 10 digits</p>
                            </div>

                            <div className="col-span-2 bg-background p-6 rounded-2xl border border-dashed border-teal-200 mt-4">
                                <div className="flex items-center mb-4">
                                    <Languages className="w-5 h-5 text-teal-600 mr-2" />
                                    <h3 className="font-bold text-text">Patient Interview Language</h3>
                                </div>
                                <p className="text-sm text-text-muted mb-4">The AI will use this language for voice recognition and follow-up questions.</p>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'en', name: 'English', icon: '🇺🇸' },
                                        { id: 'hi', name: 'Hindi', icon: '🇮🇳' },
                                        { id: 'bn', name: 'Bengali', icon: '🇧🇩' }
                                    ].map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => setInterviewLanguage(lang.id)}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${interviewLanguage === lang.id ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-surface border-border text-text-muted hover:border-teal-300'}`}
                                        >
                                            <span className="text-xl">{lang.icon}</span>
                                            <span className="font-bold text-sm tracking-wide">{lang.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={handlePatientSubmit} className="btn-gradient px-8 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg active:scale-95">
                                {t('common.next')} <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: COMPLAINT CAPTURE */}
                {step === 2 && (
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-text">Chief Complaint</h2>
                            <div className="flex items-center text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-4 py-1 rounded-full text-sm font-semibold border border-teal-100 dark:border-teal-900/30">
                                <Languages className="w-3.5 h-3.5 mr-1.5" />
                                {interviewLanguage === 'en' ? 'English' : interviewLanguage === 'hi' ? 'Hindi' : 'Bengali'} Mode
                            </div>
                        </div>
                        <p className="text-text-muted mb-6 border-b border-border pb-4">Describe why the patient is visiting today. You can type or use voice dictation.</p>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-text mb-2">Complaint Description</label>
                            <textarea
                                value={complaintText}
                                onChange={e => {
                                    if (!isListening) {
                                        setComplaintText(e.target.value);
                                    }
                                }}
                                className={`w-full flex-1 min-h-[200px] p-4 bg-background border rounded-2xl focus:ring-2 transition-all resize-none text-lg leading-relaxed text-text ${isListening ? 'border-accent ring-2 ring-accent/10' : 'border-border focus:ring-accent'}`}
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
                                                {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-1.5 bg-red-400 rounded-full animate-bounce"
                                                        style={{ height: `${h * 100 / 4}%`, animationDelay: `${i * 0.1}s` }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Voice recognition not supported in this browser. Please type.</div>
                                )}
                                <span className={`text-sm font-medium transition-opacity ${isListening ? 'text-teal-600 block' : 'text-text-muted'}`}>
                                    {isListening ? 'Listening...' : 'Click to Speak'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
                            <button onClick={() => setStep(1)} className="text-text-muted hover:text-text font-medium flex items-center px-4 py-2 hover-lift">
                                <ArrowLeft className="w-5 h-5 mr-2" /> {t('common.back')}
                            </button>
                            <button onClick={handleComplaintSubmit} disabled={geminiLoading} className="btn-gradient px-8 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg disabled:opacity-50 active:scale-95">
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
                                <div className="h-10 bg-background rounded-xl w-3/4 animate-pulse" />
                                <div className="space-y-4">
                                    <div className="h-32 bg-background rounded-3xl border border-border w-full animate-pulse" />
                                    <div className="h-24 bg-background rounded-3xl border border-border w-5/6 animate-pulse opacity-60" />
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
                                        <h3 className="text-2xl md:text-3xl font-semibold text-text relative z-10 leading-snug">"{aiQuestions[currentQIndex]}"</h3>
                                    </div>

                                    <label className="block text-sm font-medium text-text mb-2 ml-1">Patient's Answer</label>
                                    <div className="relative">
                                        <textarea
                                            value={answers[currentQIndex]}
                                            onChange={e => {
                                                if (!isListening) {
                                                    const newAnswers = [...answers];
                                                    newAnswers[currentQIndex] = e.target.value;
                                                    setAnswers(newAnswers);
                                                }
                                            }}
                                            className={`w-full min-h-[120px] p-5 bg-background border rounded-2xl focus:ring-2 transition-all resize-none text-lg text-text ${isListening ? 'border-accent ring-4 ring-accent/10' : 'border-border focus:ring-accent'}`}
                                            placeholder="Type or dictate answer..."
                                        />
                                        {supported && (
                                            <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                                {isListening && (
                                                    <div className="flex gap-1 h-6 items-center px-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        {[1, 2, 3, 2, 1].map((h, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-1 bg-red-400 rounded-full animate-bounce"
                                                                style={{ height: `${h * 100 / 4}%`, animationDelay: `${i * 0.1}s` }}
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

                                <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
                                    <button
                                        onClick={() => {
                                            if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
                                            else setStep(2);
                                        }}
                                        className="text-text-muted hover:text-text font-medium flex items-center px-4 py-2 hover-lift"
                                    >
                                        <ArrowLeft className="w-5 h-5 mr-2" /> Previous Question
                                    </button>
                                    <button onClick={handleAnswerSubmit} className="btn-gradient px-8 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg active:scale-95">
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
                        <h2 className="text-xl font-bold text-text mb-2">Upload Records (Optional)</h2>
                        <p className="text-text-muted mb-6 border-b border-border pb-4">Attach any relevant past medical records, test results, or referrals.</p>

                        <div className="flex-1">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-background hover:border-accent transition-colors group mb-8"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png" />
                                <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-text mb-1">Click to upload document</h3>
                                <p className="text-text-muted text-sm">PDF, JPG, or PNG (max 10MB)</p>
                            </div>

                            {documents.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-4">Uploaded Files</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents.map((doc, i) => (
                                            <div key={i} className="flex items-start p-4 bg-background border border-border rounded-xl">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg mr-4">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-text truncate flex-1" title={doc.filename}>{doc.filename}</p>
                                                        <a
                                                            href={`/api/documents/${doc.id}/download`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded leading-none ml-2 uppercase"
                                                        >
                                                            Open
                                                        </a>
                                                    </div>
                                                    <p className="text-xs text-text-muted mt-1 line-clamp-2">{doc.coordinator_note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {uploadingDoc && <div className="text-center text-accent animate-pulse py-4 font-medium">Processing document with AI...</div>}
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
                            <button onClick={() => setStep(3)} className="text-text-muted hover:text-text font-medium flex items-center px-4 py-2 hover-lift">
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Q&A
                            </button>
                            <button onClick={handleGenerateSummary} disabled={geminiLoading} className="btn-gradient px-8 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg disabled:opacity-50 active:scale-95">
                                {geminiLoading ? 'Generating...' : <>Generate Summary <Sparkles className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUMMARY REVIEW */}
                {step === 5 && summary && (
                    <div className="flex-1 animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-2xl font-bold text-text mb-1">Clinical Intake Summary</h2>
                                <p className="text-text-muted text-sm italic">Synthesized by AI4CARE Engine</p>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-bold uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" /> Ready for Signature
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-thin scrollbar-thumb-border">
                            {/* Chief Complaint Card */}
                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm group hover:border-accent/40 transition-colors">
                                <label className="block text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-3">Chief Complaint</label>
                                <input
                                    value={summary.chief_complaint}
                                    onChange={e => setSummary({ ...summary, chief_complaint: e.target.value })}
                                    className="w-full bg-transparent text-xl font-bold text-text focus:outline-none focus:ring-b-2 focus:ring-accent border-b border-transparent focus:border-accent transition-all pb-1"
                                />
                            </div>

                            {/* Detailed History */}
                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm block">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">
                                    <FileText className="w-3.5 h-3.5" /> History of Presenting Illness
                                </label>
                                <textarea
                                    value={summary.history_of_presenting_illness}
                                    onChange={e => setSummary({ ...summary, history_of_presenting_illness: e.target.value })}
                                    className="w-full px-5 py-4 bg-background border border-border rounded-2xl text-text text-base leading-relaxed focus:ring-2 focus:ring-accent transition-all min-h-[180px] resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Key Findings */}
                                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm group">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-teal-600 uppercase tracking-[0.2em] mb-4">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Key Findings
                                    </label>
                                    <textarea
                                        value={(summary.key_findings || []).join('\n')}
                                        onChange={e => setSummary({ ...summary, key_findings: e.target.value.split('\n') })}
                                        className="w-full px-4 py-3 bg-teal-50/30 dark:bg-slate-900/50 border border-teal-100 dark:border-slate-800 rounded-xl text-text text-sm min-h-[140px] focus:ring-2 focus:ring-teal-500 leading-relaxed"
                                        placeholder="No findings recorded."
                                    />
                                </div>

                                {/* Clinical Flags */}
                                <div className="bg-rose-50/50 dark:bg-rose-950/10 p-6 border border-rose-100 dark:border-rose-900/30 rounded-3xl shadow-sm">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-4">
                                        <AlertCircle className="w-3.5 h-3.5" /> Critical Clinical Flags
                                    </label>
                                    <textarea
                                        value={(summary.clinical_flags || []).join('\n')}
                                        onChange={e => setSummary({ ...summary, clinical_flags: e.target.value.split('\n') })}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-900/50 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-900 dark:text-rose-400 text-sm min-h-[140px] focus:ring-2 focus:ring-rose-500 font-medium"
                                        placeholder="No flags detected by AI."
                                    />
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
                                        onChange={e => setSummary({ ...summary, suggested_medications: e.target.value })}
                                        className="w-full px-5 py-4 border border-accent/20 rounded-2xl text-text text-sm min-h-[120px] focus:ring-2 focus:ring-accent bg-white dark:bg-slate-900/60 shadow-sm"
                                        placeholder="AI will suggest medications here..."
                                    />
                                </div>
                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 flex flex-col gap-4">
                                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                                        <Languages className="w-4 h-4 mr-2" /> Recommended Tests
                                    </label>
                                    <textarea
                                        value={summary.suggested_tests}
                                        onChange={e => setSummary({ ...summary, suggested_tests: e.target.value })}
                                        className="w-full px-5 py-4 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl text-text text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900/60 shadow-sm"
                                        placeholder="AI will suggest tests here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-border pt-8">
                            <button
                                onClick={() => setStep(4)}
                                className="px-6 py-3 text-text-muted hover:text-text font-bold text-sm uppercase tracking-widest flex items-center transition-colors"
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
