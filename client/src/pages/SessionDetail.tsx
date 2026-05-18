import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Printer, ArrowLeft, Download, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';


const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateStr) return 'N/A';
    try {
        return format(parseISO(dateStr), formatStr);
    } catch (e) {
        return 'Invalid Date';
    }
};

export const SessionDetail = () => {
    const { id } = useParams();
    const { clinicName, doctorName, logout, fetchWithCsrf } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        const loadDetail = async () => {
            if (!fetchWithCsrf) return;
            try {
                const res = await fetchWithCsrf(`/api/sessions/${id}`);
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                const resData = await res.json();
                if (resData) setData(resData);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load session details');
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [id, fetchWithCsrf]);

    if (loading) return <div className="p-8 flex justify-center h-full items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>;
    if (!data || !data.session) return <div className="p-8 text-center text-text-muted">Session Not Found</div>;

    const { session, qa = [], documents = [], summary } = data;

    const exportPdf = () => exportToPDF(data, clinicName, doctorName);

    const tabs = [
        { id: 'summary', name: 'Summary' },
        { id: 'qa', name: 'Patient Interaction' },
        { id: 'documents', name: `Uploaded Records (${documents.length})` }
    ];

    // Safely parse arrays (PostgreSQL pg driver returns JSONB as objects naturally)
    const getArrayData = (field: any) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [field]; // If it's just a raw string, wrap it in array
        }
    };

    const flags = getArrayData(summary?.clinical_flags).filter((f: string) => f.trim() !== '' && f !== 'Standard Intake Summary');
    const keyFindings = getArrayData(summary?.key_findings).filter((f: string) => f.trim() !== '');

    return (
        <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <Link to="/sessions" className="text-text-muted hover:text-text font-medium flex items-center mb-4 text-sm w-fit">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
                    </Link>
                    <h1 className="text-3xl font-bold text-text">{session.name}</h1>
                    <p className="text-text-muted mt-1 flex items-center">
                        {session.age} yrs • {session.gender || 'Unknown'} 
                        <span className="mx-3 opacity-20 text-text">|</span> 
                        {safeFormatDate(session.created_at, 'MMMM dd, yyyy h:mm a')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportPdf} className="bg-surface border border-border hover:bg-background text-text px-4 py-2.5 rounded-xl font-medium flex items-center shadow-sm transition-all">
                        <Download className="w-4 h-4 mr-2 text-text-muted" /> Export PDF
                    </button>
                    <Link to={`/physician/${session.id}`} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-sm transition-all">
                        <Printer className="w-4 h-4 mr-2" /> Physician View
                    </Link>
                </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-border flex-1 flex flex-col overflow-hidden mb-8">
                <div className="flex border-b border-border bg-background px-2 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'text-text-muted hover:text-text border-transparent'}`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'summary' && (
                            <motion.div 
                                key="summary"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-3xl space-y-8"
                            >
                            {!summary ? (
                                <div className="text-center py-12 text-text-muted">No summary available for this session.</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        {flags.length > 0 && (
                                            <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 shadow-sm">
                                                <h3 className="text-rose-800 dark:text-rose-400 font-bold flex items-center mb-4 uppercase tracking-wide text-[10px]">
                                                    <AlertTriangle className="w-3.5 h-3.5 mr-2" /> CLINICAL FLAGS
                                                </h3>
                                                <div className="space-y-3">
                                                    {flags.map((f: string, i: number) => (
                                                        <div key={i} className="flex gap-3 items-start bg-white/60 dark:bg-slate-900/60 dark:bg-slate-900/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900/30">
                                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                                                            <span className="text-rose-900 dark:text-rose-400 text-sm font-medium leading-relaxed">{f}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {keyFindings.length > 0 && (
                                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                                                <h3 className="text-teal-700 dark:text-teal-400 font-bold flex items-center mb-4 uppercase tracking-wide text-[10px]">
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> KEY FINDINGS FROM RECORDS
                                                </h3>
                                                <div className="space-y-3">
                                                    {keyFindings.map((kf: string, i: number) => (
                                                        <div key={i} className="flex gap-3 items-start bg-teal-50/30 dark:bg-slate-900/50 p-3 rounded-xl border border-teal-100 dark:border-slate-800">
                                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                                                            <span className="text-slate-700 dark:text-slate-300 dark:text-slate-300 text-sm leading-relaxed">{kf}</span>
                                                            <span className="text-text text-sm leading-relaxed">{kf}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-surface p-6 rounded-3xl border border-border mt-8">
                                        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">CHIEF COMPLAINT</h3>
                                        <p className="text-xl font-bold text-text pb-2">{summary.chief_complaint || 'No complaint recorded.'}</p>
                                    </div>
                                    
                                    <div className="bg-surface p-6 rounded-3xl border border-border mt-6">
                                        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center">
                                            <FileText className="w-3.5 h-3.5 mr-2" /> HISTORY OF PRESENTING ILLNESS
                                        </h3>
                                        <div className="prose dark:prose-invert max-w-none text-text text-[15px] leading-relaxed bg-background p-5 rounded-2xl border border-border">
                                            {(summary.history_of_presenting_illness?.split('\n') || []).map((p: string, i: number) => (
                                                p.trim() && <p key={i} className="mb-3 last:mb-0">{p}</p>
                                            ))}
                                            {(!summary.history_of_presenting_illness || summary.history_of_presenting_illness.trim() === '') && <p>No clinical history recorded.</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">ASSESSMENT & CLINICAL NOTES</h3>
                                        <p className="text-text leading-relaxed whitespace-pre-wrap">{summary.assessment_notes || 'No objective notes recorded.'}</p>
                                    </div>

                                    {(summary.suggested_medications || summary.suggested_tests) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                                            {summary.suggested_medications && (
                                                <div className="bg-teal-50/50 dark:bg-teal-900/10 p-5 rounded-xl border border-teal-100 dark:border-teal-900/30">
                                                    <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest mb-2 flex items-center">
                                                        Finalized Medications
                                                    </h3>
                                                    <p className="text-text leading-relaxed whitespace-pre-wrap">{summary.suggested_medications}</p>
                                                </div>
                                            )}
                                            {summary.suggested_tests && (
                                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                                    <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                                                        Recommended Tests
                                                    </h3>
                                                    <p className="text-text leading-relaxed whitespace-pre-wrap">{summary.suggested_tests}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            </motion.div>
                        )}
 
                        {activeTab === 'qa' && (
                            <motion.div 
                                key="qa"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-3xl mx-auto space-y-6"
                            >
                            <div className="bg-background p-5 rounded-xl border border-border mb-8">
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">PATIENT'S INITIAL COMPLAINT</h3>
                                <p className="text-text italic">"{session.complaint}"</p>
                            </div>

                            {qa.map((q: any, i: number) => (
                                <div key={i} className="flex flex-col space-y-3">
                                    <div className="flex">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">AI</div>
                                        <div className="ml-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl rounded-tl-sm shadow-sm text-slate-800 dark:text-slate-200">
                                            {q.question}
                                        </div>
                                    </div>
                                    <div className="flex flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">Pt</div>
                                        <div className="mr-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl rounded-tr-sm text-text">
                                            {q.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </motion.div>
                        )}
 
                        {activeTab === 'documents' && (
                            <motion.div 
                                key="docs"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                            {documents.length === 0 ? (
                                <div className="text-center py-12 text-text-muted border-2 border-dashed border-border rounded-2xl">
                                    No medical records have been uploaded for this session.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {documents.map((doc: any, i: number) => (
                                        <div key={i} className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group bg-surface flex flex-col">
                                            <div className="h-32 bg-background border-b border-border flex items-center justify-center text-text-muted opacity-30 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="w-16 h-16" />
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-semibold text-text truncate flex-1" title={doc.filename}>{doc.filename}</p>
                                                    <a 
                                                        href={`/api/documents/${doc.id}/download`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-accent hover:text-accent font-bold text-xs uppercase tracking-tight ml-2 flex items-center bg-accent/10 px-2 py-1 rounded"
                                                    >
                                                        Open
                                                    </a>
                                                </div>
                                                <div className="text-xs text-text-muted mb-3 flex items-center">
                                                    {safeFormatDate(doc.uploaded_at, 'MMM dd, yyyy h:mm a')}
                                                </div>
                                                <div className="mt-auto bg-background p-3 rounded-lg border border-border">
                                                    <p className="text-xs text-text-muted line-clamp-3 leading-relaxed" title={doc.coordinator_note}>
                                                        <span className="font-medium text-text">AI Note:</span> {doc.coordinator_note}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SessionDetail;
