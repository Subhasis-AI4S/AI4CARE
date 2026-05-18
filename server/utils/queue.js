const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const USE_REDIS = !!process.env.REDIS_URL;
let connection = null;
let aiQueue = null;
let redisReady = false;

if (USE_REDIS) {
    connection = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null
    });

    aiQueue = new Queue('ai-processing', { connection });

    connection.on('connect', () => {
        console.log('Connected to Redis for AI queue');
        redisReady = true;
    });
    connection.on('error', (err) => {
        console.warn('Redis connection failed. Background jobs will be processed synchronously.');
        redisReady = false;
    });
}

async function addSummaryJob(sessionId, tenantId, language) {
    if (redisReady) {
        return await aiQueue.add('generate-summary', {
            sessionId,
            tenantId,
            language
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });
    } else {
        console.log('Processing summary synchronously due to Redis unavailability...');
        const { processSummary } = require('../workers/aiWorker');
        try {
            const summary = await processSummary({ sessionId, tenantId, language });
            return { status: 'completed', ...summary };
        } catch (err) {
            console.error('Synchronous summary processing failed:', err);
            throw err;
        }
    }
}

module.exports = {
    aiQueue,
    addSummaryJob,
    connection
};
