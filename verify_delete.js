async function verifyDelete() {
    try {
        // 1. Create a dummy session
        console.log('Creating dummy session...');
        const createRes = await fetch('http://localhost:3001/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: 1, complaint: 'Test delete' })
        });
        const session = await createRes.json();
        const sessionId = session.id;
        console.log('Created Session ID:', sessionId);

        // 2. Delete the session
        console.log('Deleting session...');
        const deleteRes = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        const deleteData = await deleteRes.json();
        console.log('Delete Response:', deleteData);

        if (deleteData.success) {
            console.log('SUCCESS: Session deleted successfully.');
        } else {
            console.error('FAILURE: Delete failed:', deleteData);
        }
    } catch (error) {
        console.error('Error during verification:', error);
    }
}

verifyDelete();
