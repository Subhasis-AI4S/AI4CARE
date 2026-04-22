import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Printer, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'MMMM dd, yyyy') => {
    if (!dateStr) return 'N/A';
    try {
        return format(parseISO(dateStr), formatStr);
    } catch (e) {
        return 'Invalid Date';
    }
};

export const PhysicianView = () => {
    const { id } = useParams();
    const { clinicName, doctorName, user, logout, fetchWithCsrf } = useAppContext();
    const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [meds, setMeds] = useState('');
    const [tests, setTests] = useState('');

    useEffect(() => {
        if (!user || !fetchWithCsrf) return;

        fetchWithCsrf(`/api/sessions/${id}`)
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                return res.json();
            })
            .then(resData => {
                if (resData) {
                    setData(resData);
                    setMeds(resData.summary?.suggested_medications || '');
                    setTests(resData.summary?.suggested_tests || '');
                }
                setLoading(false);
            })
    }, [id, user]);

    const handleSaveRecommendations = async () => {
        if (!fetchWithCsrf) return;
        setSaving(true);
        try {
            const res = await fetchWithCsrf(`/api/sessions/${id}/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data.summary,
                    suggested_medications: meds,
                    suggested_tests: tests
                })
            });
            if (res.status === 401 || res.status === 403) return logout();
            alert('Recommendations saved successfully.');
        } catch (err) {
            alert('Failed to save recommendations.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
            <div className="text-center animate-pulse">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <div className="w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium tracking-wide font-serif">Retrieving Medical Record...</p>
            </div>
        </div>
    );
    
    if (!data || !data.session) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
            <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Session Not Found</h1>
                <p className="text-slate-500 mb-6">The requested medical session could not be found or you do not have permission to view it.</p>
                <Link to="/sessions" className="text-teal-600 font-medium hover:underline">Back to History</Link>
            </div>
        </div>
    );

    const { session } = data;
    const summary = data.summary || {
        chief_complaint: session.complaint,
        history_of_presenting_illness: "Medical history collection completed. Clinical summary is being processed or was skipped.",
        key_findings: [],
        clinical_flags: ["Summary Pending / Manual Review Required"],
        assessment_notes: "Physician assessment required. Automated summary was not generated of is still in queue.",
        suggested_medications: "",
        suggested_tests: ""
    };
    
    let flags = [];
    try { 
        if (summary?.clinical_flags) {
            flags = JSON.parse(summary.clinical_flags); 
        }
    } catch (e) {}
    if (!Array.isArray(flags)) flags = [];
    
    // Filter out automated AI failure messages for a cleaner clinical view
    flags = flags.filter((f: string) => 
        f && 
        typeof f === 'string' &&
        !f.toLowerCase().includes('ai summary') && 
        !f.toLowerCase().includes('generation failed')
    );

    let keyFindings = [];
    try { 
        if (summary?.key_findings) {
            keyFindings = JSON.parse(summary.key_findings); 
        }
    } catch (e) {}
    if (!Array.isArray(keyFindings)) keyFindings = [];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            <div className="max-w-4xl mx-auto p-10 font-sans print:p-0 print:max-w-none">
                
                {/* Header elements usually hidden in print, we provide a print button */}
                <div className="flex justify-between items-center mb-10 print:hidden">
                    <Link to="/sessions" className="flex items-center text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
                    </Link>
                    <button onClick={() => window.print()} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors font-medium shadow-sm">
                        <Printer className="w-5 h-5 mr-1.5" /> Print Summary
                    </button>
                </div>

                {/* Document Header */}
                <div className="border-b-4 border-slate-800 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{clinicName}</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">Physician: Dr. {doctorName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700/50 px-3 py-1 rounded inline-block">CONSULTATION SUMMARY</p>
                        <p className="text-slate-500 font-medium">Session ID: #{id} • {safeFormatDate(session.created_at, 'MMMM dd, yyyy h:mm a')}</p>
                    </div>
                </div>

                {/* Patient Block */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-lg mb-8 flex justify-between items-center print:border-2 print:border-slate-800 print:bg-white dark:bg-slate-900">
                    <div>
                        <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">PATIENT NAME</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{session.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">DETAILS</p>
                        <p className="text-xl text-slate-800 dark:text-slate-200">{session.age} yrs • {session.gender || 'Unknown'}</p>
                    </div>
                </div>

                {/* Critical Flags */}
                {flags && flags.length > 0 && flags.some((f:string) => f.trim()) && (
                    <div className="bg-white dark:bg-slate-900 border-2 border-red-600 p-6 rounded-lg mb-8 shadow-sm">
                        <h2 className="text-red-700 font-bold text-lg flex items-center mb-3 uppercase tracking-wider">
                            <AlertTriangle className="w-6 h-6 mr-2 stroke-2" /> CRITICAL FLAGS
                        </h2>
                        <ul className="list-disc pl-6 text-red-900 text-lg space-y-2 font-medium">
                            {flags.map((f: string, i: number) => f.trim() && <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                )}

                {/* Formatted Content */}
                <div className="space-y-10 text-slate-800 dark:text-slate-200">
                    
                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">Chief Complaint</h2>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">{summary.chief_complaint || 'N/A'}</p>
                    </div>

                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">History of Presenting Illness</h2>
                        <div className="text-lg leading-relaxed space-y-4">
                            {(summary.history_of_presenting_illness?.split('\n') || []).map((p: string, i: number) => (
                                p.trim() && <p key={i}>{p}</p>
                            ))}
                            {(!summary.history_of_presenting_illness || summary.history_of_presenting_illness.trim() === '') && <p>No history recorded.</p>}
                        </div>
                    </div>

                    {keyFindings.length > 0 && keyFindings.some((k:string) => k.trim()) && (
                        <div>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">Key Findings from Records</h2>
                            <ul className="list-disc pl-6 text-lg space-y-2 leading-relaxed">
                                {keyFindings.map((f: string, i: number) => f.trim() && <li key={i}>{f}</li>)}
                            </ul>
                        </div>
                    )}

                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">Clinical Assessment & Notes</h2>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">{summary.assessment_notes || 'No objective notes recorded.'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t-2 border-slate-800">
                        <div className="bg-teal-50/30 p-8 rounded-2xl border-2 border-teal-100/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Shield className="w-24 h-24 text-teal-900" />
                            </div>
                            <h2 className="text-xl font-bold text-teal-800 uppercase tracking-wider mb-4 flex items-center">
                                <span className="mr-3 text-3xl font-serif">Rx</span> Medications & Dosage
                            </h2>
                            <textarea
                                value={meds}
                                onChange={(e) => setMeds(e.target.value)}
                                readOnly={!isDoctor}
                                className={`w-full min-h-[200px] p-4 bg-white/80 dark:bg-slate-900/80 border border-teal-200 rounded-xl text-slate-800 dark:text-slate-200 text-lg leading-relaxed focus:ring-2 focus:ring-teal-500 transition-all shadow-inner placeholder:text-slate-300 font-medium ${!isDoctor ? 'cursor-not-allowed opacity-80' : ''}`}
                                placeholder={isDoctor ? "Record prescribed medications here..." : "No medications prescribed yet."}
                            />
                        </div>
                        <div className="bg-indigo-50/30 p-8 rounded-2xl border-2 border-indigo-100/50 relative overflow-hidden">
                            <h2 className="text-xl font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center">
                                Investigations & Tests
                            </h2>
                            <textarea
                                value={tests}
                                onChange={(e) => setTests(e.target.value)}
                                readOnly={!isDoctor}
                                className={`w-full min-h-[200px] p-4 bg-white/80 dark:bg-slate-900/80 border border-indigo-200 rounded-xl text-slate-800 dark:text-slate-200 text-lg leading-relaxed focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner placeholder:text-slate-400 font-medium ${!isDoctor ? 'cursor-not-allowed opacity-80' : ''}`}
                                placeholder={isDoctor ? "Record required investigations here..." : "No tests recommended yet."}
                            />
                        </div>
                    </div>

                    {/* Raw Patient Interactions (QN ANS) */}
                    <div className="mt-12 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 print:bg-white print:border-slate-800">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                            Patient Follow-up Response Log (Raw Q&A)
                        </h2>
                        <div className="space-y-6">
                            {(data.qaPairs || []).length > 0 ? (
                                data.qaPairs.map((pair: any, i: number) => (
                                    <div key={i} className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-1">
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{pair.question}</p>
                                        <p className="text-lg text-slate-800 dark:text-slate-200 leading-snug">{pair.answer || 'No answer provided'}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 italic">No follow-up questions were logged for this session.</p>
                            )}
                        </div>
                    </div>

                    {!isDoctor && (
                        <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl text-amber-800 dark:text-amber-200 text-sm flex items-start print:hidden">
                            <Shield className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold mb-1 tracking-tight uppercase text-xs">Medical Governance Note</p>
                                <p className="leading-relaxed opacity-90">As a staff member, your access is limited to record viewing. Only an authorized Physician can finalize recommendations, investigations, and prescriptions.</p>
                            </div>
                        </div>
                    )}

                    {isDoctor && (
                        <div className="flex justify-end pt-8 print:hidden">
                            <button
                                onClick={handleSaveRecommendations}
                                disabled={saving}
                                className="bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    'Finalize & Save Consultation'
                                )}
                            </button>
                        </div>
                    )}

                </div>
                
                {/* Print Footer */}
                <div className="mt-16 pt-8 border-t-2 border-slate-200 dark:border-slate-700/50 text-center text-slate-500 text-sm hidden print:block">
                    <p>This summary was electronically generated by AI4CARE Medical Assistant.</p>
                    <p>Generated on: {format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>
            </div>
        </div>
    );
};

export default PhysicianView;
