import { X, ShieldCheck, Lock, FileText, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PrivacyModal = ({ isOpen, onClose }: PrivacyModalProps) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy Policy & Terms of Service</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compliance with India DPDP Act 2023 & IT Act 2000</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        
                        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 text-teal-900 dark:text-teal-300 text-xs">
                            <strong>Data Fiduciary Notice:</strong> AI4CARE processes health & medical data strictly for clinical intake, history synthesis, and decision support under explicit clinic & patient authorization.
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <Lock className="w-4 h-4 text-teal-600" /> 1. Data Protection & Encryption (DPDP Act 2023)
                            </h3>
                            <p>
                                All medical data, patient names, complaints, and uploaded reports are encrypted at rest using industry-standard AES-256 and in transit via TLS 1.3 SSL protocols. Data is partitioned strictly by Tenant ID to ensure absolute multi-tenant data isolation.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <UserCheck className="w-4 h-4 text-teal-600" /> 2. Purpose Limitation & Non-Disclosure
                            </h3>
                            <p>
                                Patient medical information captured in AI4CARE is exclusively utilized for generating consultation summaries for your attending RMP (Registered Medical Practitioner). Data is <strong>never sold, shared with third-party advertisers, or used to train public AI models</strong>.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-teal-600" /> 3. Telemedicine Guidelines 2020 Compliance
                            </h3>
                            <p>
                                AI4CARE serves purely as an intelligent clinical decision support system. Under the Telemedicine Practice Guidelines 2020, final clinical diagnoses, treatment plans, diagnostic test orders, and prescriptions remain the sole legal responsibility of the licensed RMP.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                4. Right to Erasure & Access
                            </h3>
                            <p>
                                Healthcare administrators and doctors retain full authority to request data access logs or permanently delete patient session records. Deletion permanently purges all transcripts, QA pairs, and document summaries from our active databases.
                            </p>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                        <button 
                            onClick={onClose}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors"
                        >
                            I Understand & Accept
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
