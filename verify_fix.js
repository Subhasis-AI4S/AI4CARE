async function verifyFallback() {
    try {
        console.log('Testing /api/gemini/questions fallback...');
        const response = await fetch('http://localhost:3001/api/gemini/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complaint: 'I have a sore throat' })
        });
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Generated Questions:', JSON.stringify(data, null, 2));
        
        if (Array.isArray(data) && data.length === 6) {
            console.log('SUCCESS: Received 6 fallback questions.');
        } else {
            console.error('FAILURE: Expected 6 questions, got:', data);
        }
    } catch (error) {
        console.error('Error during verification:', error);
    }
}

verifyFallback();
