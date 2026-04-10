const { Worker } = require('bullmq');
const db = require('../db/database');
const gemini = require('../gemini');
const { connection } = require('../utils/queue');

const processSummary = async (data) => {
    const { sessionId, tenantId, language } = data;
    if (!sessionId) {
        console.error(`[AI Worker] No session ID received`);
        throw new Error(`Session ID missing`);
    }

    try {
        // 1. Fetch data for summary with type-agnostic casting
        const patientSession = await db.get('SELECT s.*, p.name, p.age, p.gender FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE s.id::text = ? AND s.tenant_id::text = ?', [sessionId, tenantId]);
        if (!patientSession) throw new Error('Session not found');

        const [qas, docs] = await Promise.all([
            db.all('SELECT * FROM qa_pairs WHERE session_id::text = ? AND tenant_id::text = ? ORDER BY order_index ASC', [sessionId, tenantId]),
            db.all('SELECT * FROM documents WHERE session_id::text = ? AND tenant_id::text = ?', [sessionId, tenantId])
        ]);

        // 2. Generate summary using Gemini
        const summary = await gemini.generateSummary(patientSession, patientSession.complaint, qas, docs, language || 'en', tenantId);

        // 3. Save summary to DB with type-agnostic casting
        const checkExisting = await db.get('SELECT id FROM summaries WHERE session_id::text = ? AND tenant_id::text = ?', [sessionId, tenantId]);
        
        if (checkExisting) {
            await db.run(`UPDATE summaries SET 
                chief_complaint = ?, history_of_presenting_illness = ?, key_findings = ?, clinical_flags = ?, assessment_notes = ?, suggested_medications = ?, suggested_tests = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE session_id::text = ? AND tenant_id::text = ?`, 
                [summary.chief_complaint, summary.history_of_presenting_illness, JSON.stringify(summary.key_findings), JSON.stringify(summary.clinical_flags), summary.assessment_notes, summary.suggested_medications, summary.suggested_tests, sessionId, tenantId]);
        } else {
            await db.run('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, suggested_medications, suggested_tests, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [sessionId, summary.chief_complaint, summary.history_of_presenting_illness, JSON.stringify(summary.key_findings), JSON.stringify(summary.clinical_flags), summary.assessment_notes, summary.suggested_medications, summary.suggested_tests, tenantId]);
        }

        // 4. Update session status to completed
        await db.run("UPDATE sessions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id::text = ? AND tenant_id::text = ?", [sessionId, tenantId]);
        
        console.log(`Successfully completed AI summary for session ${sessionId}`);
    } catch (err) {
        console.error(`AI Worker error for session ${sessionId}:`, err);
        throw err;
    }
};

let worker = null;

if (connection) {
    worker = new Worker('ai-processing', async (job) => {
        return await processSummary(job.data);
    }, { connection });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed with error: ${err.message}`);
    });

    console.log('AI background worker started...');
} else {
    console.log('AI background worker disabled (using synchronous fallback).');
}

module.exports = { worker, processSummary };
