import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, ArrowRight, ArrowLeft, CheckCircle2, FileText, Upload, Sparkles, AlertCircle, Languages } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { useGemini } from '../hooks/useGemini';
import { useTranslation } from 'react-i18next';

import { useAppContext } from '../context/AppContext';

export const NewSession = () => {
    const { token, logout } = useAppContext();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { generateQuestions, generateSummary, generateDocumentNote, isLoading: geminiLoading } = useGemini();

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
        if (!id || !token) return;
        
        const loadSession = async () => {
            try {
                const res = await fetch(`/api/sessions/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
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
    }, [id, token]);

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
        
        // Create patient and session
        try {
            const pRes = await fetch('/api/patients', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(patient)
            });
            if (pRes.status === 401 || pRes.status === 403) return logout();
            const pData = await pRes.json();

            const sRes = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ patient_id: pData.id, complaint: '' }) // will update complaint later
            });
            if (sRes.status === 401 || sRes.status === 403) return logout();
            const sData = await sRes.json();
            setSessionId(sData.id);
            
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
            // Save complaint to session
            const updateRes = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        const qaRes = await fetch(`/api/sessions/${sessionId}/qa`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
            
            const res = await fetch(`/api/sessions/${sessionId}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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
            // Update summary in DB
            const sumRes = await fetch(`/api/sessions/${sessionId}/summary`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(summary)
            });
            if (sumRes.status === 401 || sumRes.status === 403) return logout();

            // Mark session complete
            await fetch(`/api/sessions/${sessionId}/status`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'completed' })
            });
            
            setIsComplete(true);
        } catch (err) {
            alert('Failed to finalize session');
        }
    };

    // --- Renderers ---
    const renderStepTracker = () => {
        const steps = [
            t('new_session_flow.step_1'), 
            t('new_session_flow.step_2'), 
            t('new_session_flow.step_3'), 
            t('new_session_flow.step_4'), 
            t('new_session_flow.step_5')
        ];
        return (
            <div className="flex items-center justify-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                {steps.map((label, i) => (
                    <div key={label} className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step > i + 1 ? 'bg-teal-600 text-white' : step === i + 1 ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-600 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                            {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                        </div>
                        <span className={`mx-3 text-sm font-medium ${step === i + 1 ? 'text-teal-800' : 'text-slate-400'}`}>{label}</span>
                        {i < steps.length - 1 && <div className={`w-8 h-0.5 mx-2 rounded ${step > i + 1 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>}
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
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Session Complete!</h1>
                <p className="text-slate-600 mb-8 max-w-md">The patient intake session has been successfully recorded and the clinical summary is ready for the physician.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate(`/physician/${sessionId}`)} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
                        Open Physician View
                    </button>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-white text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-slate-200">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">{t('new_session')}</h1>
            {renderStepTracker()}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex-1 flex flex-col">
                
                {/* STEP 1: PATIENT INFO */}
                {step === 1 && (
                    <div className="flex-1 animate-in fade-in duration-300 overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Patient Details</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                                <input value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Age <span className="text-red-500">*</span></label>
                                <input value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="e.g. 45" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                                <select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500">
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Number</label>
                                <input value={patient.contact} onChange={e => setPatient({...patient, contact: e.target.value})} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500" placeholder="Optional" />
                            </div>

                            <div className="col-span-2 bg-slate-50 p-6 rounded-2xl border border-dashed border-teal-200 mt-4">
                                <div className="flex items-center mb-4">
                                    <Languages className="w-5 h-5 text-teal-600 mr-2" />
                                    <h3 className="font-bold text-slate-800">Patient Interview Language</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">The AI will use this language for voice recognition and follow-up questions.</p>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'en', name: 'English', icon: '🇺🇸' },
                                        { id: 'hi', name: 'Hindi', icon: '🇮🇳' },
                                        { id: 'bn', name: 'Bengali', icon: '🇧🇩' }
                                    ].map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => setInterviewLanguage(lang.id)}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${interviewLanguage === lang.id ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'}`}
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
                            <h2 className="text-xl font-bold text-slate-800">Chief Complaint</h2>
                            <div className="flex items-center text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-sm font-semibold border border-teal-100">
                                <Languages className="w-3.5 h-3.5 mr-1.5" /> 
                                {interviewLanguage === 'en' ? 'English' : interviewLanguage === 'hi' ? 'Hindi' : 'Bengali'} Mode
                            </div>
                        </div>
                        <p className="text-slate-500 mb-6 border-b border-slate-100 pb-4">Describe why the patient is visiting today. You can type or use voice dictation.</p>
                        
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Complaint Description</label>
                            <textarea 
                                value={complaintText}
                                onChange={e => {
                                    if (!isListening) {
                                        setComplaintText(e.target.value);
                                    }
                                }}
                                className={`w-full flex-1 min-h-[200px] p-4 bg-slate-50 border rounded-2xl focus:ring-2 transition-all resize-none text-lg leading-relaxed ${isListening ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200 focus:ring-teal-500'}`}
                                placeholder="Start typing or click the microphone to speak..."
                            />
                            
                            <div className="mt-6 flex flex-col items-center justify-center space-y-4">
                                {supported ? (
                                    <button 
                                        onClick={isListening ? stopListening : () => startListening(complaintText)}
                                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105'}`}
                                    >
                                        {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                                    </button>
                                ) : (
                                    <div className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Voice recognition not supported in this browser. Please type.</div>
                                )}
                                <span className={`text-sm font-medium transition-opacity ${isListening ? 'text-teal-600 block' : 'text-slate-400'}`}>
                                    {isListening ? 'Listening...' : 'Click to Speak'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-medium flex items-center px-4 py-2">
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
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-800">Targeted Follow-up</h2>
                            <div className="bg-teal-100 text-teal-800 text-sm font-bold px-3 py-1 rounded-full">
                                Question {currentQIndex + 1} of {aiQuestions.length}
                            </div>
                        </div>
                        <p className="text-slate-500 mb-6 border-b border-slate-100 pb-4">These questions were generated by AI based on the chief complaint.</p>
                        
                        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center">
                            <div className="bg-gradient-to-br from-indigo-50 to-teal-50 p-8 rounded-3xl border border-teal-100 shadow-sm mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-24 h-24 text-teal-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-slate-800 relative z-10 leading-snug">"{aiQuestions[currentQIndex]}"</h3>
                            </div>

                            <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Patient's Answer</label>
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
                                    className={`w-full min-h-[120px] p-5 bg-white border rounded-2xl focus:ring-2 transition-all resize-none text-lg ${isListening ? 'border-teal-400 ring-4 ring-teal-50' : 'border-slate-300 focus:ring-teal-500'}`}
                                    placeholder="Type or dictate answer..."
                                />
                                {supported && (
                                    <button 
                                        onClick={isListening ? stopListening : () => startListening(answers[currentQIndex])}
                                        className={`absolute bottom-4 right-4 p-3 rounded-xl text-white shadow-md transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}
                                    >
                                        {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button 
                                onClick={() => {
                                    if(currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
                                    else setStep(2);
                                }} 
                                className="text-slate-500 hover:text-slate-800 font-medium flex items-center px-4 py-2"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" /> Previous Question
                            </button>
                            <button onClick={handleAnswerSubmit} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm">
                                {currentQIndex < aiQuestions.length - 1 ? 'Next Question' : 'Finish Q&A'} <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: DOCUMENTS */}
                {step === 4 && (
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Records (Optional)</h2>
                        <p className="text-slate-500 mb-6 border-b border-slate-100 pb-4">Attach any relevant past medical records, test results, or referrals.</p>
                        
                        <div className="flex-1">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-colors group mb-8"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png" />
                                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Click to upload document</h3>
                                <p className="text-slate-500 text-sm">PDF, JPG, or PNG (max 10MB)</p>
                            </div>

                            {documents.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Uploaded Files</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents.map((doc, i) => (
                                            <div key={i} className="flex items-start p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-4">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-slate-800 truncate flex-1" title={doc.filename}>{doc.filename}</p>
                                                        <a 
                                                            href={`/api/documents/${doc.id}/download?token=${localStorage.getItem('token')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded leading-none ml-2 uppercase"
                                                        >
                                                            Open
                                                        </a>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.coordinator_note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {uploadingDoc && <div className="text-center text-teal-600 animate-pulse py-4 font-medium">Processing document with AI...</div>}
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-800 font-medium flex items-center px-4 py-2">
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Q&A
                            </button>
                            <button onClick={handleGenerateSummary} disabled={geminiLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm disabled:opacity-50">
                                {geminiLoading ? 'Generating...' : <>Generate Summary <Sparkles className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUMMARY REVIEW */}
                {step === 5 && summary && (
                    <div className="flex-1 animate-in fade-in flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Review Consultation Summary</h2>
                        <p className="text-slate-500 mb-6 border-b border-slate-100 pb-4">Make any final edits before saving for the physician.</p>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Chief Complaint</label>
                                <input 
                                    value={summary.chief_complaint} 
                                    onChange={e => setSummary({...summary, chief_complaint: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">History of Presenting Illness</label>
                                <textarea 
                                    value={summary.history_of_presenting_illness} 
                                    onChange={e => setSummary({...summary, history_of_presenting_illness: e.target.value})}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-800 min-h-[150px] focus:ring-2 focus:ring-teal-500 leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Key Findings from Records</label>
                                    <textarea 
                                        value={(summary.key_findings || []).join('\n')} 
                                        onChange={e => setSummary({...summary, key_findings: e.target.value.split('\n')})}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-800 min-h-[100px] focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div className="bg-rose-50 p-4 border border-rose-200 rounded-xl relative">
                                    <label className="block text-sm font-bold text-rose-800 mb-2 uppercase tracking-wider flex items-center"><AlertCircle className="w-4 h-4 mr-1" /> Clinical Flags</label>
                                    <textarea 
                                        value={(summary.clinical_flags || []).join('\n')} 
                                        onChange={e => setSummary({...summary, clinical_flags: e.target.value.split('\n')})}
                                        className="w-full px-4 py-3 border border-rose-200 rounded-lg text-rose-900 bg-white/50 min-h-[100px] focus:ring-2 focus:ring-rose-500"
                                        placeholder="No flags detected."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Assessment Notes</label>
                                <textarea 
                                    value={summary.assessment_notes} 
                                    onChange={e => setSummary({...summary, assessment_notes: e.target.value})}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-800 min-h-[100px] focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                                    <label className="block text-sm font-bold text-teal-800 mb-2 uppercase tracking-wider flex items-center">
                                        <Sparkles className="w-4 h-4 mr-1.5" /> Suggested Medications
                                    </label>
                                    <textarea 
                                        value={summary.suggested_medications} 
                                        onChange={e => setSummary({...summary, suggested_medications: e.target.value})}
                                        className="w-full px-4 py-3 border border-teal-200 rounded-lg text-slate-800 min-h-[120px] focus:ring-2 focus:ring-teal-500 bg-white/50"
                                        placeholder="AI will suggest medications here..."
                                    />
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <label className="block text-sm font-bold text-indigo-800 mb-2 uppercase tracking-wider flex items-center">
                                        <Sparkles className="w-4 h-4 mr-1.5" /> Recommended Tests
                                    </label>
                                    <textarea 
                                        value={summary.suggested_tests} 
                                        onChange={e => setSummary({...summary, suggested_tests: e.target.value})}
                                        className="w-full px-4 py-3 border border-indigo-200 rounded-lg text-slate-800 min-h-[120px] focus:ring-2 focus:ring-indigo-500 bg-white/50"
                                        placeholder="AI will suggest tests here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                            <button onClick={() => setStep(4)} className="text-slate-500 hover:text-slate-800 font-medium flex items-center px-4 py-2">
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back
                            </button>
                            <button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all shadow-sm">
                                <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize Session
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default NewSession;
