import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const useGemini = () => {
    const { fetchWithCsrf } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateQuestions = async (complaint: string, language: string = 'en') => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetchWithCsrf('/api/gemini/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complaint, language })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate questions');
            return data.questions;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const generateSummary = async (sessionId: number, language: string = 'en') => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetchWithCsrf('/api/gemini/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, language })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate summary');
            return data.summary;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const generateDocumentNote = async (filename: string, noteContext: string, language: string = 'en') => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetchWithCsrf('/api/gemini/document-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, note: noteContext, language })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate document note');
            return data.note; // returns string
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        generateQuestions,
        generateSummary,
        generateDocumentNote
    };
};
