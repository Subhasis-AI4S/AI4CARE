import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Mic, MicOff, Stethoscope, Globe } from 'lucide-react';
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
  language?: string; // 'en' | 'hi' | 'bn'
  onComplete: (answers: { question: string; answer: string; category: string }[]) => void;
  onCancel?: () => void;
}

export const DISEASE_CATEGORIES_LOCALIZED: Record<string, { id: string; label: string; icon: string; desc: string }[]> = {
  en: [
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
  ],
  hi: [
    { id: 'all', label: 'सभी लक्षण / सामान्य', icon: '📋', desc: 'संपूर्ण श्वसन संबंधी जांच' },
    { id: 'asthma', label: 'दमा (Asthma)', icon: '🫁', desc: 'घरघराहट, रात की खांसी और एलर्जी' },
    { id: 'copd', label: 'सीओपीडी (COPD)', icon: '💨', desc: 'चलने पर सांस फूलना, धूम्रपान और चूल्हे का धुआं' },
    { id: 'tuberculosis', label: 'टीबी (TB)', icon: '🦠', desc: 'शाम का बुखार, खांसी में खून और वजन घटना' },
    { id: 'ild', label: 'आईएलडी (ILD / Fibrosis)', icon: '🕸️', desc: 'धीमी सांस की तकलीफ और सूखी खांसी' },
    { id: 'bronchiectasis', label: 'ब्रोंकिएक्टेसिस', icon: '🩺', desc: 'अत्यधिक गाढ़ा बलगम और बार-बार संक्रमण' },
    { id: 'pneumonia', label: 'निमोनिया (Pneumonia)', icon: '🌡️', desc: 'तेज़ बुखार, कंपकंपी और सीने में दर्द' },
    { id: 'pleural', label: 'प्लूरल रोग (Pleural)', icon: '💧', desc: 'सांस लेने पर सीने में चुभन वाला दर्द' },
    { id: 'rhinitis', label: 'एलर्जी व छींकें', icon: '🌸', desc: 'लगातार छींकें, नाक बहना और एलर्जी' },
    { id: 'osa', label: 'स्लीप एप्निया (OSA)', icon: '😴', desc: 'तेज़ खर्राटे और नींद में सांस रुकना' },
  ],
  bn: [
    { id: 'all', label: 'সার্বিক লক্ষণ / সাধারণ', icon: '📋', desc: 'সম্পূর্ণ ফুসফুস ও শ্বাসযন্ত্রের মূল্যায়ন' },
    { id: 'asthma', label: 'হাঁপানি (Asthma)', icon: '🫁', desc: 'শ্বাসের বাঁশির শব্দ, রাতের কাশি ও অ্যালার্জি' },
    { id: 'copd', label: 'সিওপিডি (COPD)', icon: '💨', desc: 'হাঁটলে শ্বাসকষ্ট, ধূমপান বা চুলার ধোঁয়া' },
    { id: 'tuberculosis', label: 'যক্ষ্মা / টিবি (TB)', icon: '🦠', desc: 'সন্ধ্যার জ্বর, কাশিতে রক্ত ও ওজন হ্রাস' },
    { id: 'ild', label: 'আইএলডি (ILD / Fibrosis)', icon: '🕸️', desc: 'ধীরে ধীরে বৃদ্ধি পাওয়া শ্বাসকষ্ট ও শুকনো কাশি' },
    { id: 'bronchiectasis', label: 'ব্রঙ্কিএক্টেসিস', icon: '🩺', desc: 'প্রচুর ঘন কফ ও বারবার বুকের সংক্রমণ' },
    { id: 'pneumonia', label: 'নিউমোনিয়া (Pneumonia)', icon: '🌡️', desc: 'তীব্র জ্বর, কাঁপুনি ও বুকে ছুঁচ ফোটার ব্যথা' },
    { id: 'pleural', label: 'প্লুরাল ডিজিজ (Pleural)', icon: '💧', desc: 'শ্বাস নিলে বুকের একপাশে তীব্র ব্যথা' },
    { id: 'rhinitis', label: 'অ্যালার্জি ও হাঁচি', icon: '🌸', desc: 'একটানা হাঁচি, নাক দিয়ে জল পড়া ও চুলকানি' },
    { id: 'osa', label: 'স্লিপ অ্যাপনিয়া (OSA)', icon: '😴', desc: 'প্রচণ্ড নাক ডাকা ও ঘুমের মধ্যে দম বন্ধ ভাব' },
  ],
};

export const DISEASE_CATEGORIES = DISEASE_CATEGORIES_LOCALIZED.en;

export const DISEASE_QUESTION_SETS_LOCALIZED: Record<string, Record<string, Question[]>> = {
  en: {
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
  },
  hi: {
    asthma: [
      {
        id: 101,
        question_text: 'आपकी दमा या सांस फूलने/घरघराहट की मुख्य वजहें (Triggers) क्या हैं?',
        category: 'asthma',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'cold_air', label: 'ठंडी हवा / मौसम बदलना', icon: '❄️' },
          { value: 'dust_mites', label: 'धूल / घर की धूल-मिट्टी', icon: '🧹' },
          { value: 'pet_dander', label: 'पालतू जानवर (कुत्ता/बिल्ली/पक्षी)', icon: '🐱' },
          { value: 'exercise', label: 'दौड़ना / व्यायाम करना', icon: '🏃' },
          { value: 'smoke', label: 'धुआं / सिगरेट / चूल्हा', icon: '💨' },
          { value: 'perfumes', label: 'तेज़ इत्र / अगरबत्ती / धूप', icon: '🌸' },
          { value: 'aspirin_nsaid', label: 'दर्द निवारक दवाएं (Aspirin / Brufen)', icon: '💊' },
          { value: 'emotional_stress', label: 'तनाव / हंसना / रोना', icon: '😰' },
        ]
      },
      {
        id: 102,
        question_text: 'क्या आपकी समस्या रात या सुबह के समय बढ़ती है या नींद खुलती है?',
        category: 'asthma',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'night_early_morning', label: 'रात और सुबह (4-6 बजे) अधिक', icon: '🌙' },
          { value: 'daytime_only', label: 'मुख्य रूप से दिन के समय', icon: '☀️' },
          { value: 'constant_all_day', label: 'पूरे 24 घंटे लगातार', icon: '⏰' },
          { value: 'only_on_exertion', label: 'केवल भारी काम/मेहनत करने पर', icon: '🏋️' },
        ]
      },
      {
        id: 103,
        question_text: 'आपको नीले/इमरजेंसी इनहेलर (SOS Reliever) की कितनी बार ज़रूरत पड़ती है?',
        category: 'asthma',
        input_type: 'single_select',
        order_index: 3,
        options: [
          { value: 'never_rarely', label: 'बहुत कम / हफ्ते में 2 बार से कम', icon: '✅' },
          { value: '2_3_times_week', label: 'हफ्ते में 2 से 3 बार', icon: '🟡' },
          { value: 'daily_rescue', label: 'रोज़ाना (दिन में 1-2 बार)', icon: '🟠' },
          { value: 'multiple_daily', label: 'दिन में कई बार (लगातार SOS)', icon: '🔴' },
        ]
      },
      {
        id: 104,
        question_text: 'क्या आपको या परिवार में किसी को एलर्जी/दमा की शिकायत है?',
        category: 'asthma',
        input_type: 'multi_select',
        order_index: 4,
        options: [
          { value: 'allergic_rhinitis', label: 'सुबह छींकें आना / एलर्जिक राइनाइटिस', icon: '👃' },
          { value: 'eczema_skin', label: 'एक्जिमा / त्वचा की एलर्जी', icon: '🩹' },
          { value: 'family_asthma', label: 'परिवार में दमा/इनहेलर का उपयोग', icon: '👨‍👩‍👧' },
          { value: 'food_allergy', label: 'खाने या दवा से ज्ञात एलर्जी', icon: '🍤' },
          { value: 'none', label: 'कोई ज्ञात एलर्जी नहीं', icon: '❌' },
        ]
      },
    ],
    copd: [
      {
        id: 201,
        question_text: 'धूम्रपान (बीड़ी/सिगरेट) या चूल्हे के धुएं का क्या इतिहास है?',
        category: 'copd',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'never_smoker', label: 'कभी धूम्रपान या चूल्हे का संपर्क नहीं', icon: '🚭' },
          { value: 'ex_smoker', label: 'पहले पीते थे, अब छोड़ दिया', icon: '⏹️' },
          { value: 'current_smoker_light', label: 'वर्तमान धूम्रपान (<10 पैक-वर्ष)', icon: '🚬' },
          { value: 'current_smoker_heavy', label: 'अत्यधिक धूम्रपान (>20 पैक-वर्ष)', icon: '🚬🚬' },
          { value: 'biomass_wood_chulha', label: 'लंबे समय से लकड़ी/चूल्हे के धुएं का संपर्क', icon: '🪵' },
          { value: 'passive_smoke', label: 'दूसरों के धुएं के बीच रहना', icon: '💨' },
        ]
      },
      {
        id: 202,
        question_text: 'सांस फूलने का स्तर (mMRC पैमाना):',
        category: 'copd',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'mmrc_0', label: 'ग्रेड 0: केवल भारी मेहनत पर सांस फूलना', icon: '🏃' },
          { value: 'mmrc_1', label: 'ग्रेड 1: तेज़ चलने या चढ़ाई पर सांस फूलना', icon: '🚶‍♂️' },
          { value: 'mmrc_2', label: 'ग्रेड 2: दूसरों से धीमा चलना / समतल पर सांस के लिए रुकना', icon: '⏱️' },
          { value: 'mmrc_3', label: 'ग्रेड 3: 100 मीटर चलने पर सांस फूलना', icon: '🛑' },
          { value: 'mmrc_4', label: 'ग्रेड 4: घर से निकलना या कपड़े पहनना भी मुश्किल', icon: '🛋️' },
        ]
      },
      {
        id: 203,
        question_text: 'पिछले 1 साल में छाती की समस्या कितनी बार बिगड़ी?',
        category: 'copd',
        input_type: 'single_select',
        order_index: 3,
        options: [
          { value: '0_exacerbations', label: 'कोई नहीं (स्थिर अवस्था)', icon: '0️⃣' },
          { value: '1_exacerbation', label: '1 बार (घर या OPD में इलाज)', icon: '1️⃣' },
          { value: '2_plus_exacerbations', label: '2 या अधिक बार समस्या बढ़ी', icon: '⚠️' },
          { value: 'hospitalization_icu', label: 'अस्पताल भर्ती / ICU / BiPAP की ज़रूरत पड़ी', icon: '🏥' },
        ]
      },
      {
        id: 204,
        question_text: 'क्या पैरों में सूजन या शरीर नीला पड़ने के लक्षण हैं (Cor Pulmonale)?',
        category: 'copd',
        input_type: 'multi_select',
        order_index: 4,
        options: [
          { value: 'bilateral_pedal_edema', label: 'दोनों पैरों/टखनों में सूजन', icon: '🦶' },
          { value: 'cyanosis_blue', label: 'होंठ या उंगलियों का नीला पड़ना', icon: '🔵' },
          { value: 'morning_headache', label: 'सुबह सिरदर्द (CO2 रुकावट के संकेत)', icon: '🤕' },
          { value: 'drowsiness', label: 'दिन में अत्यधिक सुस्ती/नींद आना', icon: '😴' },
          { value: 'none', label: 'उपरोक्त में से कोई नहीं', icon: '✅' },
        ]
      },
    ],
    tuberculosis: [
      {
        id: 301,
        question_text: 'टीबी के मुख्य लक्षण (बुखार, पसीना, वजन घटना):',
        category: 'tuberculosis',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'evening_fever', label: 'हल्का बुखार जो शाम को बढ़ता है', icon: '🌡️' },
          { value: 'night_sweats', label: 'रात में बहुत पसीना आना (कपड़े बदलने पड़ना)', icon: '🌙' },
          { value: 'unintentional_weight_loss', label: 'अचानक बिना कारण वजन कम होना (>5kg)', icon: '⚖️' },
          { value: 'anorexia', label: 'भूख बिल्कुल न लगना (अरोचक)', icon: '🍽️' },
          { value: 'chronic_cough_2wks', label: '2 सप्ताह से अधिक समय से खांसी', icon: '⏱️' },
          { value: 'none', label: 'कोई सामान्य लक्षण नहीं', icon: '❌' },
        ]
      },
      {
        id: 302,
        question_text: 'क्या खांसी में कभी खून आया है (Hemoptysis)?',
        category: 'tuberculosis',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'no_blood', label: 'कभी नहीं', icon: '❌' },
          { value: 'blood_streaked', label: 'बलगम में खून की लकीरें/दाग', icon: '🩸' },
          { value: 'frank_blood', label: 'साफ लाल खून (चम्मच भर)', icon: '🩸🩸' },
          { value: 'massive_hemoptysis', label: 'अत्यधिक खून (>100ml / कप भर) — आपातकाल', icon: '🚨' },
        ]
      },
      {
        id: 303,
        question_text: 'पूर्व टीबी का इलाज या मरीज़ के संपर्क का इतिहास:',
        category: 'tuberculosis',
        input_type: 'multi_select',
        order_index: 3,
        options: [
          { value: 'past_tb_completed', label: 'पहले टीबी हुआ था — पूरा कोर्स पूरा किया', icon: '💊' },
          { value: 'past_tb_defaulted', label: 'पहले टीबी की दवा बीच में छोड़ दी थी', icon: '⚠️' },
          { value: 'household_tb_contact', label: 'घर में किसी सक्रिय टीबी मरीज़ के साथ संपर्क', icon: '🏠' },
          { value: 'immunosuppressed', label: 'कमज़ोर प्रतिरक्षा (डायबिटीज़ / स्टेरॉयड आदि)', icon: '🛡️' },
          { value: 'none', label: 'टीबी का कोई पूर्व इतिहास या संपर्क नहीं', icon: '✅' },
        ]
      },
    ],
    ild: [
      {
        id: 401,
        question_text: 'सांस फूलने और खांसी का स्वरूप (ILD / Fibrosis):',
        category: 'ild',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'gradual_progressive', label: 'महीनों/वर्षों में धीरे-धीरे बढ़ती सांस की तकलीफ', icon: '📈' },
          { value: 'rapid_progressive', label: 'कुछ हफ्तों में तेज़ी से बढ़ती सांस फूलना', icon: '⚡' },
          { value: 'dry_hacking_cough', label: 'लगातार सूखी कष्टदायी खांसी', icon: '🗣️' },
          { value: 'spO2_drop_walking', label: 'चलने पर ऑक्सीजन का स्तर गिरना', icon: '📉' },
        ]
      },
      {
        id: 402,
        question_text: 'पक्षी, धूल या काम से संबंधित संपर्क:',
        category: 'ild',
        input_type: 'multi_select',
        order_index: 2,
        options: [
          { value: 'pigeon_bird_exposure', label: 'कबूतर / पक्षियों के पंख या बीट का संपर्क', icon: '🕊️' },
          { value: 'stone_silica_dust', label: 'पत्थर तोड़ने / सिलिका धूल का संपर्क', icon: '⛏️' },
          { value: 'asbestos_construction', label: 'एस्बेस्टस / निर्माण सामग्री का काम', icon: '🏗️' },
          { value: 'mold_dampness', label: 'घर में सीलन / फफूंद / कूलर का पानी', icon: '💧' },
          { value: 'drug_induced', label: 'दवाओं का प्रभाव (Methotrexate/Amiodarone आदि)', icon: '💊' },
          { value: 'none', label: 'कोई ज्ञात पर्यावरणीय संपर्क नहीं', icon: '❌' },
        ]
      },
      {
        id: 403,
        question_text: 'जोड़ों में दर्द या ऑटोइम्यून लक्षण (CTD-ILD स्क्रीनिंग):',
        category: 'ild',
        input_type: 'multi_select',
        order_index: 3,
        options: [
          { value: 'joint_pains_stiffness', label: 'जोड़ों में दर्द व सुबह 1 घंटे से अधिक अकड़न', icon: '🦴' },
          { value: 'raynauds_phenomenon', label: 'ठंड में उंगलियों का सफेद/नीला पड़ना', icon: '❄️' },
          { value: 'skin_thickening', label: 'उंगलियों या चेहरे की त्वचा का खिंचना/सख्त होना', icon: '✋' },
          { value: 'dry_eyes_mouth', label: 'आंखों और मुंह का अत्यधिक सूखना', icon: '👁️' },
          { value: 'muscle_weakness', label: 'सीढ़ियां चढ़ने या बाल संवारने में मांसपेशियों की कमज़ोरी', icon: '💪' },
          { value: 'none', label: 'कोई ऑटोइम्यून लक्षण नहीं', icon: '✅' },
        ]
      },
    ],
    bronchiectasis: [
      {
        id: 501,
        question_text: 'बलगम की मात्रा और प्रकार (Bronchiectasis):',
        category: 'bronchiectasis',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'copious_daily_sputum', label: 'रोज़ाना बहुत अधिक गाढ़ा बलगम (आधा से पूरा कप)', icon: '🥣' },
          { value: 'three_layered_sputum', label: 'गाढ़ा, बदबूदार, हरा/पीला बलगम', icon: '🟢' },
          { value: 'occasional_hemoptysis', label: 'बलगम में बार-बार खून आना', icon: '🩸' },
          { value: 'dry_bronchiectasis', label: 'मुख्यतः सूखी खांसी और कभी-कभी खून आना', icon: '🗣️' },
        ]
      },
      {
        id: 502,
        question_text: 'बचपन में निमोनिया, काली खांसी या टीबी का इतिहास:',
        category: 'bronchiectasis',
        input_type: 'multi_select',
        order_index: 2,
        options: [
          { value: 'childhood_pneumonia', label: 'बचपन में गंभीर निमोनिया या काली खांसी', icon: '👶' },
          { value: 'past_pulmonary_tb', label: 'पूर्व में फेफड़ों की टीबी का इतिहास', icon: '🦠' },
          { value: 'recurrent_sinusitis', label: 'साइनसाइटिस या नाक में मांस बढ़ना', icon: '👃' },
          { value: 'recurrent_chest_infections', label: 'साल में 3-4 बार से अधिक एंटीबायोटिक की ज़रूरत', icon: '💊' },
          { value: 'none', label: 'कोई स्पष्ट इतिहास नहीं', icon: '❌' },
        ]
      },
    ],
    pneumonia: [
      {
        id: 601,
        question_text: 'निमोनिया के अचानक लक्षण और बुखार:',
        category: 'pneumonia',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'high_fever_rigors', label: 'कंपकंपी के साथ अचानक तेज़ बुखार', icon: '🔥' },
          { value: 'sharp_pleuritic_pain', label: 'गहरी सांस लेने या खांसने पर छाती में तेज़ चुभन वाला दर्द', icon: '⚡' },
          { value: 'rust_colored_sputum', label: 'जंग जैसा भूरा या गाढ़ा हरा बलगम', icon: '🟤' },
          { value: 'rapid_breathing_tachypnea', label: 'बहुत तेज़-तेज़ सांस चलना', icon: '🫁' },
          { value: 'confusion_altered_mental', label: 'बुजुर्गों में भ्रम / होश खोना (CURB-65)', icon: '🧠' },
        ]
      },
    ],
    pleural: [
      {
        id: 701,
        question_text: 'फेफड़ों की झिल्ली (Pleura) व छाती के लक्षण:',
        category: 'pleural',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'unilateral_sharp_pain', label: 'एक तरफ तेज़ चुभने वाला छाती का दर्द', icon: '🗡️' },
          { value: 'trepopnea_positional', label: 'दर्द वाले हिस्से की ओर लेटने पर आराम मिलना', icon: '🛏️' },
          { value: 'dry_cough_dull_heaviness', label: 'छाती में भारीपन, धीमा दर्द और सूखी खांसी', icon: '🪨' },
          { value: 'recent_trauma_surgery', label: 'हाल ही में छाती में चोट, गिरना या कोई सर्जरी', icon: '🩹' },
        ]
      },
    ],
    rhinitis: [
      {
        id: 801,
        question_text: 'ऊपरी सांस नली और एलर्जी के लक्षण:',
        category: 'rhinitis',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'paroxysmal_sneezing', label: 'लगातार कई छींकें आना (एक साथ 5 से अधिक)', icon: '🤧' },
          { value: 'watery_rhinorrhea', label: 'नाक से लगातार पानी बहना और नाक में खुजली', icon: '💧' },
          { value: 'nasal_congestion_blockage', label: 'नाक बंद होना (एक या दोनों तरफ)', icon: '👃' },
          { value: 'post_nasal_drip_throat', label: 'गले के पीछे बलगम गिरने का अहसास / बार-बार गला साफ करना', icon: '🥛' },
          { value: 'ocular_itching_redness', label: 'आंखों में खुजली, लाली और पानी आना', icon: '👁️' },
        ]
      },
    ],
    osa: [
      {
        id: 901,
        question_text: 'नींद में सांस रुकना और दिन के लक्षण (OSA / STOP-BANG):',
        category: 'osa',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'loud_habitual_snoring', label: 'ज़ोर-ज़ोर से खर्राटे लेना (बंद दरवाज़े के पार भी सुनाई देना)', icon: '💤' },
          { value: 'witnessed_apneas', label: 'नींद में सांस रुकना या घुटने का अहसास (साथी द्वारा देखा गया)', icon: '⚠️' },
          { value: 'excessive_daytime_sleepiness', label: 'दिन में काम, टीवी देखते या गाड़ी चलाते समय नींद आना', icon: '🚗' },
          { value: 'morning_headache_dry_mouth', label: 'सुबह सूखा मुंह और सिर में भारी दर्द के साथ जागना', icon: '🤕' },
          { value: 'unrefreshed_sleep', label: 'नींद पूरी न लगना / रात में बार-बार पेशाब के लिए उठना', icon: '🌙' },
        ]
      },
    ],
  },
  bn: {
    asthma: [
      {
        id: 101,
        question_text: 'আপনার হাঁপানি বা শ্বাসের বাঁশির মতো শব্দ (Wheezing) কীসে বাড়ে?',
        category: 'asthma',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'cold_air', label: 'ঠান্ডা বাতাস / আবহাওয়া পরিবর্তন', icon: '❄️' },
          { value: 'dust_mites', label: 'ধুলোবালি / ঘরের ধুলো', icon: '🧹' },
          { value: 'pet_dander', label: 'পোষা প্রাণী (বিড়াল/কুকুর/পাখি)', icon: '🐱' },
          { value: 'exercise', label: 'ব্যায়াম বা দৌড়াদৌড়ি', icon: '🏃' },
          { value: 'smoke', label: 'তামাক বা চুলার ধোঁয়া', icon: '💨' },
          { value: 'perfumes', label: 'তীব্র পারফিউম / ধূপ-আগরবাতি', icon: '🌸' },
          { value: 'aspirin_nsaid', label: 'ব্যথানাশক ওষুধ (Aspirin/Brufen)', icon: '💊' },
          { value: 'emotional_stress', label: 'মানসিক চাপ / হাসা / কাঁদা', icon: '😰' },
        ]
      },
      {
        id: 102,
        question_text: 'আপনার কষ্ট কি রাতে বা ভোরে বেশি হয় অথবা রাতে ঘুম ভেঙে যায়?',
        category: 'asthma',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'night_early_morning', label: 'রাতে ও ভোরে (ভোর ৪-৬ টা) বাড়ে', icon: '🌙' },
          { value: 'daytime_only', label: 'মূলত দিনের বেলা', icon: '☀️' },
          { value: 'constant_all_day', label: 'সারাদিন ২৪ ঘণ্টাই একরকম থাকে', icon: '⏰' },
          { value: 'only_on_exertion', label: 'শুধুমাত্র ভারী পরিশ্রমের সময়', icon: '🏋️' },
        ]
      },
      {
        id: 103,
        question_text: 'আপনার জরুরি নীল ইনহেলার (Reliever / SOS) সপ্তাহে কতবার প্রয়োজন হয়?',
        category: 'asthma',
        input_type: 'single_select',
        order_index: 3,
        options: [
          { value: 'never_rarely', label: 'খুব কম / সপ্তাহে ২ বারের কম', icon: '✅' },
          { value: '2_3_times_week', label: 'সপ্তাহে ২ থেকে ৩ বার', icon: '🟡' },
          { value: 'daily_rescue', label: 'প্রতিদিন (দিনে ১-২ বার)', icon: '🟠' },
          { value: 'multiple_daily', label: 'প্রতিদিন বারবার (ঘন ঘন SOS)', icon: '🔴' },
        ]
      },
      {
        id: 104,
        question_text: 'আপনার বা পরিবারের কারো কি অ্যালার্জি বা হাঁপানির ইতিহাস আছে?',
        category: 'asthma',
        input_type: 'multi_select',
        order_index: 4,
        options: [
          { value: 'allergic_rhinitis', label: 'সকালে হাঁচি / সর্দি (Allergic Rhinitis)', icon: '👃' },
          { value: 'eczema_skin', label: 'একজিমা / ত্বকের চুলকানি ও অ্যালার্জি', icon: '🩹' },
          { value: 'family_asthma', label: 'পরিবারে কারো হাঁপানি বা ইনহেলার ব্যবহার', icon: '👨‍👩‍👧' },
          { value: 'food_allergy', label: 'খাবার বা ওষুধের অ্যালার্জি', icon: '🍤' },
          { value: 'none', label: 'কোনো অ্যালার্জির ইতিহাস নেই', icon: '❌' },
        ]
      },
    ],
    copd: [
      {
        id: 201,
        question_text: 'আপনার ধূমপান (বিড়ি/সিগারেট) বা চুলার ধোঁয়ার কী ইতিহাস আছে?',
        category: 'copd',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'never_smoker', label: 'কখনো ধূমপান করেননি / ধোঁয়ার সংস্পর্শ নেই', icon: '🚭' },
          { value: 'ex_smoker', label: 'পূর্বে খেতেন, এখন ছেড়ে দিয়েছেন', icon: '⏹️' },
          { value: 'current_smoker_light', label: 'বর্তমানে ধূমপান করেন (অল্প/মাঝারি)', icon: '🚬' },
          { value: 'current_smoker_heavy', label: 'অতিরিক্ত ধূমপায়ী (বহু বছর ধরে)', icon: '🚬🚬' },
          { value: 'biomass_wood_chulha', label: 'দীর্ঘদিন ধরে কাঠের চুলা বা ঘুটের ধোঁয়া', icon: '🪵' },
          { value: 'passive_smoke', label: 'অন্যের ধূমপানের ধোঁয়া (Passive smoke)', icon: '💨' },
        ]
      },
      {
        id: 202,
        question_text: 'শ্বাসকষ্টের মাত্রা (mMRC স্কেল অনুযায়ী):',
        category: 'copd',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'mmrc_0', label: 'গ্রেড ০: শুধুমাত্র ভারী ব্যায়াম বা পরিশ্রমে', icon: '🏃' },
          { value: 'mmrc_1', label: 'গ্রেড ১: দ্রুত হাঁটলে বা চড়াইয়ে উঠলে শ্বাসকষ্ট', icon: '🚶‍♂️' },
          { value: 'mmrc_2', label: 'গ্রেড ২: সমবয়সীদের চেয়ে আস্তে হাঁটা / দম নিতে থামা', icon: '⏱️' },
          { value: 'mmrc_3', label: 'গ্রেড ৩: ১০০ মিটার হাঁটলেই দম আটকে আসা', icon: '🛑' },
          { value: 'mmrc_4', label: 'গ্রেড ৪: পোশাক পরতে বা ঘর থেকে বেরোতেই চরম কষ্ট', icon: '🛋️' },
        ]
      },
      {
        id: 203,
        question_text: 'গত এক বছরে বুক খারাপ হওয়া বা সমস্যা বৃদ্ধির কটি ঘটনা ঘটেছে?',
        category: 'copd',
        input_type: 'single_select',
        order_index: 3,
        options: [
          { value: '0_exacerbations', label: 'কোনো অবনতি হয়নি (সুস্থ/স্থির)', icon: '0️⃣' },
          { value: '1_exacerbation', label: '১ বার (ওষুধ খেয়ে ঘরে/OPD-তে ঠিক হয়েছে)', icon: '1️⃣' },
          { value: '2_plus_exacerbations', label: '২ বা ততোধিক বার তীব্র বৃদ্ধি ঘটেছে', icon: '⚠️' },
          { value: 'hospitalization_icu', label: 'হাসপাতালে ভর্তি / ICU বা BiPAP ভেন্টিলেটর লেগেছিল', icon: '🏥' },
        ]
      },
      {
        id: 204,
        question_text: 'পায়ে জল জমা/ফোলা বা ঠোঁট নীল হয়ে যাওয়ার মতো লক্ষণ আছে (Cor Pulmonale)?',
        category: 'copd',
        input_type: 'multi_select',
        order_index: 4,
        options: [
          { value: 'bilateral_pedal_edema', label: 'দুই পায়ে বা গোড়ালিতে ফোলা/জল জমা', icon: '🦶' },
          { value: 'cyanosis_blue', label: 'ঠোঁট বা আঙুলের ডগা নীল হওয়া (Cyanosis)', icon: '🔵' },
          { value: 'morning_headache', label: 'সকালে ঘুম ভাঙার পর তীব্র মাথা ব্যথা', icon: '🤕' },
          { value: 'drowsiness', label: 'দিনের বেলা সারাক্ষণ অতিরিক্ত তন্দ্রাভাব/ঘুম', icon: '😴' },
          { value: 'none', label: 'উপরের কোনোটিই নয়', icon: '✅' },
        ]
      },
    ],
    tuberculosis: [
      {
        id: 301,
        question_text: 'যক্ষ্মা/টিবির প্রধান লক্ষণসমূহ (জ্বর, ঘাম, ওজন হ্রাস):',
        category: 'tuberculosis',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'evening_fever', label: 'হালকা জ্বর যা সন্ধ্যায় বৃদ্ধি পায়', icon: '🌡️' },
          { value: 'night_sweats', label: 'রাতে শরীর ভিজে যাওয়ার মতো অতিরিক্ত ঘাম', icon: '🌙' },
          { value: 'unintentional_weight_loss', label: 'হঠাৎ অপ্রত্যাশিতভাবে অনেকটা ওজন হ্রাস (>৫ কেজি)', icon: '⚖️' },
          { value: 'anorexia', label: 'ক্ষুধা একেবারে নষ্ট হয়ে যাওয়া (অরুচি)', icon: '🍽️' },
          { value: 'chronic_cough_2wks', label: '২ সপ্তাহের বেশি সময় ধরে একটানা কাশি', icon: '⏱️' },
          { value: 'none', label: 'এর কোনো লক্ষণ নেই', icon: '❌' },
        ]
      },
      {
        id: 302,
        question_text: 'কাশিতে কখনো রক্ত যেতে দেখেছেন কি (Hemoptysis)?',
        category: 'tuberculosis',
        input_type: 'single_select',
        order_index: 2,
        options: [
          { value: 'no_blood', label: 'কখনোই রক্ত আসেনি', icon: '❌' },
          { value: 'blood_streaked', label: 'কফের সাথে রক্তের সুতো বা ছোপ ছোপ দাগ', icon: '🩸' },
          { value: 'frank_blood', label: 'তাজা লাল রক্ত (কয়েক চামচ পরিমাণ)', icon: '🩸🩸' },
          { value: 'massive_hemoptysis', label: 'প্রচুর পরিমাণ রক্ত (>১০০ মিলি / কাপ ভরে) — জরুরি', icon: '🚨' },
        ]
      },
      {
        id: 303,
        question_text: 'পূর্বের টিবি চিকিৎসা বা কোনো টিবি রোগীর সংস্পর্শের ইতিহাস:',
        category: 'tuberculosis',
        input_type: 'multi_select',
        order_index: 3,
        options: [
          { value: 'past_tb_completed', label: 'আগে টিবি হয়েছিল — সম্পূর্ণ ওষুধ কোর্স শেষ করেছেন', icon: '💊' },
          { value: 'past_tb_defaulted', label: 'আগে টিবির ওষুধ মাঝপথে বন্ধ করে দিয়েছিলেন', icon: '⚠️' },
          { value: 'household_tb_contact', label: 'পরিবারের কোনো সক্রিয় টিবি রোগীর সাথে বসবাস', icon: '🏠' },
          { value: 'immunosuppressed', label: 'রোগ প্রতিরোধ ক্ষমতা কম (ডায়াবেটিস / স্টেরয়েড ইত্যাদি)', icon: '🛡️' },
          { value: 'none', label: 'কোনো পূর্ব ইতিহাস বা সংস্পর্শ নেই', icon: '✅' },
        ]
      },
    ],
    ild: [
      {
        id: 401,
        question_text: 'শ্বাসকষ্ট এবং কাশির প্রকৃতি (ILD / ফুসফুসের ফাইব্রোসিস):',
        category: 'ild',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'gradual_progressive', label: 'মাস বা বছর ধরে ধীরে ধীরে বাড়তে থাকা শ্বাসকষ্ট', icon: '📈' },
          { value: 'rapid_progressive', label: 'কয়েক সপ্তাহের মধ্যে দ্রুত বাড়তে থাকা তীব্র শ্বাসকষ্ট', icon: '⚡' },
          { value: 'dry_hacking_cough', label: 'একটানা কফহীন খুকখুকে শুকনো কাশি', icon: '🗣️' },
          { value: 'spO2_drop_walking', label: 'হাঁটাহাঁটি করলেই অক্সিজেনের মাত্রা হঠাৎ নেমে যাওয়া', icon: '📉' },
        ]
      },
      {
        id: 402,
        question_text: 'পাখি, ধুলোবালি বা পেশাগত পরিবেশের সংস্পর্শ:',
        category: 'ild',
        input_type: 'multi_select',
        order_index: 2,
        options: [
          { value: 'pigeon_bird_exposure', label: 'পায়রা / পাখির পালক বা বিষ্ঠার সংস্পর্শ', icon: '🕊️' },
          { value: 'stone_silica_dust', label: 'পাথর ভাঙা / বালি বা সিলিকা ধূলিকণার কাজ', icon: '⛏️' },
          { value: 'asbestos_construction', label: 'অ্যাসবেস্টস / কনস্ট্রাকশন বা নির্মাণকাজের ধুলো', icon: '🏗️' },
          { value: 'mold_dampness', label: 'ঘরের ভেজা স্যাঁতসেঁতে ভাব / ছত্রাক / কুলারের জল', icon: '💧' },
          { value: 'drug_induced', label: 'নির্দিষ্ট কিছু ওষুধের পার্শ্বপ্রতিক্রিয়া (Methotrexate ইত্যাদি)', icon: '💊' },
          { value: 'none', label: 'এমন কোনো পরিবেশগত সংস্পর্শ নেই', icon: '❌' },
        ]
      },
      {
        id: 403,
        question_text: 'গাঁটে গাঁটে ব্যথা বা অটোইমিউন রোগের লক্ষণ (CTD-ILD স্ক্রিনিং):',
        category: 'ild',
        input_type: 'multi_select',
        order_index: 3,
        options: [
          { value: 'joint_pains_stiffness', label: 'সন্ধিতে ব্যথা ও সকালে ১ ঘণ্টার বেশি আড়ষ্ট ভাব', icon: '🦴' },
          { value: 'raynauds_phenomenon', label: 'ঠান্ডা লাগলে আঙুল সাদা বা নীল হয়ে যাওয়া', icon: '❄️' },
          { value: 'skin_thickening', label: 'আঙুল বা মুখের ত্বক টানটান ও শক্ত হয়ে যাওয়া', icon: '✋' },
          { value: 'dry_eyes_mouth', label: 'চোখ ও মুখ অতিরিক্ত শুকিয়ে যাওয়া', icon: '👁️' },
          { value: 'muscle_weakness', label: 'সিঁড়ি ভাঙতে বা চুল আঁচড়াতে পেশির দুর্বলতা', icon: '💪' },
          { value: 'none', label: 'কোনো অটোইমিউন লক্ষণ নেই', icon: '✅' },
        ]
      },
    ],
    bronchiectasis: [
      {
        id: 501,
        question_text: 'কফের পরিমাণ ও বৈশিষ্ট্য (ব্রঙ্কিএক্টেসিস):',
        category: 'bronchiectasis',
        input_type: 'single_select',
        order_index: 1,
        options: [
          { value: 'copious_daily_sputum', label: 'প্রতিদিন প্রচুর পরিমাণ ঘন কফ (আধ থেকে এক কাপ)', icon: '🥣' },
          { value: 'three_layered_sputum', label: 'ঘন, দুর্গন্ধযুক্ত, সবুজ বা হলদেটে কফ', icon: '🟢' },
          { value: 'occasional_hemoptysis', label: 'কফের সাথে ঘন ঘন রক্ত আসার ইতিহাস', icon: '🩸' },
          { value: 'dry_bronchiectasis', label: 'প্রধানত শুকনো কাশি এবং মাঝে মাঝে রক্তপাত', icon: '🗣️' },
        ]
      },
      {
        id: 502,
        question_text: 'শৈশবে নিউমোনিয়া, হুপিং কাশি বা পূর্ববর্তী টিবির ইতিহাস:',
        category: 'bronchiectasis',
        input_type: 'multi_select',
        order_index: 2,
        options: [
          { value: 'childhood_pneumonia', label: 'শৈশবে তীব্র নিউমোনিয়া বা হুপিং কাশি (Pertussis)', icon: '👶' },
          { value: 'past_pulmonary_tb', label: 'পূর্বে ফুসফুসের যক্ষ্মা/টিবি হওয়ার ইতিহাস', icon: '🦠' },
          { value: 'recurrent_sinusitis', label: 'দীর্ঘস্থায়ী সাইনোসাইটিস বা নাকে পলিপ', icon: '👃' },
          { value: 'recurrent_chest_infections', label: 'বছরে ৩-৪ বারের বেশি অ্যান্টিবায়োটিক লাগা', icon: '💊' },
          { value: 'none', label: 'এমন কোনো পূর্ব ইতিহাস নেই', icon: '❌' },
        ]
      },
    ],
    pneumonia: [
      {
        id: 601,
        question_text: 'নিউমোনিয়ার হঠাৎ লক্ষণ ও জ্বরের বৈশিষ্ট্য:',
        category: 'pneumonia',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'high_fever_rigors', label: 'কাঁপুনি দিয়ে হঠাৎ তীব্র জ্বর', icon: '🔥' },
          { value: 'sharp_pleuritic_pain', label: 'গভীর শ্বাস নিলে বা কাশলে বুকে তীব্র সুচ ফোটার মতো ব্যথা', icon: '⚡' },
          { value: 'rust_colored_sputum', label: 'মরিচা রঙের (Rust-colored) বা গাঢ় সবুজ কফ', icon: '🟤' },
          { value: 'rapid_breathing_tachypnea', label: 'খুব দ্রুত ও ঘন ঘন শ্বাস নেওয়া', icon: '🫁' },
          { value: 'confusion_altered_mental', label: 'বয়স্কদের ক্ষেত্রে বিভ্রান্তি বা অসংলগ্ন আচরণ (CURB-65)', icon: '🧠' },
        ]
      },
    ],
    pleural: [
      {
        id: 701,
        question_text: 'প্লুরা ও বুকের দেয়ালের লক্ষণসমূহ:',
        category: 'pleural',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'unilateral_sharp_pain', label: 'বুকের একদিকে ধারালো ছুরির মতো তীব্র ব্যথা', icon: '🗡️' },
          { value: 'trepopnea_positional', label: 'আক্রান্ত দিকে কাত হয়ে শুলে তুলনামূলক আরাম লাগা', icon: '🛏️' },
          { value: 'dry_cough_dull_heaviness', label: 'বুকে চাপা ভারী ভাব, হালকা ব্যথা ও শুকনো কাশি', icon: '🪨' },
          { value: 'recent_trauma_surgery', label: 'সম্প্রতি বুকে চোট পাওয়া, পড়ে যাওয়া বা অস্ত্রোপচার', icon: '🩹' },
        ]
      },
    ],
    rhinitis: [
      {
        id: 801,
        question_text: 'নাক ও গলার অ্যালার্জিজনিত লক্ষণসমূহ:',
        category: 'rhinitis',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'paroxysmal_sneezing', label: 'একটানা ঘন ঘন অনেকগুলো হাঁচি আসা (একসাথে ৫+ হাঁচি)', icon: '🤧' },
          { value: 'watery_rhinorrhea', label: 'নাক দিয়ে পাতলা জলের মতো সর্দি ঝরা ও নাক চুলকানো', icon: '💧' },
          { value: 'nasal_congestion_blockage', label: 'এক বা উভয় নাক বন্ধ হয়ে থাকা', icon: '👃' },
          { value: 'post_nasal_drip_throat', label: 'গলার পেছনে কফ পড়ার অনুভূতি / বারবার গলা খাঁকারি দেওয়া', icon: '🥛' },
          { value: 'ocular_itching_redness', label: 'চোখ লাল হওয়া, চুলকানি ও জল পড়া', icon: '👁️' },
        ]
      },
    ],
    osa: [
      {
        id: 901,
        question_text: 'ঘুমের মধ্যে শ্বাস ব্যাঘাত ও দিনের বেলার লক্ষণ (স্লিপ অ্যাপনিয়া):',
        category: 'osa',
        input_type: 'multi_select',
        order_index: 1,
        options: [
          { value: 'loud_habitual_snoring', label: 'প্রচণ্ড জোরে নাক ডাকা (বন্ধ দরজার ওপার থেকেও শোনা যায়)', icon: '💤' },
          { value: 'witnessed_apneas', label: 'ঘুমের মধ্যে দম আটকে যাওয়া বা শ্বাস বন্ধ হতে দেখা', icon: '⚠️' },
          { value: 'excessive_daytime_sleepiness', label: 'দিনের বেলা কাজ বা টিভি দেখতে দেখতেই অতিরিক্ত ঘুমিয়ে পড়া', icon: '🚗' },
          { value: 'morning_headache_dry_mouth', label: 'সকালে ঘুম ভাঙলে মুখ শুকিয়ে থাকা ও মাথা দপদপ করা', icon: '🤕' },
          { value: 'unrefreshed_sleep', label: 'ঘুমিয়েও ক্লান্তি না যাওয়া / রাতে বারবার প্রস্রাবের জন্য ওঠা', icon: '🌙' },
        ]
      },
    ],
  },
};

export const DISEASE_QUESTION_SETS = DISEASE_QUESTION_SETS_LOCALIZED.en;

const UI_TEXT = {
  en: {
    protocolLabel: 'Disease-Specific Protocol:',
    question: 'Question',
    of: 'of',
    selectAll: 'Select all that apply',
    orDescribe: 'or describe in your own words',
    placeholderVoice: 'Type additional details or click mic to speak...',
    back: 'Back',
    cancel: 'Cancel',
    skip: 'Skip',
    next: 'Next',
    finish: 'Finish & Save Q&A',
    loading: 'Loading respiratory clinical question modules...',
  },
  hi: {
    protocolLabel: 'रोग अनुसार प्रश्नावली:',
    question: 'प्रश्न',
    of: 'का',
    selectAll: 'लागू होने वाले सभी विकल्प चुनें',
    orDescribe: 'या अपने शब्दों में बोलकर/लिखकर बताएं',
    placeholderVoice: 'अतिरिक्त जानकारी लिखें या माइक दबाकर बोलें...',
    back: 'पीछे',
    cancel: 'रद्द करें',
    skip: 'छोड़ें',
    next: 'आगे',
    finish: 'पूरा करें व सहेजें',
    loading: 'श्वसन रोग मॉड्यूल लोड हो रहे हैं...',
  },
  bn: {
    protocolLabel: 'রোগভিত্তিক প্রশ্নাবলী:',
    question: 'প্রশ্ন',
    of: 'এর',
    selectAll: 'প্রযোজ্য সমস্ত বিকল্প নির্বাচন করুন',
    orDescribe: 'অথবা নিজের ভাষায় বলুন বা লিখুন',
    placeholderVoice: 'অতিরিক্ত তথ্য লিখুন অথবা মাইক টিপে মুখে বলুন...',
    back: 'পেছনে',
    cancel: 'বাতিল',
    skip: 'এড়িয়ে যান',
    next: 'পরবর্তী',
    finish: 'সম্পূর্ণ করুন ও সেভ করুন',
    loading: 'ফুসফুস ও শ্বাসরোগের প্রশ্নাবলী লোড হচ্ছে...',
  },
};

export const SuggestiveQaIntake = ({ language: propLanguage, onComplete, onCancel }: SuggestiveQaIntakeProps) => {
  const { fetchWithCsrf } = useAppContext();
  const [activeLang, setActiveLang] = useState<'en' | 'hi' | 'bn'>(() => {
    if (propLanguage === 'hi' || propLanguage === 'bn') return propLanguage;
    return 'en';
  });

  // Sync with prop if it changes
  useEffect(() => {
    if (propLanguage === 'hi' || propLanguage === 'bn' || propLanguage === 'en') {
      setActiveLang(propLanguage);
    }
  }, [propLanguage]);

  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  const t = UI_TEXT[activeLang] || UI_TEXT.en;
  const diseaseCategories = DISEASE_CATEGORIES_LOCALIZED[activeLang] || DISEASE_CATEGORIES_LOCALIZED.en;
  const localizedQuestionSets = DISEASE_QUESTION_SETS_LOCALIZED[activeLang] || DISEASE_QUESTION_SETS_LOCALIZED.en;

  // Load questions from API if available
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

  // Derive active question set based on selected disease and language
  const questions: Question[] = useMemo(() => {
    if (selectedDisease !== 'all' && localizedQuestionSets[selectedDisease]) {
      return localizedQuestionSets[selectedDisease];
    }
    if (activeLang === 'en' && apiQuestions.length > 0) {
      return apiQuestions;
    }
    // Fallback: concatenate all disease questions in the active language
    return Object.values(localizedQuestionSets).flat();
  }, [selectedDisease, localizedQuestionSets, activeLang, apiQuestions]);

  // Reset step when disease filter changes
  const handleDiseaseChange = (diseaseId: string) => {
    setSelectedDisease(diseaseId);
    setCurrentStep(0);
  };

  // Setup Web Speech API with High-Speed Continuous Capture & selected language
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = activeLang === 'hi' ? 'hi-IN' : activeLang === 'bn' ? 'bn-IN' : 'en-IN';
      rec.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        setVoiceText(fullTranscript.trim());
      };
      rec.onerror = (e: any) => {
        console.warn('Speech error:', e.error);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, [activeLang]);

  const toggleVoice = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        setVoiceText('');
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden" style={{ minHeight: '560px' }}>
      
      {/* Disease Protocol Switcher Header + Quick Language Selector */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {t.protocolLabel}
            </span>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {diseaseCategories.find(d => d.id === selectedDisease)?.label || 'General'}
            </span>
          </div>

          {/* Language Switcher Buttons (EN / HI / BN) */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ml-auto">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5" />
            {(['en', 'hi', 'bn'] as const).map(langCode => (
              <button
                key={langCode}
                onClick={() => setActiveLang(langCode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeLang === langCode
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-teal-600'
                }`}
              >
                {langCode === 'en' ? '🇬🇧 EN' : langCode === 'hi' ? '🇮🇳 हिन्दी' : '🇧🇩 বাংলা'}
              </button>
            ))}
          </div>
        </div>

        {/* Disease Pills Scrollable Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {diseaseCategories.map(disease => {
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
            {diseaseCategories.find(d => d.id === currentQuestion?.category)?.label || currentQuestion?.category}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            {t.question} {currentStep + 1} {t.of} {questions.length}
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
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t.selectAll}</p>
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

        {/* Voice Overlay / Text Input with live language badge */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">{t.orDescribe}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={voiceText}
              onChange={e => setVoiceText(e.target.value)}
              placeholder={t.placeholderVoice}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-300 dark:placeholder-slate-600 transition-all"
            />
            {recognition && (
              <button
                onClick={toggleVoice}
                className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
                  isListening
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-400 hover:text-teal-500 bg-white dark:bg-slate-800'
                }`}
                title={`Mic (${activeLang.toUpperCase()})`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase">{activeLang}</span>
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
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
        ) : onCancel ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {t.cancel}
          </button>
        ) : <div />}

        <button
          onClick={handleSkip}
          className="px-3 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-all"
        >
          {t.skip}
        </button>

        <button
          onClick={handleNext}
          className={`ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            canProceed()
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          {currentStep === questions.length - 1 ? t.finish : t.next}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
