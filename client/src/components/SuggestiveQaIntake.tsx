import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface QuestionOption {
  value: string;
  label: string;
  icon: string;
}

interface Question {
  id: number;
  question_text: string;
  category: string;
  input_type: 'single_select' | 'multi_select';
  options: QuestionOption[];
  order_index: number;
}

interface Answers {
  [questionId: number]: string[];
}

interface SuggestiveQaIntakeProps {
  onComplete: (answers: { question: string; answer: string; category: string }[]) => void;
  onCancel?: () => void;
}

export const SuggestiveQaIntake = ({ onComplete, onCancel }: SuggestiveQaIntakeProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  // Load questions from API
  useEffect(() => {
    if (!fetchWithCsrf) return;
    fetchWithCsrf('/api/templates/respiratory-questions')
      .then(r => r.json())
      .then((data: Question[]) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchWithCsrf]);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setVoiceText(transcript);
      };
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setVoiceText('');
      recognition.start();
      setIsListening(true);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = questions.length > 0 ? ((currentStep) / questions.length) * 100 : 0;

  const handleOptionToggle = useCallback((questionId: number, value: string, inputType: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (inputType === 'single_select') {
        return { ...prev, [questionId]: [value] };
      }
      // multi_select
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  }, []);

  const isSelected = (questionId: number, value: string) => {
    return (answers[questionId] || []).includes(value);
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    const ans = answers[currentQuestion.id] || [];
    return ans.length > 0 || voiceText.trim().length > 0;
  };

  const handleNext = () => {
    // If voice text present and no option selected, treat as free text answer
    if (voiceText.trim() && currentQuestion && !(answers[currentQuestion.id]?.length)) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: [voiceText.trim()] }));
    }
    setVoiceText('');
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
    setVoiceText('');
  };

  const handleSkip = () => {
    setVoiceText('');
    if (currentStep < questions.length - 1) setCurrentStep(s => s + 1);
    else handleFinish();
  };

  const handleFinish = () => {
    const result = questions
      .filter(q => (answers[q.id]?.length ?? 0) > 0)
      .map(q => {
        const selectedValues = answers[q.id] || [];
        const selectedLabels = selectedValues
          .map(v => {
            const opt = q.options.find(o => o.value === v);
            return opt ? `${opt.icon} ${opt.label}` : v;
          })
          .join(', ');
        return {
          question: q.question_text,
          answer: selectedLabels,
          category: q.category,
        };
      });
    onComplete(result);
  };

  const categoryLabels: Record<string, string> = {
    chief_complaint: 'Chief Complaint',
    duration: 'Duration',
    severity: 'Severity',
    cough_type: 'Cough Character',
    sputum: 'Sputum',
    triggers: 'Triggers',
    associated_symptoms: 'Associated Symptoms',
    smoking: 'Smoking History',
    exposure: 'Exposure History',
    past_history: 'Past History',
    red_flags: 'Red Flags',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading clinical intake questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        <p>No questions configured. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '500px' }}>
      {/* Progress Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            {categoryLabels[currentQuestion?.category] || 'Clinical Intake'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {currentStep + 1} / {questions.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-3 justify-center flex-wrap">
          {questions.map((_, i) => {
            const q = questions[i];
            const hasAnswer = (answers[q.id]?.length ?? 0) > 0;
            return (
              <div
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  i === currentStep
                    ? 'bg-teal-500 scale-125 shadow-[0_0_6px_rgba(20,184,166,0.8)]'
                    : hasAnswer
                    ? 'bg-emerald-400'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 px-6 pb-4 overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug mb-1">
            {currentQuestion?.question_text}
          </h2>
          {currentQuestion?.input_type === 'multi_select' && (
            <p className="text-xs text-slate-400 dark:text-slate-500">Select all that apply</p>
          )}
        </div>

        {/* Option Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {currentQuestion?.options.map((option) => {
            const selected = isSelected(currentQuestion.id, option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleOptionToggle(currentQuestion.id, option.value, currentQuestion.input_type)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:scale-105 active:scale-95 group ${
                  selected
                    ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/30 shadow-lg shadow-teal-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Check indicator */}
                {selected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  </div>
                )}
                <span className="text-3xl mb-2 leading-none">{option.icon}</span>
                <span className={`text-xs font-semibold leading-tight ${
                  selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Voice Overlay / Text Input */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">or describe in your own words</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={voiceText}
              onChange={e => setVoiceText(e.target.value)}
              placeholder="Type additional details or click mic..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-300 dark:placeholder-slate-600 transition-all"
            />
            {recognition && (
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-xl border-2 transition-all ${
                  isListening
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-400 hover:text-teal-500'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
        {currentStep > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : onCancel ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
        ) : <div />}

        <button
          onClick={handleSkip}
          className="px-3 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-all"
        >
          Skip
        </button>

        <button
          onClick={handleNext}
          className={`ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            canProceed()
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          {currentStep === questions.length - 1 ? 'Finish & Generate Summary' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
