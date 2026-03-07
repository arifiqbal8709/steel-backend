async function testDashboard() {
    try {
        const loginResponse = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "admin@gmail.com", password: "123456" })
        });
        const loginData = await loginResponse.json();

        const response = await fetch('http://localhost:5000/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const data = await response.json();
        console.log('DASHBOARD STATS:', data);
    } catch (err) {
        console.error('DASHBOARD ERROR:', err.message);
    }
}
testDashboard();
