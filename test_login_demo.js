async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "admin@gmail.com", password: "123456" })
        });
        const data = await response.json();
        console.log('LOGIN SUCCESS:', data);
    } catch (err) {
        console.error('LOGIN ERROR:', err.message);
    }
}
testLogin();
