/**
 * seed_respiratory.js — AI4CARE Respiratory Department Seed Data
 * 
 * Seeds:
 *   1. Respiratory Medication Templates (Inhalers, Bronchodilators, Steroids, etc.)
 *   2. Respiratory Investigation Templates (PFT, HRCT, Lab, Procedures)
 *   3. Respiratory Suggestive Q&A Question Templates (Card-based intake)
 * 
 * Run: node server/db/seed_respiratory.js
 * Or called automatically at startup from initializeDatabase()
 */

const db = require('./database');

async function seedRespiratoryData() {
    const tenantId = 'global'; // Global templates visible to all tenants
    const now = db.isPg ? 'NOW()' : 'CURRENT_TIMESTAMP';

    // ─────────────────────────────────────────────
    // 1. MEDICATION TEMPLATES — Respiratory
    // ─────────────────────────────────────────────
    const medications = [
        // Inhaled Corticosteroids (ICS)
        { name: 'Budesonide Inhaler', generic_name: 'Budesonide', category: 'ics', dosage: '200mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS — rinse mouth after use' },
        { name: 'Beclomethasone Inhaler', generic_name: 'Beclomethasone Dipropionate', category: 'ics', dosage: '250mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS — rinse mouth after use' },
        { name: 'Fluticasone Inhaler', generic_name: 'Fluticasone Propionate', category: 'ics', dosage: '250mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS' },
        { name: 'Ciclesonide Inhaler', generic_name: 'Ciclesonide', category: 'ics', dosage: '160mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'ICS — once daily' },

        // Long-Acting Beta Agonists (LABA)
        { name: 'Formoterol Inhaler', generic_name: 'Formoterol Fumarate', category: 'laba', dosage: '12mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'LABA — not for acute relief' },
        { name: 'Salmeterol Inhaler', generic_name: 'Salmeterol Xinafoate', category: 'laba', dosage: '50mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'LABA' },
        { name: 'Indacaterol Inhaler', generic_name: 'Indacaterol Maleate', category: 'laba', dosage: '150mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'Ultra-LABA' },

        // Long-Acting Muscarinic Antagonists (LAMA)
        { name: 'Tiotropium Inhaler', generic_name: 'Tiotropium Bromide', category: 'lama', dosage: '18mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'LAMA — Handihaler/Respimat' },
        { name: 'Glycopyrrolate Inhaler', generic_name: 'Glycopyrronium Bromide', category: 'lama', dosage: '50mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'LAMA' },
        { name: 'Umeclidinium Inhaler', generic_name: 'Umeclidinium Bromide', category: 'lama', dosage: '62.5mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'LAMA' },
        { name: 'Aclidinium Inhaler', generic_name: 'Aclidinium Bromide', category: 'lama', dosage: '322mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'LAMA' },

        // ICS + LABA Combinations
        { name: 'Budesonide + Formoterol (Foracort)', generic_name: 'Budesonide / Formoterol', category: 'ics_laba', dosage: '200/6mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS+LABA combination' },
        { name: 'Fluticasone + Salmeterol (Seretide)', generic_name: 'Fluticasone / Salmeterol', category: 'ics_laba', dosage: '250/25mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS+LABA combination' },
        { name: 'Beclomethasone + Formoterol', generic_name: 'Beclomethasone / Formoterol', category: 'ics_laba', dosage: '100/6mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'ICS+LABA combination' },
        { name: 'Fluticasone + Vilanterol (Relvar)', generic_name: 'Fluticasone Furoate / Vilanterol', category: 'ics_laba', dosage: '100/25mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'Once-daily ICS+LABA' },

        // Triple Therapy (ICS + LABA + LAMA)
        { name: 'Budesonide + Formoterol + Glycopyrrolate (Trimbow)', generic_name: 'BUD/FOR/GLYCO', category: 'triple_therapy', dosage: '160/4.8/9mcg', route: 'inhaled', frequency: 'BD', default_duration: '30 days', notes: 'Triple therapy for severe COPD' },
        { name: 'Fluticasone + Umeclidinium + Vilanterol (Trelegy)', generic_name: 'FF/UMEC/VI', category: 'triple_therapy', dosage: '100/62.5/25mcg', route: 'inhaled', frequency: 'OD', default_duration: '30 days', notes: 'Once-daily triple therapy' },

        // Short-Acting Beta Agonists (SABA) — Rescue
        { name: 'Salbutamol Inhaler (Reliever)', generic_name: 'Salbutamol Sulphate', category: 'saba', dosage: '100mcg', route: 'inhaled', frequency: 'SOS', default_duration: 'As needed', notes: 'Rescue inhaler — 2 puffs PRN' },
        { name: 'Levosalbutamol Inhaler', generic_name: 'Levosalbutamol', category: 'saba', dosage: '50mcg', route: 'inhaled', frequency: 'SOS', default_duration: 'As needed', notes: 'R-isomer SABA' },
        { name: 'Terbutaline Inhaler', generic_name: 'Terbutaline Sulphate', category: 'saba', dosage: '250mcg', route: 'inhaled', frequency: 'SOS', default_duration: 'As needed', notes: 'SABA reliever' },

        // Nebulization
        { name: 'Salbutamol Nebulization', generic_name: 'Salbutamol', category: 'nebulization', dosage: '2.5mg in 2.5ml NS', route: 'nebulized', frequency: 'TID', default_duration: '5 days', notes: 'Acute bronchospasm' },
        { name: 'Ipratropium Nebulization', generic_name: 'Ipratropium Bromide', category: 'nebulization', dosage: '500mcg in 2.5ml', route: 'nebulized', frequency: 'TID', default_duration: '5 days', notes: 'SAMA bronchodilator' },
        { name: 'Budesonide Nebulization', generic_name: 'Budesonide', category: 'nebulization', dosage: '1mg in 2ml', route: 'nebulized', frequency: 'BD', default_duration: '7 days', notes: 'ICS nebulization' },

        // Oral Corticosteroids
        { name: 'Prednisolone Tablet', generic_name: 'Prednisolone', category: 'oral_steroids', dosage: '40mg', route: 'oral', frequency: 'OD morning', default_duration: '5-7 days', notes: 'Taper as per response' },
        { name: 'Methylprednisolone Tablet', generic_name: 'Methylprednisolone', category: 'oral_steroids', dosage: '16mg', route: 'oral', frequency: 'OD', default_duration: '7 days', notes: 'Oral steroid' },
        { name: 'Dexamethasone Injection', generic_name: 'Dexamethasone', category: 'oral_steroids', dosage: '8mg', route: 'intravenous', frequency: 'OD', default_duration: '3 days', notes: 'IV steroid' },

        // Antifibrotics (ILD)
        { name: 'Pirfenidone (Esbriet)', generic_name: 'Pirfenidone', category: 'antifibrotic', dosage: '801mg', route: 'oral', frequency: 'TID with meals', default_duration: 'Long-term', notes: 'For IPF — titrate dose' },
        { name: 'Nintedanib (Ofev)', generic_name: 'Nintedanib', category: 'antifibrotic', dosage: '150mg', route: 'oral', frequency: 'BD with food', default_duration: 'Long-term', notes: 'For IPF and fibrosing ILDs' },

        // Anti-TB
        { name: 'HRZE (Anti-TB Intensive Phase)', generic_name: 'Isoniazid + Rifampicin + Pyrazinamide + Ethambutol', category: 'anti_tb', dosage: 'Weight-based', route: 'oral', frequency: 'Daily', default_duration: '2 months', notes: 'RNTCP protocol intensive phase' },
        { name: 'HR (Anti-TB Continuation Phase)', generic_name: 'Isoniazid + Rifampicin', category: 'anti_tb', dosage: 'Weight-based', route: 'oral', frequency: 'Daily', default_duration: '4 months', notes: 'RNTCP continuation phase' },
        { name: 'Bedaquiline', generic_name: 'Bedaquiline', category: 'anti_tb', dosage: '400mg', route: 'oral', frequency: 'Daily (2wks), then 3x/wk', default_duration: '6 months', notes: 'DR-TB treatment' },

        // Mucolytics / Cough Agents
        { name: 'Acetylcysteine (NAC)', generic_name: 'N-Acetylcysteine', category: 'mucolytic', dosage: '600mg', route: 'oral', frequency: 'OD', default_duration: '30 days', notes: 'Mucolytic — also antioxidant in ILD' },
        { name: 'Ambroxol Tablet', generic_name: 'Ambroxol Hydrochloride', category: 'mucolytic', dosage: '30mg', route: 'oral', frequency: 'TID', default_duration: '7 days', notes: 'Mucolytic expectorant' },
        { name: 'Erdosteine Capsule', generic_name: 'Erdosteine', category: 'mucolytic', dosage: '300mg', route: 'oral', frequency: 'BD', default_duration: '10 days', notes: 'Mucolytic antioxidant' },
        { name: 'Carbocisteine Tablet', generic_name: 'Carbocisteine', category: 'mucolytic', dosage: '375mg', route: 'oral', frequency: 'TID', default_duration: '7 days', notes: 'Mucolytic' },

        // Leukotriene Receptor Antagonists
        { name: 'Montelukast Tablet', generic_name: 'Montelukast Sodium', category: 'ltra', dosage: '10mg', route: 'oral', frequency: 'OD at night', default_duration: '30 days', notes: 'LTRA — for asthma and allergic rhinitis' },
        { name: 'Zafirlukast Tablet', generic_name: 'Zafirlukast', category: 'ltra', dosage: '20mg', route: 'oral', frequency: 'BD', default_duration: '30 days', notes: 'LTRA' },

        // Biologics (Severe Asthma)
        { name: 'Dupilumab Injection', generic_name: 'Dupilumab', category: 'biologic', dosage: '300mg SC', route: 'subcutaneous', frequency: 'Every 2 weeks', default_duration: 'Long-term', notes: 'Anti-IL-4/13 — Type2 asthma/eosinophilic' },
        { name: 'Mepolizumab Injection', generic_name: 'Mepolizumab', category: 'biologic', dosage: '100mg SC', route: 'subcutaneous', frequency: 'Every 4 weeks', default_duration: 'Long-term', notes: 'Anti-IL-5 — eosinophilic asthma' },
        { name: 'Omalizumab Injection', generic_name: 'Omalizumab', category: 'biologic', dosage: 'Weight/IgE based', route: 'subcutaneous', frequency: 'Every 2-4 weeks', default_duration: 'Long-term', notes: 'Anti-IgE — allergic asthma' },
        { name: 'Benralizumab Injection', generic_name: 'Benralizumab', category: 'biologic', dosage: '30mg SC', route: 'subcutaneous', frequency: 'Every 4-8 weeks', default_duration: 'Long-term', notes: 'Anti-IL-5Rα — eosinophilic asthma' },

        // Antibiotics (Respiratory)
        { name: 'Amoxicillin-Clavulanate Tablet', generic_name: 'Amoxicillin + Clavulanic Acid', category: 'antibiotic', dosage: '625mg', route: 'oral', frequency: 'TID', default_duration: '7 days', notes: 'Community-acquired pneumonia/exacerbation' },
        { name: 'Azithromycin Tablet', generic_name: 'Azithromycin', category: 'antibiotic', dosage: '500mg', route: 'oral', frequency: 'OD', default_duration: '5 days', notes: 'Atypical pneumonia/exacerbation' },
        { name: 'Doxycycline Tablet', generic_name: 'Doxycycline Hyclate', category: 'antibiotic', dosage: '100mg', route: 'oral', frequency: 'BD', default_duration: '7 days', notes: 'COPD exacerbation, atypicals' },
        { name: 'Levofloxacin Tablet', generic_name: 'Levofloxacin', category: 'antibiotic', dosage: '750mg', route: 'oral', frequency: 'OD', default_duration: '7 days', notes: 'Respiratory fluoroquinolone' },
        { name: 'Moxifloxacin Tablet', generic_name: 'Moxifloxacin', category: 'antibiotic', dosage: '400mg', route: 'oral', frequency: 'OD', default_duration: '7 days', notes: 'Respiratory fluoroquinolone' },

        // Antihistamines
        { name: 'Fexofenadine Tablet', generic_name: 'Fexofenadine Hydrochloride', category: 'antihistamine', dosage: '120mg', route: 'oral', frequency: 'OD', default_duration: '30 days', notes: 'Non-sedating antihistamine' },
        { name: 'Cetirizine Tablet', generic_name: 'Cetirizine Hydrochloride', category: 'antihistamine', dosage: '10mg', route: 'oral', frequency: 'OD at night', default_duration: '30 days', notes: 'Low-sedating antihistamine' },
        { name: 'Loratadine Tablet', generic_name: 'Loratadine', category: 'antihistamine', dosage: '10mg', route: 'oral', frequency: 'OD', default_duration: '30 days', notes: 'Non-sedating antihistamine' },
        { name: 'Levocetirizine Tablet', generic_name: 'Levocetirizine Dihydrochloride', category: 'antihistamine', dosage: '5mg', route: 'oral', frequency: 'OD at night', default_duration: '30 days', notes: 'Antihistamine' },

        // Nasal Steroids
        { name: 'Mometasone Nasal Spray', generic_name: 'Mometasone Furoate', category: 'nasal_steroid', dosage: '50mcg/spray', route: 'intranasal', frequency: '2 sprays each nostril OD', default_duration: '30 days', notes: 'Allergic rhinitis' },
        { name: 'Fluticasone Nasal Spray', generic_name: 'Fluticasone Propionate', category: 'nasal_steroid', dosage: '50mcg/spray', route: 'intranasal', frequency: '2 sprays each nostril OD', default_duration: '30 days', notes: 'Allergic rhinitis' },
        { name: 'Budesonide Nasal Spray', generic_name: 'Budesonide', category: 'nasal_steroid', dosage: '64mcg/spray', route: 'intranasal', frequency: '2 sprays each nostril OD', default_duration: '30 days', notes: 'Allergic rhinitis' },

        // Phosphodiesterase Inhibitors
        { name: 'Theophylline Tablet SR', generic_name: 'Theophylline', category: 'xanthine', dosage: '200mg', route: 'oral', frequency: 'BD', default_duration: '30 days', notes: 'Bronchodilator — monitor drug levels' },
        { name: 'Roflumilast Tablet', generic_name: 'Roflumilast', category: 'pde4_inhibitor', dosage: '500mcg', route: 'oral', frequency: 'OD', default_duration: '30 days', notes: 'PDE-4 inhibitor — severe COPD with frequent exacerbations' },

        // Antifungal (Pulmonary)
        { name: 'Itraconazole Capsule', generic_name: 'Itraconazole', category: 'antifungal', dosage: '200mg', route: 'oral', frequency: 'BD with meals', default_duration: '12 weeks', notes: 'ABPA, Aspergillosis' },
        { name: 'Voriconazole Tablet', generic_name: 'Voriconazole', category: 'antifungal', dosage: '200mg', route: 'oral', frequency: 'BD', default_duration: 'As clinically indicated', notes: 'Invasive Aspergillosis' },

        // Supplemental O2 / Pulmonary Support
        { name: 'Oxygen Therapy', generic_name: 'Supplemental Oxygen', category: 'oxygen', dosage: '2-4 L/min', route: 'inhalation', frequency: 'Continuous/PRN', default_duration: 'As needed', notes: 'SpO2 target 88-92% for COPD; >95% others' },
    ];

    // ─────────────────────────────────────────────
    // 2. INVESTIGATION TEMPLATES — Respiratory
    // ─────────────────────────────────────────────
    const investigations = [
        // Pulmonary Function Tests
        { name: 'Spirometry (Basic PFT)', category: 'pft', sub_category: 'spirometry', description: 'FEV1, FVC, FEV1/FVC ratio — obstruction/restriction pattern' },
        { name: 'Spirometry with Reversibility Test', category: 'pft', sub_category: 'spirometry', description: 'Post-bronchodilator spirometry — asthma vs COPD differentiation' },
        { name: 'DLCO (Diffusion Capacity)', category: 'pft', sub_category: 'dlco', description: 'Carbon monoxide diffusing capacity — ILD, emphysema assessment' },
        { name: 'Full PFT with Lung Volumes (Plethysmography)', category: 'pft', sub_category: 'plethysmography', description: 'TLC, RV, FRC — air trapping assessment' },
        { name: 'Bronchial Provocation Test (BPT)', category: 'pft', sub_category: 'provocation', description: 'Methacholine / Mannitol challenge for airway hyperreactivity' },
        { name: 'FeNO (Fractional Exhaled Nitric Oxide)', category: 'pft', sub_category: 'feno', description: 'Eosinophilic airway inflammation marker — Type 2 asthma' },
        { name: '6-Minute Walk Test (6MWT)', category: 'pft', sub_category: 'exercise', description: 'Functional exercise capacity — ILD, PAH, COPD' },
        { name: 'Cardiopulmonary Exercise Test (CPET)', category: 'pft', sub_category: 'exercise', description: 'VO2max, AT — dyspnea etiology, surgical risk' },
        { name: 'Pulse Oximetry (SpO2)', category: 'pft', sub_category: 'oximetry', description: 'Resting and exertional oxygen saturation' },
        { name: 'Overnight Pulse Oximetry', category: 'pft', sub_category: 'sleep', description: 'Nocturnal desaturation screening — OSA' },
        { name: 'Polysomnography (PSG / Sleep Study)', category: 'pft', sub_category: 'sleep', description: 'Full sleep study — OSA, UARS, sleep-disordered breathing' },

        // Imaging
        { name: 'Chest X-Ray (PA View)', category: 'imaging', sub_category: 'xray', description: 'Baseline chest radiograph — PA view' },
        { name: 'Chest X-Ray (Lateral View)', category: 'imaging', sub_category: 'xray', description: 'Lateral chest radiograph' },
        { name: 'HRCT Chest (Without Contrast)', category: 'imaging', sub_category: 'ct', description: 'High-resolution CT — ILD, bronchiectasis, emphysema' },
        { name: 'CECT Chest (With Contrast)', category: 'imaging', sub_category: 'ct', description: 'Contrast-enhanced CT — mediastinal mass, PE, adenopathy' },
        { name: 'CT Pulmonary Angiography (CTPA)', category: 'imaging', sub_category: 'ct', description: 'Pulmonary embolism diagnosis' },
        { name: 'PET-CT Scan', category: 'imaging', sub_category: 'nuclear', description: 'Staging — lung malignancy, lymphoma' },
        { name: 'Ventilation-Perfusion (V/Q) Scan', category: 'imaging', sub_category: 'nuclear', description: 'PE diagnosis when CTPA contraindicated, CTEPH' },
        { name: '2D Echocardiogram', category: 'imaging', sub_category: 'cardiac', description: 'Pulmonary hypertension, cardiac causes of dyspnea' },
        { name: 'Ultrasound Chest (Pleural)', category: 'imaging', sub_category: 'ultrasound', description: 'Pleural effusion characterization and guided tap' },

        // Laboratory Tests
        { name: 'CBC (Complete Blood Count)', category: 'lab', sub_category: 'haematology', description: 'Eosinophilia, anemia, polycythemia — respiratory context', normal_range: 'WBC 4-11×10³/μL, Hb 12-17g/dL, Plt 150-400×10³/μL' },
        { name: 'Absolute Eosinophil Count (AEC)', category: 'lab', sub_category: 'haematology', description: 'Eosinophilic lung disease, severe asthma, ABPA', normal_range: '<500 cells/μL' },
        { name: 'ABG (Arterial Blood Gas)', category: 'lab', sub_category: 'blood_gas', description: 'pH, PaO2, PaCO2, HCO3 — respiratory failure, acid-base status', normal_range: 'pH 7.35-7.45, PaO2 80-100, PaCO2 35-45' },
        { name: 'Total IgE Level', category: 'lab', sub_category: 'immunology', description: 'Allergic asthma, ABPA, parasitic eosinophilia', normal_range: '<100 IU/mL' },
        { name: 'Specific IgE / RAST Panel', category: 'lab', sub_category: 'immunology', description: 'Allergen-specific IgE — house dust mite, mold, aspergillus' },
        { name: 'Aspergillus-Specific IgE & IgG', category: 'lab', sub_category: 'immunology', description: 'ABPA diagnosis — A. fumigatus IgE+IgG', normal_range: 'IgE <0.35 kUA/L (negative)' },
        { name: 'ANA / ANCA / Anti-dsDNA Panel', category: 'lab', sub_category: 'immunology', description: 'Connective tissue disease-associated ILD (CTD-ILD)' },
        { name: 'Anti-CCP, RF (Rheumatoid Factor)', category: 'lab', sub_category: 'immunology', description: 'RA-ILD screening' },
        { name: 'Procalcitonin (PCT)', category: 'lab', sub_category: 'infection', description: 'Bacterial pneumonia severity, antibiotic guidance', normal_range: '<0.25 ng/mL' },
        { name: 'CRP (C-Reactive Protein)', category: 'lab', sub_category: 'inflammation', description: 'Acute phase reactant — infection, inflammation' },
        { name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'lab', sub_category: 'inflammation', description: 'Chronic inflammation screening' },
        { name: 'LDH (Lactate Dehydrogenase)', category: 'lab', sub_category: 'biochemistry', description: 'Pleural fluid / ILD activity marker', normal_range: '140-280 U/L' },
        { name: 'Serum ACE (Angiotensin Converting Enzyme)', category: 'lab', sub_category: 'immunology', description: 'Sarcoidosis activity marker', normal_range: '8-52 U/L' },
        { name: 'D-Dimer', category: 'lab', sub_category: 'coagulation', description: 'Pulmonary embolism rule-out', normal_range: '<500 ng/mL' },
        { name: 'BNP / NT-proBNP', category: 'lab', sub_category: 'cardiac', description: 'Heart failure, pulmonary hypertension workup' },
        { name: 'Thyroid Function Tests (TSH, T3, T4)', category: 'lab', sub_category: 'endocrine', description: 'Amiodarone pulmonary toxicity, thyroid-ILD association' },

        // Sputum Tests
        { name: 'Sputum Gram Stain & Culture', category: 'sputum', sub_category: 'microbiology', description: 'Bacterial pneumonia pathogen identification' },
        { name: 'Sputum AFB Smear (3 samples)', category: 'sputum', sub_category: 'tb', description: 'Tuberculosis screening — 3 consecutive morning samples' },
        { name: 'Sputum CBNAAT (GeneXpert MTB/RIF)', category: 'sputum', sub_category: 'tb', description: 'Rapid TB & rifampicin resistance detection' },
        { name: 'Sputum AFB Culture & DST (LJ Media)', category: 'sputum', sub_category: 'tb', description: 'TB culture and drug sensitivity — 8 weeks' },
        { name: 'Sputum Cytology', category: 'sputum', sub_category: 'cytology', description: 'Malignant cells — lung cancer screening' },
        { name: 'Sputum Fungal Culture', category: 'sputum', sub_category: 'microbiology', description: 'Aspergillus, Candida, atypical fungal infections' },
        { name: 'Induced Sputum (Hypertonic Saline)', category: 'sputum', sub_category: 'microbiology', description: 'For patients unable to produce sputum spontaneously' },

        // Procedures
        { name: 'Bronchoscopy (Flexible)', category: 'procedure', sub_category: 'bronchoscopy', description: 'Direct airway visualization, BAL, biopsy' },
        { name: 'Bronchoalveolar Lavage (BAL)', category: 'procedure', sub_category: 'bronchoscopy', description: 'Cell differential — ILD, infection, alveolar proteinosis' },
        { name: 'Transbronchial Lung Biopsy (TBLB)', category: 'procedure', sub_category: 'bronchoscopy', description: 'ILD, sarcoidosis — tissue diagnosis via bronchoscopy' },
        { name: 'EBUS-TBNA (Endobronchial Ultrasound)', category: 'procedure', sub_category: 'bronchoscopy', description: 'Mediastinal/hilar lymph node sampling — staging' },
        { name: 'Thoracentesis (Pleural Tap)', category: 'procedure', sub_category: 'pleural', description: 'Diagnostic/therapeutic pleural fluid aspiration' },
        { name: 'Pleural Fluid Analysis (LDH, protein, cytology, culture)', category: 'procedure', sub_category: 'pleural', description: 'Light criteria — exudate vs transudate characterization' },
        { name: 'Pleural Biopsy (Closed/VATS)', category: 'procedure', sub_category: 'pleural', description: 'Pleural TB, mesothelioma, malignant pleural disease' },
        { name: 'CT-Guided Lung Biopsy', category: 'procedure', sub_category: 'biopsy', description: 'Peripheral lung lesion, mass biopsy under CT guidance' },
        { name: 'Surgical Lung Biopsy (VATS/Open)', category: 'procedure', sub_category: 'biopsy', description: 'ILD definitive diagnosis — UIP, NSIP, OP patterns' },
        { name: 'Skin Prick Test (SPT)', category: 'procedure', sub_category: 'allergy', description: 'Allergen sensitivity — asthma, allergic rhinitis' },
        { name: 'Manoux/TST (Tuberculin Skin Test)', category: 'procedure', sub_category: 'tb', description: 'Latent TB screening' },
        { name: 'IGRA (Interferon Gamma Release Assay)', category: 'procedure', sub_category: 'tb', description: 'QuantiFERON-Gold — latent TB diagnosis' },
    ];

    // ─────────────────────────────────────────────
    // 3. SUGGESTIVE Q&A QUESTIONS — Respiratory Intake
    // ─────────────────────────────────────────────
    const questions = [
        {
            question_text: 'What is the primary symptom today?',
            category: 'chief_complaint',
            input_type: 'multi_select',
            order_index: 0,
            options: [
                { value: 'cough', label: 'Cough', icon: '🫁' },
                { value: 'breathlessness', label: 'Breathlessness / Dyspnea', icon: '💨' },
                { value: 'chest_pain', label: 'Chest Pain / Tightness', icon: '❤️' },
                { value: 'wheezing', label: 'Wheezing', icon: '🌬️' },
                { value: 'hemoptysis', label: 'Blood in Sputum (Hemoptysis)', icon: '🩸' },
                { value: 'sputum', label: 'Sputum / Phlegm Production', icon: '🧪' },
                { value: 'stridor', label: 'Noisy Breathing (Stridor)', icon: '🔊' },
                { value: 'fatigue', label: 'Fatigue / Weakness', icon: '😴' },
                { value: 'weight_loss', label: 'Weight Loss', icon: '⚖️' },
                { value: 'night_sweats', label: 'Night Sweats', icon: '🌙' },
                { value: 'fever', label: 'Fever', icon: '🌡️' },
            ]
        },
        {
            question_text: 'How long have you had this problem?',
            category: 'duration',
            input_type: 'single_select',
            order_index: 1,
            options: [
                { value: 'acute_days', label: 'Less than 7 days', icon: '⚡' },
                { value: 'acute_weeks', label: '1–3 weeks (Acute)', icon: '📅' },
                { value: 'subacute', label: '3–8 weeks (Subacute)', icon: '🗓️' },
                { value: 'chronic_mild', label: '2–6 months', icon: '📆' },
                { value: 'chronic', label: 'More than 6 months (Chronic)', icon: '🕰️' },
                { value: 'years', label: 'More than 1 year', icon: '📊' },
            ]
        },
        {
            question_text: 'How severe is the breathlessness? (MRC Dyspnea Scale)',
            category: 'severity',
            input_type: 'single_select',
            order_index: 2,
            options: [
                { value: 'mrc0', label: 'MRC 0 — No breathlessness', icon: '✅' },
                { value: 'mrc1', label: 'MRC 1 — Breathless only with strenuous exercise', icon: '🏃' },
                { value: 'mrc2', label: 'MRC 2 — Short of breath when hurrying or slight incline', icon: '🚶' },
                { value: 'mrc3', label: 'MRC 3 — Walks slower than others; stops after 100m', icon: '🐢' },
                { value: 'mrc4', label: 'MRC 4 — Too breathless to leave house; breathless dressing', icon: '🛋️' },
            ]
        },
        {
            question_text: 'What type of cough do you have?',
            category: 'cough_type',
            input_type: 'single_select',
            order_index: 3,
            options: [
                { value: 'dry', label: 'Dry / Non-productive', icon: '🏜️' },
                { value: 'productive', label: 'Wet / Productive (with sputum)', icon: '💧' },
                { value: 'blood', label: 'Blood-stained sputum (Hemoptysis)', icon: '🩸' },
                { value: 'nocturnal', label: 'Mainly at night', icon: '🌙' },
                { value: 'morning', label: 'Mainly in the morning', icon: '🌅' },
            ]
        },
        {
            question_text: 'What is the colour of your sputum?',
            category: 'sputum',
            input_type: 'single_select',
            order_index: 4,
            options: [
                { value: 'no_sputum', label: 'No Sputum (Dry cough)', icon: '❌' },
                { value: 'clear', label: 'Clear / White', icon: '⬜' },
                { value: 'yellow', label: 'Yellow', icon: '🟡' },
                { value: 'green', label: 'Green (Purulent)', icon: '🟢' },
                { value: 'rust', label: 'Rust / Brown (Blood-tinged)', icon: '🟤' },
                { value: 'pink_frothy', label: 'Pink / Frothy (Pulmonary edema)', icon: '🩷' },
            ]
        },
        {
            question_text: 'What triggers or worsens your symptoms?',
            category: 'triggers',
            input_type: 'multi_select',
            order_index: 5,
            options: [
                { value: 'cold_air', label: 'Cold Air / Season Change', icon: '❄️' },
                { value: 'dust_smoke', label: 'Dust / Smoke / Fumes', icon: '💨' },
                { value: 'exercise', label: 'Exercise / Exertion', icon: '🏋️' },
                { value: 'pollen', label: 'Pollen / Flowers / Grass', icon: '🌸' },
                { value: 'animals', label: 'Animals / Pet Dander', icon: '🐱' },
                { value: 'night', label: 'Night / Early Morning', icon: '🌙' },
                { value: 'lying_flat', label: 'Lying Flat (Orthopnea)', icon: '🛏️' },
                { value: 'infections', label: 'Infections / Colds', icon: '🦠' },
                { value: 'aspirin_nsaid', label: 'Aspirin / NSAIDs', icon: '💊' },
                { value: 'food', label: 'Certain Foods', icon: '🍽️' },
                { value: 'stress', label: 'Emotional Stress / Anxiety', icon: '😰' },
            ]
        },
        {
            question_text: 'Do you have any associated symptoms? (Select all that apply)',
            category: 'associated_symptoms',
            input_type: 'multi_select',
            order_index: 6,
            options: [
                { value: 'fever', label: 'Fever / Chills', icon: '🌡️' },
                { value: 'night_sweats', label: 'Night Sweats', icon: '🌙' },
                { value: 'weight_loss', label: 'Weight Loss', icon: '⚖️' },
                { value: 'ankle_swelling', label: 'Ankle / Leg Swelling', icon: '🦵' },
                { value: 'chest_pain', label: 'Chest Pain', icon: '❤️' },
                { value: 'palpitations', label: 'Palpitations', icon: '💓' },
                { value: 'nasal', label: 'Runny / Blocked Nose', icon: '👃' },
                { value: 'hoarseness', label: 'Hoarseness of Voice', icon: '🔇' },
                { value: 'gerd', label: 'Heartburn / Acid Reflux (GERD)', icon: '🔥' },
                { value: 'snoring', label: 'Snoring / Gasping at Night', icon: '💤' },
                { value: 'joint_pain', label: 'Joint Pain / Skin Rash (CTD?)', icon: '🦴' },
            ]
        },
        {
            question_text: 'Smoking history?',
            category: 'smoking',
            input_type: 'single_select',
            order_index: 7,
            options: [
                { value: 'never', label: 'Never Smoked', icon: '✅' },
                { value: 'ex_smoker', label: 'Ex-Smoker (Quit)', icon: '🚭' },
                { value: 'current_light', label: 'Current Smoker — Occasional / Light', icon: '🚬' },
                { value: 'current_heavy', label: 'Current Smoker — Heavy (>10 cigs/day)', icon: '🚬🚬' },
                { value: 'passive', label: 'Passive / Second-hand Smoke Exposure', icon: '💨' },
                { value: 'biomass', label: 'Biomass / Wood Smoke / Chulha', icon: '🔥' },
            ]
        },
        {
            question_text: 'Occupational / environmental exposure history?',
            category: 'exposure',
            input_type: 'multi_select',
            order_index: 8,
            options: [
                { value: 'none', label: 'No significant exposure', icon: '✅' },
                { value: 'construction_dust', label: 'Dust — Construction / Mining / Stone', icon: '🏗️' },
                { value: 'asbestos', label: 'Asbestos exposure', icon: '⚠️' },
                { value: 'chemicals_fumes', label: 'Chemical / Industrial Fumes', icon: '🧪' },
                { value: 'bird_exposure', label: 'Bird / Pigeon / Poultry Droppings', icon: '🕊️' },
                { value: 'grain_dust', label: 'Grain / Agricultural Dust', icon: '🌾' },
                { value: 'wood_dust', label: 'Wood / Furniture Dust', icon: '🪵' },
                { value: 'mold_damp', label: 'Mold / Dampness at Home', icon: '🏚️' },
            ]
        },
        {
            question_text: 'Any history of previous lung disease?',
            category: 'past_history',
            input_type: 'multi_select',
            order_index: 9,
            options: [
                { value: 'none', label: 'None', icon: '✅' },
                { value: 'asthma', label: 'Asthma', icon: '🫁' },
                { value: 'copd', label: 'COPD / Emphysema / Chronic Bronchitis', icon: '💨' },
                { value: 'tb', label: 'Tuberculosis (TB)', icon: '🦠' },
                { value: 'ild', label: 'ILD / Pulmonary Fibrosis', icon: '🔬' },
                { value: 'bronchiectasis', label: 'Bronchiectasis', icon: '🫁' },
                { value: 'pleural_disease', label: 'Pleural Effusion / Pleuritis', icon: '💧' },
                { value: 'sleep_apnea', label: 'Sleep Apnea (OSA)', icon: '💤' },
                { value: 'pulm_hypertension', label: 'Pulmonary Hypertension', icon: '❤️' },
                { value: 'lung_cancer', label: 'Lung Malignancy', icon: '🔴' },
            ]
        },
        {
            question_text: 'Any red flag symptoms? (Requires urgent evaluation)',
            category: 'red_flags',
            input_type: 'multi_select',
            order_index: 10,
            options: [
                { value: 'none', label: 'None of the below', icon: '✅' },
                { value: 'hemoptysis_significant', label: 'Significant blood coughed up', icon: '🩸' },
                { value: 'severe_dyspnea', label: 'Severe breathlessness at rest', icon: '🆘' },
                { value: 'cyanosis', label: 'Blue lips / Cyanosis', icon: '🔵' },
                { value: 'rapid_weight_loss', label: 'Unexplained weight loss >5kg', icon: '⚖️' },
                { value: 'high_fever', label: 'High-grade fever >39°C', icon: '🌡️' },
                { value: 'stridor', label: 'Loud noisy breathing (Stridor)', icon: '🔊' },
                { value: 'chest_wall_pain', label: 'Severe pleuritic chest pain', icon: '💔' },
            ]
        },
    ];

    // ─── INSERT MEDICATIONS ───
    let medCount = 0;
    for (const med of medications) {
        try {
            const existing = await db.get(
                'SELECT id FROM medication_templates WHERE LOWER(name) = ? AND tenant_id = ?',
                [med.name.toLowerCase(), tenantId]
            );
            if (!existing) {
                await db.run(
                    `INSERT INTO medication_templates (name, generic_name, category, dosage, route, frequency, default_duration, notes, is_custom, tenant_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                    [med.name, med.generic_name || '', med.category, med.dosage || '', med.route || 'oral', med.frequency || '', med.default_duration || '', med.notes || '', tenantId]
                );
                medCount++;
            }
        } catch (e) { /* skip duplicates */ }
    }
    console.log(`✓ Respiratory Medication Templates seeded: ${medCount} new entries`);

    // ─── INSERT INVESTIGATIONS ───
    let invCount = 0;
    for (const inv of investigations) {
        try {
            const existing = await db.get(
                'SELECT id FROM investigation_templates WHERE LOWER(name) = ? AND tenant_id = ?',
                [inv.name.toLowerCase(), tenantId]
            );
            if (!existing) {
                await db.run(
                    `INSERT INTO investigation_templates (name, category, sub_category, description, normal_range, tenant_id)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [inv.name, inv.category, inv.sub_category || '', inv.description || '', inv.normal_range || '', tenantId]
                );
                invCount++;
            }
        } catch (e) { /* skip duplicates */ }
    }
    console.log(`✓ Respiratory Investigation Templates seeded: ${invCount} new entries`);

    // ─── INSERT QUESTIONS ───
    let qCount = 0;
    for (const q of questions) {
        try {
            const existing = await db.get(
                'SELECT id FROM respiratory_question_templates WHERE LOWER(question_text) = ? AND tenant_id = ?',
                [q.question_text.toLowerCase(), tenantId]
            );
            if (!existing) {
                await db.run(
                    `INSERT INTO respiratory_question_templates (question_text, category, input_type, options, order_index, is_active, tenant_id)
                     VALUES (?, ?, ?, ?, ?, 1, ?)`,
                    [q.question_text, q.category, q.input_type, JSON.stringify(q.options), q.order_index, tenantId]
                );
                qCount++;
            }
        } catch (e) { /* skip duplicates */ }
    }
    console.log(`✓ Respiratory Q&A Question Templates seeded: ${qCount} new entries`);
}

module.exports = seedRespiratoryData;

// Allow direct execution
if (require.main === module) {
    seedRespiratoryData()
        .then(() => { console.log('Seeding complete.'); process.exit(0); })
        .catch(err => { console.error('Seeding failed:', err); process.exit(1); });
}
