const http = require('http');

const testLogin = () => {
    const data = JSON.stringify({
        email: 'demo@demo.com',
        password: 'demo123'
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log("Testing Login for Demo User...");
    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log("Login Response Status:", res.statusCode);
            try {
                const response = JSON.parse(body);
                console.log("User Object:", JSON.stringify(response.user, null, 2));

                if (response.user && response.user.clinicName === 'Demo Healthcare Clinic') {
                    console.log("SUCCESS: Clinic Name is correctly returned!");
                } else {
                    console.log("FAILURE: Clinic Name is missing or incorrect. Got:", response.user ? response.user.clinicName : 'undefined');
                }
                process.exit(0);
            } catch (e) {
                console.error("Failed to parse response:", body);
                process.exit(1);
            }
        });
    });

    req.on('error', (error) => {
        console.error("Login test failed:", error.message);
        process.exit(1);
    });

    req.write(data);
    req.end();
};

testLogin();
