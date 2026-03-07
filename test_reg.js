async function register() {
    try {
        const response = await fetch('http://localhost:5000/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "Arif",
                email: "arif@gmail.com",
                password: "123456"
            })
        });
        const data = await response.json();
        console.log('STATUS:', response.status);
        console.log('RESPONSE:', data);
    } catch (error) {
        console.error('FETCH ERROR:', error.message);
    }
}

register();
