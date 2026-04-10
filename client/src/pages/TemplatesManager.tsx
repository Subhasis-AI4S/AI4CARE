import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAppContext } from '../context/AppContext';

export const TemplatesManager = () => {
    const { t } = useTranslation();
    const { logout, user } = useAppContext();
    const [templates, setTemplates] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTemplates = () => {
        fetch('/api/templates', { credentials: 'include' })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTemplates(data);
                } else {
                    console.error('Expected array from /api/templates, got:', data);
                    setTemplates([]);
                }
            })
            .catch(err => {
                console.error('Failed to fetch templates:', err);
                setTemplates([]);
            });
    };

    useEffect(() => {
        if (user) fetchTemplates();
    }, [user]);

    const handleDelete = async (id: number) => {
        if (!confirm(t('templates_flow.delete_confirm'))) return;
        const res = await fetch(`/api/templates/${id}`, { 
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401 || res.status === 403) return logout();
        fetchTemplates();
    };

    const handleOpenModal = (t: any = null) => {
        setEditingTemplate(t || {
            name: '',
            trigger_keywords: '',
            questions: ['']
        });
        setIsModalOpen(true);
    };

    const filteredTemplates = Array.isArray(templates) ? templates.filter(tmpl => 
        (tmpl.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (tmpl.trigger_keywords || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{t('templates')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('templates_flow.subtitle')}</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center transition-all shadow-sm">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('templates_flow.new_template')}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder={t('templates_flow.search_placeholder')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map(tmpl => {
                            let qs: string[] = [];
                            try {
                                if (tmpl.questions) {
                                    if (typeof tmpl.questions === 'string') {
                                        qs = JSON.parse(tmpl.questions);
                                    } else if (Array.isArray(tmpl.questions)) {
                                        qs = tmpl.questions;
                                    }
                                }
                            } catch (e) {
                                console.error('Failed to parse questions for template:', tmpl.id, e);
                            }
                            
                            // Last safety check
                            if (!Array.isArray(qs)) qs = [];

                            return (
                                <div key={tmpl.id || Math.random()} className="border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-teal-300 transition-all hover:shadow-md bg-white dark:bg-slate-900 group flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{tmpl.name || 'Unnamed Template'}</h3>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal({...tmpl, questions: qs})} className="text-slate-400 hover:text-teal-600"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(tmpl.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('templates_flow.trigger_keywords')}</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{tmpl.trigger_keywords || 'No keywords'}</p>
                                    </div>
                                    <div className="flex-1">
                                        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc line-clamp-3">
                                            {qs.slice(0, 3).map((q: any, i: number) => (
                                                <li key={i}>
                                                    {typeof q === 'string' ? q : (q.en || q.hi || q.bn || 'Untitled Question')}
                                                </li>
                                            ))}
                                            {qs.length > 3 && <li className="text-slate-400 list-none text-xs mt-1">+{qs.length - 3} more</li>}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <TemplateModal 
                    template={editingTemplate} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={() => { setIsModalOpen(false); fetchTemplates(); }}
                />
            )}
        </div>
    );
};

const TemplateModal = ({ template, onClose, onSave }: any) => {
    const { t } = useTranslation();
    const { logout } = useAppContext();
    const [name, setName] = useState(template.name || '');
    const [keywords, setKeywords] = useState(template.trigger_keywords || '');
    const [questions, setQuestions] = useState<string[]>(template.questions || ['']);

    const handleSave = async () => {
        const body = { name, trigger_keywords: keywords, questions: questions.filter(q => q.trim()) };
        const method = template.id ? 'PUT' : 'POST';
        const url = `/api/templates${template.id ? `/${template.id}` : ''}`;
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        if (res.status === 401 || res.status === 403) return logout();
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{template.id ? t('templates_flow.edit_template') : t('templates_flow.new_template')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('templates_flow.label_name')}</label>
                        <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder={t('templates_flow.placeholder_name')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('templates_flow.label_keywords')}</label>
                        <input value={keywords} onChange={e => setKeywords(e.target.value)} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder={t('templates_flow.placeholder_keywords')} />
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('templates_flow.label_questions')}</label>
                            <button onClick={() => setQuestions([...questions, ''])} className="text-teal-600 text-sm font-medium hover:text-teal-700">+ {t('templates_flow.add_question')}</button>
                        </div>
                        <div className="space-y-3">
                            {questions.map((q, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-slate-400 text-sm w-4">{i + 1}.</span>
                                    <input 
                                        value={q} 
                                        onChange={e => {
                                            const newQs = [...questions];
                                            newQs[i] = e.target.value;
                                            setQuestions(newQs);
                                        }} 
                                        type="text" 
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" 
                                        placeholder={t('templates_flow.placeholder_question')} 
                                    />
                                    <button onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="text-red-400 p-2 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 rounded-xl transition-colors">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="px-5 py-2.5 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-xl transition-colors min-w-[100px]">{t('templates_flow.save_template')}</button>
                </div>
            </div>
        </div>
    );
};

export default TemplatesManager;
