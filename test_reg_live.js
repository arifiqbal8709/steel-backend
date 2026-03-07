/**
 * Live test: POST /api/auth/register
 * Run: node test_reg_live.js
 */
const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname: 'localhost', port: 5000, path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = http.request(opts, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('\n======= REGISTRATION API LIVE TESTS =======\n');

    // Test 1: Valid registration
    console.log('[TEST 1] Valid new user registration...');
    const ts = Date.now();
    const r1 = await post('/api/auth/register', {
        name: 'Test User', email: `testuser_${ts}@example.com`, password: 'secret123'
    });
    console.log(`   Status: ${r1.status} | success: ${r1.body.success}`);
    console.log(`   Message: ${r1.body.message}`);
    console.log(`   Token present: ${!!r1.body.token}\n`);

    // Test 2: Duplicate email
    console.log('[TEST 2] Duplicate email attempt...');
    const r2 = await post('/api/auth/register', {
        name: 'Another User', email: `testuser_${ts}@example.com`, password: 'password456'
    });
    console.log(`   Status: ${r2.status} | success: ${r2.body.success}`);
    console.log(`   Message: ${r2.body.message}\n`);

    // Test 3: Missing name
    console.log('[TEST 3] Missing name field...');
    const r3 = await post('/api/auth/register', {
        email: 'noname@test.com', password: 'pass123'
    });
    console.log(`   Status: ${r3.status} | success: ${r3.body.success}`);
    console.log(`   Message: ${r3.body.message}\n`);

    // Test 4: Bad email format
    console.log('[TEST 4] Invalid email format...');
    const r4 = await post('/api/auth/register', {
        name: 'Bad Email', email: 'not-an-email', password: 'pass123'
    });
    console.log(`   Status: ${r4.status} | success: ${r4.body.success}`);
    console.log(`   Message: ${r4.body.message}\n`);

    // Test 5: Short password
    console.log('[TEST 5] Password too short (< 6 chars)...');
    const r5 = await post('/api/auth/register', {
        name: 'Short Pass', email: 'short@test.com', password: 'abc'
    });
    console.log(`   Status: ${r5.status} | success: ${r5.body.success}`);
    console.log(`   Message: ${r5.body.message}\n`);

    console.log('======= ALL TESTS DONE =======\n');
}

runTests().catch(e => {
    console.error('\nCould not connect to server:', e.message);
    console.error('Make sure the backend is running: node index.js\n');
});
