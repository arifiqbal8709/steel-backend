const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

async function seed() {
    const demoEmail = 'admin@gmail.com';
    const demoPassword = '123456';

    if (users.find(u => u.email === demoEmail)) {
        console.log('Demo user already exists.');
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(demoPassword, salt);

    const newUser = {
        _id: 'demo_user_001',
        name: 'Demo Admin',
        email: demoEmail,
        mobile: '1234567890',
        password: hashedPassword,
        businessName: 'Demo Vyapar',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log('Demo user created: admin@gmail.com / 123456');
}

seed();
