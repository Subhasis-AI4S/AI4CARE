import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Mic, MicOff, Stethoscope } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface QuestionOption {
  value: string;
  label: string;
  icon: string;
}

export interface Question {
  id: number;
  question_text: string;
  category: string;
  input_type: 'single_select' | 'multi_select';
  options: QuestionOption[];
  order_index: number;
}

export interface Answers {
  [questionId: number]: string[];
}

interface SuggestiveQaIntakeProps {
  onComplete: (answers: { question: string; answer: string; category: string }[]) => void;
  onCancel?: () => void;
}

export const DISEASE_CATEGORIES = [
  { id: 'all', label: 'General / All', icon: '📋', desc: 'Comprehensive respiratory intake' },
  { id: 'asthma', label: 'Asthma', icon: '🫁', desc: 'Wheeze, nocturnal cough, triggers & atopy' },
  { id: 'copd', label: 'COPD', icon: '💨', desc: 'Exertional dyspnea, smoking pack-years, exacerbations' },
  { id: 'tuberculosis', label: 'TB / Post-TB', icon: '🦠', desc: 'B-symptoms, evening fever, hemoptysis & contact' },
  { id: 'ild', label: 'ILD / Fibrosis', icon: '🕸️', desc: 'Velcro crackles, progressive dyspnea & CTD signs' },
  { id: 'bronchiectasis', label: 'Bronchiectasis', icon: '🩺', desc: 'Copious purulent sputum & recurrent infections' },
  { id: 'pneumonia', label: 'Pneumonia', icon: '🌡️', desc: 'Acute high fever, chills, pleurisy & green sputum' },
  { id: 'pleural', label: 'Pleural Disease', icon: '💧', desc: 'Sharp pleuritic pain & positional breathlessness' },
  { id: 'rhinitis', label: 'Allergy / Rhinitis', icon: '🌸', desc: 'Sneezing, nasal drip & seasonal exacerbations' },
  { id: 'osa', label: 'Sleep Apnea (OSA)', icon: '😴', desc: 'Snoring, witnessed apneas & daytime somnolence' },
];

// Fallback comprehensive clinical question library organized disease-wise
export const DISEASE_QUESTION_SETS: Record<string, Question[]> = {
  asthma: [
    {
      id: 101,
      question_text: 'What are the main triggers that bring on your asthma or wheezing?',
      category: 'asthma',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'cold_air', label: 'Cold air / Weather change', icon: '❄️' },
        { value: 'dust_mites', label: 'Dust / House dust mites', icon: '🧹' },
        { value: 'pet_dander', label: 'Pets (Cats / Dogs / Birds)', icon: '🐱' },
        { value: 'exercise', label: 'Exercise / Running', icon: '🏃' },
        { value: 'smoke', label: 'Tobacco smoke / Chulha', icon: '💨' },
        { value: 'perfumes', label: 'Strong perfumes / Agarbatti / Incense', icon: '🌸' },
        { value: 'aspirin_nsaid', label: 'Painkillers (Aspirin / Brufen)', icon: '💊' },
        { value: 'emotional_stress', label: 'Stress / Laughing / Crying', icon: '😰' },
      ]
    },
    {
      id: 102,
      question_text: 'Do your symptoms have diurnal variation or wake you at night?',
      category: 'asthma',
      input_type: 'single_select',
      order_index: 2,
      options: [
        { value: 'night_early_morning', label: 'Worse at night & early morning (4-6 AM)', icon: '🌙' },
        { value: 'daytime_only', label: 'Mainly during the daytime', icon: '☀️' },
        { value: 'constant_all_day', label: 'Constant throughout 24 hours', icon: '⏰' },
        { value: 'only_on_exertion', label: 'Only during heavy exertion', icon: '🏋️' },
      ]
    },
    {
      id: 103,
      question_text: 'How frequently do you need your blue / rescue reliever inhaler?',
      category: 'asthma',
      input_type: 'single_select',
      order_index: 3,
      options: [
        { value: 'never_rarely', label: 'Rarely / Less than 2 times a week', icon: '✅' },
        { value: '2_3_times_week', label: '2 to 3 times a week', icon: '🟡' },
        { value: 'daily_rescue', label: 'Daily (1-2 times a day)', icon: '🟠' },
        { value: 'multiple_daily', label: 'Multiple times every day (Frequent SOS)', icon: '🔴' },
      ]
    },
    {
      id: 104,
      question_text: 'Personal or family history of allergic conditions?',
      category: 'asthma',
      input_type: 'multi_select',
      order_index: 4,
      options: [
        { value: 'allergic_rhinitis', label: 'Allergic Rhinitis (Morning sneezing)', icon: '👃' },
        { value: 'eczema_skin', label: 'Eczema / Atopic Dermatitis', icon: '🩹' },
        { value: 'family_asthma', label: 'Family member with Asthma / Inhaler use', icon: '👨‍👩‍👧' },
        { value: 'food_allergy', label: 'Known food or drug allergies', icon: '🍤' },
        { value: 'none', label: 'No known allergy history', icon: '❌' },
      ]
    },
  ],
  copd: [
    {
      id: 201,
      question_text: 'What is your smoking and biomass exposure history?',
      category: 'copd',
      input_type: 'single_select',
      order_index: 1,
      options: [
        { value: 'never_smoker', label: 'Never smoked & no biomass exposure', icon: '🚭' },
        { value: 'ex_smoker', label: 'Ex-Smoker (Quit smoking)', icon: '⏹️' },
        { value: 'current_smoker_light', label: 'Current smoker (<10 pack-years)', icon: '🚬' },
        { value: 'current_smoker_heavy', label: 'Heavy smoker (>20 pack-years)', icon: '🚬🚬' },
        { value: 'biomass_wood_chulha', label: 'Long-term Chulha / Biomass smoke exposure', icon: '🪵' },
        { value: 'passive_smoke', label: 'Heavy passive / second-hand smoke exposure', icon: '💨' },
      ]
    },
    {
      id: 202,
      question_text: 'Breathlessness grade on the mMRC Scale:',
      category: 'copd',
      input_type: 'single_select',
      order_index: 2,
      options: [
        { value: 'mmrc_0', label: 'Grade 0: Breathless only with strenuous exercise', icon: '🏃' },
        { value: 'mmrc_1', label: 'Grade 1: Short of breath hurrying or walking up slight hill', icon: '🚶‍♂️' },
        { value: 'mmrc_2', label: 'Grade 2: Walk slower than peers / stop for breath on level ground', icon: '⏱️' },
        { value: 'mmrc_3', label: 'Grade 3: Stop for breath after walking 100 meters / few minutes', icon: '🛑' },
        { value: 'mmrc_4', label: 'Grade 4: Too breathless to leave house or breathless dressing', icon: '🛋️' },
      ]
    },
    {
      id: 203,
      question_text: 'How many acute chest exacerbations / worsening episodes in past year?',
      category: 'copd',
      input_type: 'single_select',
      order_index: 3,
      options: [
        { value: '0_exacerbations', label: 'None (Stable disease)', icon: '0️⃣' },
        { value: '1_exacerbation', label: '1 episode (treated at home/OPD)', icon: '1️⃣' },
        { value: '2_plus_exacerbations', label: '2 or more episodes in past 12 months', icon: '⚠️' },
        { value: 'hospitalization_icu', label: 'Required Hospitalization / ICU / BiPAP ventilator', icon: '🏥' },
      ]
    },
    {
      id: 204,
      question_text: 'Any signs of Cor Pulmonale (Right heart failure)?',
      category: 'copd',
      input_type: 'multi_select',
      order_index: 4,
      options: [
        { value: 'bilateral_pedal_edema', label: 'Bilateral ankle / foot swelling', icon: '🦶' },
        { value: 'cyanosis_blue', label: 'Bluish lips or fingertips (Cyanosis)', icon: '🔵' },
        { value: 'morning_headache', label: 'Morning headache / CO2 retention signs', icon: '🤕' },
        { value: 'drowsiness', label: 'Daytime somnolence / drowsiness', icon: '😴' },
        { value: 'none', label: 'None of the above', icon: '✅' },
      ]
    },
  ],
  tuberculosis: [
    {
      id: 301,
      question_text: 'Presence of classic TB "B-Symptoms":',
      category: 'tuberculosis',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'evening_fever', label: 'Low-grade fever with evening rise', icon: '🌡️' },
        { value: 'night_sweats', label: 'Drenching night sweats (waking to change clothes)', icon: '🌙' },
        { value: 'unintentional_weight_loss', label: 'Unexplained significant weight loss (>5kg)', icon: '⚖️' },
        { value: 'anorexia', label: 'Severe loss of appetite (Anorexia)', icon: '🍽️' },
        { value: 'chronic_cough_2wks', label: 'Cough persisting > 2 weeks', icon: '⏱️' },
        { value: 'none', label: 'No constitutional symptoms', icon: '❌' },
      ]
    },
    {
      id: 302,
      question_text: 'Have you noticed any blood in your cough (Hemoptysis)?',
      category: 'tuberculosis',
      input_type: 'single_select',
      order_index: 2,
      options: [
        { value: 'no_blood', label: 'No blood (Never)', icon: '❌' },
        { value: 'blood_streaked', label: 'Blood-streaked sputum / Red flecks', icon: '🩸' },
        { value: 'frank_blood', label: 'Frank red blood (few teaspoons)', icon: '🩸🩸' },
        { value: 'massive_hemoptysis', label: 'Massive hemoptysis (>100ml / cupfuls) — EMERGENCY', icon: '🚨' },
      ]
    },
    {
      id: 303,
      question_text: 'Past TB Treatment or Close Contact History:',
      category: 'tuberculosis',
      input_type: 'multi_select',
      order_index: 3,
      options: [
        { value: 'past_tb_completed', label: 'Previous TB episode — fully completed ATT course', icon: '💊' },
        { value: 'past_tb_defaulted', label: 'Previous TB — stopped medicine midway / defaulted', icon: '⚠️' },
        { value: 'household_tb_contact', label: 'Close household contact with active TB patient', icon: '🏠' },
        { value: 'immunosuppressed', label: 'Immunocompromised (Diabetes / Steroids / HIV / CKD)', icon: '🛡️' },
        { value: 'none', label: 'No prior TB history or known contact', icon: '✅' },
      ]
    },
  ],
  ild: [
    {
      id: 401,
      question_text: 'Nature and progression of breathlessness in ILD:',
      category: 'ild',
      input_type: 'single_select',
      order_index: 1,
      options: [
        { value: 'gradual_progressive', label: 'Slowly worsening breathlessness over months/years', icon: '📈' },
        { value: 'rapid_progressive', label: 'Rapidly progressive breathlessness over few weeks', icon: '⚡' },
        { value: 'dry_hacking_cough', label: 'Persistent, non-productive dry hacking cough', icon: '🗣️' },
        { value: 'spO2_drop_walking', label: 'Significant oxygen drop upon walking', icon: '📉' },
      ]
    },
    {
      id: 402,
      question_text: 'Environmental, avian and occupational exposures:',
      category: 'ild',
      input_type: 'multi_select',
      order_index: 2,
      options: [
        { value: 'pigeon_bird_exposure', label: 'Pigeon / Bird droppings or feathers (Hypersensitivity)', icon: '🕊️' },
        { value: 'stone_silica_dust', label: 'Stone crushing / Silica / Sandblasting dust', icon: '⛏️' },
        { value: 'asbestos_construction', label: 'Asbestos / Construction / Insulation material', icon: '🏗️' },
        { value: 'mold_dampness', label: 'Indoor dampness / Mold / Air cooler water', icon: '💧' },
        { value: 'drug_induced', label: 'Amiodarone / Methotrexate / Chemotherapy drugs', icon: '💊' },
        { value: 'none', label: 'No identifiable environmental exposures', icon: '❌' },
      ]
    },
    {
      id: 403,
      question_text: 'Connective tissue / Autoimmune symptoms (CTD-ILD Screening):',
      category: 'ild',
      input_type: 'multi_select',
      order_index: 3,
      options: [
        { value: 'joint_pains_stiffness', label: 'Inflammatory joint pain & morning stiffness >1hr', icon: '🦴' },
        { value: 'raynauds_phenomenon', label: 'Fingers turn white/blue in cold (Raynaud\'s)', icon: '❄️' },
        { value: 'skin_thickening', label: 'Skin tightening on fingers or face (Scleroderma)', icon: '✋' },
        { value: 'dry_eyes_mouth', label: 'Dry eyes & dry mouth (Sicca / Sjögren syndrome)', icon: '👁️' },
        { value: 'muscle_weakness', label: 'Proximal muscle weakness (climbing stairs/brushing hair)', icon: '💪' },
        { value: 'none', label: 'No autoimmune symptoms', icon: '✅' },
      ]
    },
  ],
  bronchiectasis: [
    {
      id: 501,
      question_text: 'Sputum quantity and characteristics in Bronchiectasis:',
      category: 'bronchiectasis',
      input_type: 'single_select',
      order_index: 1,
      options: [
        { value: 'copious_daily_sputum', label: 'Daily copious purulent sputum (half to full cup)', icon: '🥣' },
        { value: 'three_layered_sputum', label: 'Thick, foul-smelling, green/yellow sputum', icon: '🟢' },
        { value: 'occasional_hemoptysis', label: 'Recurrent blood in sputum episodes', icon: '🩸' },
        { value: 'dry_bronchiectasis', label: 'Predominantly dry cough with episodic bleeding', icon: '🗣️' },
      ]
    },
    {
      id: 502,
      question_text: 'Predisposing childhood and past respiratory infections:',
      category: 'bronchiectasis',
      input_type: 'multi_select',
      order_index: 2,
      options: [
        { value: 'childhood_pneumonia', label: 'Severe childhood pneumonia or whooping cough (Pertussis)', icon: '👶' },
        { value: 'past_pulmonary_tb', label: 'Past pulmonary tuberculosis (Post-TB Bronchiectasis)', icon: '🦠' },
        { value: 'recurrent_sinusitis', label: 'Chronic sinusitis & nasal polyps', icon: '👃' },
        { value: 'recurrent_chest_infections', label: 'Frequent antibiotics required (>3-4 times per year)', icon: '💊' },
        { value: 'none', label: 'No clear childhood history', icon: '❌' },
      ]
    },
  ],
  pneumonia: [
    {
      id: 601,
      question_text: 'Acute symptom onset and fever characteristics:',
      category: 'pneumonia',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'high_fever_rigors', label: 'Sudden high fever with shaking chills / rigors', icon: '🔥' },
        { value: 'sharp_pleuritic_pain', label: 'Sharp chest pain worsening with deep inhalation / cough', icon: '⚡' },
        { value: 'rust_colored_sputum', label: 'Rust-colored or thick purulent green sputum', icon: '🟤' },
        { value: 'rapid_breathing_tachypnea', label: 'Rapid, shallow breathing (Tachypnea)', icon: '🫁' },
        { value: 'confusion_altered_mental', label: 'Confusion / Disorientation (CURB-65 criteria in elderly)', icon: '🧠' },
      ]
    },
  ],
  pleural: [
    {
      id: 701,
      question_text: 'Pleural and chest wall symptoms:',
      category: 'pleural',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'unilateral_sharp_pain', label: 'Unilateral sharp stabbing chest pain', icon: '🗡️' },
        { value: 'trepopnea_positional', label: 'More comfortable lying on the affected side', icon: '🛏️' },
        { value: 'dry_cough_dull_heaviness', label: 'Dull ache and feeling of chest heaviness with dry cough', icon: '🪨' },
        { value: 'recent_trauma_surgery', label: 'Recent chest injury, fall, or thoracic procedure', icon: '🩹' },
      ]
    },
  ],
  rhinitis: [
    {
      id: 801,
      question_text: 'Upper airway and allergy symptoms:',
      category: 'rhinitis',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'paroxysmal_sneezing', label: 'Paroxysms of sneezing (>5 sneezes in a row)', icon: '🤧' },
        { value: 'watery_rhinorrhea', label: 'Profuse watery runny nose & nasal itching', icon: '💧' },
        { value: 'nasal_congestion_blockage', label: 'Alternate or bilateral nasal blockage', icon: '👃' },
        { value: 'post_nasal_drip_throat', label: 'Sensation of mucus dripping behind throat / throat clearing', icon: '🥛' },
        { value: 'ocular_itching_redness', label: 'Itchy, red, watery eyes (Allergic conjunctivitis)', icon: '👁️' },
      ]
    },
  ],
  osa: [
    {
      id: 901,
      question_text: 'Sleep-disordered breathing and daytime symptoms (STOP-BANG):',
      category: 'osa',
      input_type: 'multi_select',
      order_index: 1,
      options: [
        { value: 'loud_habitual_snoring', label: 'Loud habitual snoring (heard through closed doors)', icon: '💤' },
        { value: 'witnessed_apneas', label: 'Partner witnessed pauses in breathing / choking gasps during sleep', icon: '⚠️' },
        { value: 'excessive_daytime_sleepiness', label: 'Falling asleep while driving, watching TV or in meetings', icon: '🚗' },
        { value: 'morning_headache_dry_mouth', label: 'Waking up with dry mouth & morning throbbing headache', icon: '🤕' },
        { value: 'unrefreshed_sleep', label: 'Unrefreshing sleep / Nocturia (waking multiple times to urinate)', icon: '🌙' },
      ]
    },
  ],
};
export const SuggestiveQaIntake = ({ onComplete, onCancel }: SuggestiveQaIntakeProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
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
        setApiQuestions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchWithCsrf]);

  // Derive active question set based on selected disease
  const questions: Question[] = useMemo(() => {
    if (selectedDisease !== 'all' && DISEASE_QUESTION_SETS[selectedDisease]) {
      return DISEASE_QUESTION_SETS[selectedDisease];
    }
    if (apiQuestions.length > 0) {
      return apiQuestions;
    }
    // Fallback: concatenate standard respiratory questions
    return Object.values(DISEASE_QUESTION_SETS).flat();
  }, [selectedDisease, apiQuestions]);

  // Reset step when disease filter changes
  const handleDiseaseChange = (diseaseId: string) => {
    setSelectedDisease(diseaseId);
    setCurrentStep(0);
  };

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
    asthma: '🫁 Bronchial Asthma Protocol',
    copd: '💨 COPD Assessment Protocol',
    tuberculosis: '🦠 Tuberculosis & Post-TB',
    ild: '🕸️ ILD & Pulmonary Fibrosis',
    bronchiectasis: '🩺 Bronchiectasis Protocol',
    pneumonia: '🌡️ Pneumonia Protocol',
    pleural: '💧 Pleural Disease Protocol',
    rhinitis: '🌸 Allergic Rhinitis Protocol',
    osa: '😴 Sleep Apnea (OSA) Protocol',
    general: '📋 General Respiratory Intake',
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
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading respiratory clinical question modules...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden" style={{ minHeight: '560px' }}>
      
      {/* Disease Protocol Switcher Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Disease-Specific Protocol:
            </span>
          </div>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
            {DISEASE_CATEGORIES.find(d => d.id === selectedDisease)?.label || 'General'}
          </span>
        </div>

        {/* Disease Pills Scrollable Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {DISEASE_CATEGORIES.map(disease => {
            const active = selectedDisease === disease.id;
            return (
              <button
                key={disease.id}
                onClick={() => handleDiseaseChange(disease.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                }`}
                title={disease.desc}
              >
                <span>{disease.icon}</span>
                <span>{disease.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Header */}
      <div className="px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            {categoryLabels[currentQuestion?.category] || 'Clinical Assessment'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            Question {currentStep + 1} of {questions.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-3 justify-center flex-wrap">
          {questions.map((q, i) => {
            const hasAnswer = (answers[q.id]?.length ?? 0) > 0;
            return (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  i === currentStep
                    ? 'bg-teal-500 scale-150 shadow-[0_0_8px_rgba(20,184,166,0.9)]'
                    : hasAnswer
                    ? 'bg-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={`Question ${i + 1}`}
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
