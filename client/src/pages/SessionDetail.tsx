import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Printer, ArrowLeft, Download, FileText, AlertTriangle } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { useAppContext } from '../context/AppContext';

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
    const { clinicName, doctorName, token, logout } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        if (!token) return;

        fetch(`/api/sessions/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                return res.json();
            })
            .then(resData => {
                if (resData) setData(resData);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, token]);

    if (loading) return <div className="p-8 flex justify-center h-full items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
    if (!data || !data.session) return <div className="p-8 text-center text-slate-500">Session Not Found</div>;

    const { session, qa = [], documents = [], summary } = data;

    const exportPdf = () => exportToPDF(data, clinicName, doctorName);

    const tabs = [
        { id: 'summary', name: 'Summary' },
        { id: 'qa', name: 'Patient Interaction' },
        { id: 'documents', name: `Uploaded Records (${documents.length})` }
    ];

    let flags = [];
    try { if (summary?.clinical_flags) flags = JSON.parse(summary.clinical_flags); } catch (e) {}

    return (
        <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <Link to="/sessions" className="text-slate-500 hover:text-slate-800 font-medium flex items-center mb-4 text-sm w-fit">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">{session.name}</h1>
                    <p className="text-slate-600 mt-1 flex items-center">
                        {session.age} yrs • {session.gender || 'Unknown'} 
                        <span className="mx-3 text-slate-300">|</span> 
                        {safeFormatDate(session.created_at, 'MMMM dd, yyyy h:mm a')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportPdf} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium flex items-center shadow-sm transition-all">
                        <Download className="w-4 h-4 mr-2 text-slate-500" /> Export PDF
                    </button>
                    <Link to={`/physician/${session.id}`} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-sm transition-all">
                        <Printer className="w-4 h-4 mr-2" /> Physician View
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden mb-8">
                <div className="flex border-b border-slate-200 bg-slate-50 px-2 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    {activeTab === 'summary' && (
                        <div className="max-w-3xl space-y-8 animate-in fade-in">
                            {!summary ? (
                                <div className="text-center py-12 text-slate-500">No summary available for this session.</div>
                            ) : (
                                <>
                                    {flags && flags.length > 0 && flags[0].trim() !== '' && (
                                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-8">
                                            <h3 className="text-rose-800 font-bold flex items-center mb-2 uppercase tracking-wide text-sm">
                                                <AlertTriangle className="w-4 h-4 mr-2" /> CLINICAL FLAGS
                                            </h3>
                                            <ul className="list-disc pl-5 text-rose-700 space-y-1">
                                                {flags.map((f: string, i: number) => f.trim() && <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">CHIEF COMPLAINT</h3>
                                        <p className="text-lg font-medium text-slate-900">{summary.chief_complaint || 'No complaint recorded.'}</p>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">HISTORY OF PRESENTING ILLNESS</h3>
                                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                                            {(summary.history_of_presenting_illness?.split('\n') || []).map((p: string, i: number) => (
                                                p.trim() && <p key={i} className="mb-3 last:mb-0">{p}</p>
                                            ))}
                                            {(!summary.history_of_presenting_illness || summary.history_of_presenting_illness.trim() === '') && <p>No clinical history recorded.</p>}
                                        </div>
                                    </div>

                                    {(() => {
                                        let kf = [];
                                        try { 
                                            if (summary.key_findings) {
                                                kf = JSON.parse(summary.key_findings); 
                                            }
                                        } catch(e){}
                                        
                                        if (!Array.isArray(kf)) kf = [];
                                        
                                        return kf.length > 0 && kf.some((k: string) => k.trim()) && (
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">KEY FINDINGS FROM RECORDS</h3>
                                                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                                    {kf.map((f: string, i: number) => f && f.trim() && <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>
                                        );
                                    })()}

                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ASSESSMENT & CLINICAL NOTES</h3>
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summary.assessment_notes || 'No objective notes recorded.'}</p>
                                    </div>

                                    {(summary.suggested_medications || summary.suggested_tests) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                                            {summary.suggested_medications && (
                                                <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-100">
                                                    <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2 flex items-center">
                                                        Finalized Medications
                                                    </h3>
                                                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{summary.suggested_medications}</p>
                                                </div>
                                            )}
                                            {summary.suggested_tests && (
                                                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                                                    <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-2 flex items-center">
                                                        Recommended Tests
                                                    </h3>
                                                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{summary.suggested_tests}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'qa' && (
                        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">PATIENT'S INITIAL COMPLAINT</h3>
                                <p className="text-slate-800 italic">"{session.complaint}"</p>
                            </div>

                            {qa.map((q: any, i: number) => (
                                <div key={i} className="flex flex-col space-y-3">
                                    <div className="flex">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">AI</div>
                                        <div className="ml-4 bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm text-slate-800">
                                            {q.question}
                                        </div>
                                    </div>
                                    <div className="flex flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">Pt</div>
                                        <div className="mr-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl rounded-tr-sm text-slate-800">
                                            {q.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="animate-in fade-in">
                            {documents.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                                    No medical records have been uploaded for this session.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {documents.map((doc: any, i: number) => (
                                        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group bg-white flex flex-col">
                                            <div className="h-32 bg-slate-100 border-b border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-200 transition-colors">
                                                <FileText className="w-16 h-16" />
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-semibold text-slate-800 truncate flex-1" title={doc.filename}>{doc.filename}</p>
                                                    <a 
                                                        href={`/api/documents/${doc.id}/download?token=${localStorage.getItem('token')}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-tight ml-2 flex items-center bg-teal-50 px-2 py-1 rounded"
                                                    >
                                                        Open
                                                    </a>
                                                </div>
                                                <div className="text-xs text-slate-400 mb-3 flex items-center">
                                                    {safeFormatDate(doc.uploaded_at, 'MMM dd, yyyy h:mm a')}
                                                </div>
                                                <div className="mt-auto bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed" title={doc.coordinator_note}>
                                                        <span className="font-medium text-slate-700">AI Note:</span> {doc.coordinator_note}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionDetail;
