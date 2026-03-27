const gemini = require('./server/gemini');

async function test() {
    try {
        console.log('Testing generateQuestions...');
        const questions = await gemini.generateQuestions('I have a bad cough and fever');
        console.log('Questions:', questions);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
