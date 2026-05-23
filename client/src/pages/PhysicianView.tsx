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
    const { clinicName, doctorName, licenseNumber, user, logout, fetchWithCsrf } = useAppContext();
    const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [meds, setMeds] = useState<string[]>([]);
    const [tests, setTests] = useState<string[]>([]);
    const [newMed, setNewMed] = useState('');
    const [newTest, setNewTest] = useState('');

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
                    
                    // Robust parsing for Medications
                    let initialMeds: string[] = [];
                    try {
                        const rawMeds = resData.summary?.suggested_medications || '';
                        if (rawMeds) {
                            if (rawMeds.trim().startsWith('[') || rawMeds.trim().startsWith('{')) {
                                initialMeds = JSON.parse(rawMeds);
                            } else {
                                // Fallback for legacy plain text or AI markdown blocks
                                initialMeds = rawMeds.split('\n')
                                    .map((m: string) => m.replace(/^[*•-]\s*/, '').replace(/^[\\"{}[\]]*/, '').replace(/[\\"{}[\]]*$/, '').trim())
                                    .filter((m: string) => m.length > 0);
                            }
                        }
                    } catch (e) {
                        console.error('Medication parsing failed:', e);
                        initialMeds = [resData.summary?.suggested_medications].filter(Boolean);
                    }
                    setMeds(Array.isArray(initialMeds) ? initialMeds : [initialMeds]);

                    // Robust parsing for Tests
                    let initialTests: string[] = [];
                    try {
                        const rawTests = resData.summary?.suggested_tests || '';
                        if (rawTests) {
                            if (rawTests.trim().startsWith('[') || rawTests.trim().startsWith('{')) {
                                initialTests = JSON.parse(rawTests);
                            } else {
                                initialTests = rawTests.split('\n')
                                    .map((t: string) => t.replace(/^[*•-]\s*/, '').replace(/^[\\"{}[\]]*/, '').replace(/[\\"{}[\]]*$/, '').trim())
                                    .filter((t: string) => t.length > 0);
                            }
                        }
                    } catch (e) {
                        console.error('Test parsing failed:', e);
                        initialTests = [resData.summary?.suggested_tests].filter(Boolean);
                    }
                    setTests(Array.isArray(initialTests) ? initialTests : [initialTests]);
                }
                setLoading(false);
            })
    }, [id, user]);

    const handleAddMed = () => {
        if (!newMed.trim()) return;
        setMeds([...meds, newMed.trim()]);
        setNewMed('');
    };

    const handleAddTest = () => {
        if (!newTest.trim()) return;
        setTests([...tests, newTest.trim()]);
        setNewTest('');
    };

    const handleRemoveMed = (index: number) => {
        setMeds(meds.filter((_, i) => i !== index));
    };

    const handleRemoveTest = (index: number) => {
        setTests(tests.filter((_, i) => i !== index));
    };

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
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center animate-pulse">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-text-muted font-medium tracking-wide font-serif">Retrieving Medical Record...</p>
            </div>
        </div>
    );
    
    if (!data || !data.session) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center glass-card p-8 rounded-2xl border border-white/5">
                <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
                <h1 className="text-xl font-bold text-text mb-2">Session Not Found</h1>
                <p className="text-text-muted mb-6">The requested medical session could not be found or you do not have permission to view it.</p>
                <Link to="/sessions" className="text-accent font-medium hover:underline">Back to History</Link>
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
                    <Link to="/sessions" className="flex items-center text-text-muted hover:text-text transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
                    </Link>
                    <button onClick={() => window.print()} className="flex items-center text-text border border-border rounded-lg px-4 py-2 hover:bg-background transition-colors font-medium shadow-sm">
                        <Printer className="w-5 h-5 mr-1.5" /> Print Summary
                    </button>
                </div>

                {/* Document Header */}
                <div className="border-b-4 border-text pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-text tracking-tight">{clinicName}</h1>
                        <p className="text-lg text-text-muted mt-1">Physician: Dr. {doctorName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-text-muted uppercase tracking-widest border border-border px-3 py-1 rounded inline-block">CONSULTATION SUMMARY</p>
                        <p className="text-text-muted font-medium">Session ID: #{id} • {safeFormatDate(session.created_at, 'MMMM dd, yyyy h:mm a')}</p>
                    </div>
                </div>

                {/* Patient Block */}
                <div className="glass-card border border-white/5 p-8 rounded-2xl mb-8 flex justify-between items-center print:border-2 print:border-text print:bg-white">
                    <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold mb-2">PATIENT NAME</p>
                        <p className="text-3xl font-bold text-text">{session.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold mb-2">DETAILS</p>
                        <p className="text-xl font-bold text-text">{session.age} yrs • {session.gender || 'Unknown'}</p>
                    </div>
                </div>

                {/* Critical Flags */}
                {flags && flags.length > 0 && flags.some((f:string) => f.trim()) && (
                    <div className="glass-card border-2 border-danger p-6 rounded-lg mb-8 shadow-sm">
                        <h2 className="text-danger font-bold text-lg flex items-center mb-3 uppercase tracking-wider">
                            <AlertTriangle className="w-6 h-6 mr-2 stroke-2" /> CRITICAL FLAGS
                        </h2>
                        <ul className="list-disc pl-6 text-text text-lg space-y-2 font-medium">
                            {flags.map((f: string, i: number) => f.trim() && <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                )}

                {/* Formatted Content */}
                <div className="space-y-10 text-slate-800 dark:text-slate-200">
                    
                    <div className="glass-card p-6 rounded-xl border border-white/5">
                        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-2">Chief Complaint</h2>
                        <p className="text-2xl font-bold text-text leading-snug">{summary.chief_complaint || 'N/A'}</p>
                    </div>

                    <div>
                        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-2">History of Presenting Illness</h2>
                        <div className="text-lg leading-relaxed space-y-4 text-text">
                            {(summary.history_of_presenting_illness?.split('\n') || []).map((p: string, i: number) => (
                                p.trim() && <p key={i}>{p}</p>
                            ))}
                            {(!summary.history_of_presenting_illness || summary.history_of_presenting_illness.trim() === '') && <p>No history recorded.</p>}
                        </div>
                    </div>

                    {keyFindings.length > 0 && keyFindings.some((k:string) => k.trim()) && (
                        <div>
                            <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-2">Key Findings from Records</h2>
                            <ul className="list-disc pl-6 text-lg space-y-2 leading-relaxed text-text">
                                {keyFindings.map((f: string, i: number) => f.trim() && <li key={i}>{f}</li>)}
                            </ul>
                        </div>
                    )}

                    <div>
                        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-2">Clinical Assessment & Notes</h2>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap text-text">{summary.assessment_notes || 'No objective notes recorded.'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t-2 border-text">
                        <div className="bg-surface p-8 rounded-2xl border-4 border-double border-accent/20 relative print:border-accent flex flex-col">
                            <h2 className="text-xl font-bold text-accent uppercase tracking-wider mb-6 flex items-center">
                                <span className="mr-3 text-4xl font-serif text-accent opacity-60">℞</span> Medications
                            </h2>
                            
                            <div className="flex-grow space-y-3 mb-6">
                                {meds.length > 0 ? meds.map((m, i) => (
                                    <div key={i} className="group relative flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-accent/10 hover:border-accent/40 transition-all">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                        <span className="text-lg text-text flex-grow leading-snug">{m}</span>
                                        {isDoctor && (
                                            <button 
                                                onClick={() => handleRemoveMed(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-danger hover:bg-danger/10 rounded-md transition-all flex-shrink-0 h-fit"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-text-muted italic opacity-50">No medications selected.</p>
                                )}
                            </div>

                            {isDoctor && (
                                <div className="mt-auto flex gap-2 pt-4 border-t border-accent/5">
                                    <input 
                                        type="text" 
                                        value={newMed}
                                        onChange={(e) => setNewMed(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddMed()}
                                        placeholder="Add medication..."
                                        className="flex-grow bg-white dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-accent"
                                    />
                                    <button onClick={handleAddMed} className="bg-accent text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-accent-dark transition-colors">ADD</button>
                                </div>
                            )}
                        </div>

                        <div className="bg-surface p-8 rounded-2xl border-4 border-double border-indigo-600/20 relative print:border-indigo-900 flex flex-col">
                            <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-6 flex items-center">
                                Investigations
                            </h2>

                            <div className="flex-grow space-y-3 mb-6">
                                {tests.length > 0 ? tests.map((t, i) => (
                                    <div key={i} className="group relative flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-600/10 hover:border-indigo-600/40 transition-all">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                                        <span className="text-lg text-text flex-grow leading-snug">{t}</span>
                                        {isDoctor && (
                                            <button 
                                                onClick={() => handleRemoveTest(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-danger hover:bg-danger/10 rounded-md transition-all flex-shrink-0 h-fit"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-text-muted italic opacity-50">No tests recommended.</p>
                                )}
                            </div>

                            {isDoctor && (
                                <div className="mt-auto flex gap-2 pt-4 border-t border-indigo-600/5">
                                    <input 
                                        type="text" 
                                        value={newTest}
                                        onChange={(e) => setNewTest(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTest()}
                                        placeholder="Add test..."
                                        className="flex-grow bg-white dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-600"
                                    />
                                    <button onClick={handleAddTest} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition-colors">ADD</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Patient Interactions (Formalized) */}
                    <div className="mt-12 bg-background p-8 rounded-2xl border border-dotted border-border print:bg-white print:border-text">
                        <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center print:text-text">
                            Clinical Intake Details (Patient Responses)
                        </h2>
                        <div className="space-y-4">
                            {(data.qaPairs || []).length > 0 ? (
                                data.qaPairs.map((pair: any, i: number) => (
                                    <div key={i} className="text-text flex gap-4">
                                        <span className="text-text-muted font-bold min-w-[20px]">{i+1}.</span>
                                        <div>
                                            <p className="text-sm font-semibold opacity-70 mb-0.5">{pair.question}</p>
                                            <p className="text-lg font-medium">{pair.answer || 'Nil'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-muted italic">No additional symptoms recorded.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-20 flex justify-between items-end border-t border-border pt-10 print:mt-16 print:border-text font-sans">
                        <div className="text-xs text-text-muted space-y-1">
                            <p>Verification Code: {id?.substring(0,8).toUpperCase()}</p>
                            <p>Generated by AI4CARE Healthcare System</p>
                        </div>
                        <div className="text-center min-w-[200px]">
                            <div className="border-b-2 border-border w-full mb-2"></div>
                            <p className="text-sm font-bold text-text uppercase tracking-widest">Physician Signature</p>
                            {licenseNumber && (
                                <p className="text-xs text-text-muted italic mt-1">Authorized Medical Practice License: {licenseNumber}</p>
                            )}
                        </div>
                    </div>

                    {!isDoctor && (
                        <div className="mt-12 p-6 bg-background border border-border rounded-2xl text-text-muted text-xs flex items-start print:hidden">
                            <Shield className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold mb-1 tracking-tight uppercase text-text">Medical Governance Notice</p>
                                <p className="leading-relaxed opacity-80">This consult summary is for record-keeping. Prescription authority is reserved for licensed Medical Practitioners only.</p>
                            </div>
                        </div>
                    )}

                    {isDoctor && (
                        <div className="flex justify-end pt-12 print:hidden">
                            <button
                                onClick={handleSaveRecommendations}
                                disabled={saving}
                                className="btn-gradient px-12 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Saving Final Record...
                                    </>
                                ) : (
                                    'Finalize & Issue Prescription'
                                )}
                            </button>
                        </div>
                    )}

                </div>
                
                {/* Print Footer */}
                <div className="mt-16 pt-8 border-t-2 border-border text-center text-text-muted text-sm hidden print:block">
                    <p>This summary was electronically generated by AI4CARE Medical Assistant.</p>
                    <p>Generated on: {format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>
            </div>
        </div>
    );
};

export default PhysicianView;
