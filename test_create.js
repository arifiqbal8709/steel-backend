const API_URL = 'http://localhost:5000/api';

async function test() {
    try {
        console.log("Testing Registration...");
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "Test User",
                email: `test${Date.now()}@example.com`,
                password: "password123"
            })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(`Reg failed: ${JSON.stringify(regData)}`);

        const token = regData.token;
        console.log("Registered. Token received.");

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        console.log("Testing Product Creation...");
        const prodRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: "TEST PRODUCT",
                price: 100,
                stock: 50,
                unit: "PCS"
            })
        });
        const prodData = await prodRes.json();
        if (!prodRes.ok) throw new Error(`Prod failed: ${JSON.stringify(prodData)}`);
        console.log("Product Created:", prodData._id);

        console.log("Testing Customer Creation...");
        const custRes = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: "TEST CUSTOMER",
                contact: "1234567890",
                address: "Test Address"
            })
        });
        const custData = await custRes.json();
        if (!custRes.ok) throw new Error(`Cust failed: ${JSON.stringify(custData)}`);
        console.log("Customer Created:", custData._id);

        console.log("Testing Raw Material Type Creation...");
        const typeRes = await fetch(`${API_URL}/raw-materials`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                productName: "TEST TYPE"
            })
        });
        const typeData = await typeRes.json();
        if (!typeRes.ok) throw new Error(`Type failed: ${JSON.stringify(typeData)}`);
        console.log("Type Created:", typeData._id);

        console.log("Testing Invoice Creation...");
        const invRes = await fetch(`${API_URL}/invoices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                invoiceNo: `INV-${Date.now()}`,
                date: "2023-10-27",
                customerName: "TEST CUSTOMER",
                customerId: custData._id,
                items: [
                    { productName: "TEST PRODUCT", qty: 2, rate: 100, amount: 200 }
                ],
                grandTotal: 200,
                amountPaid: 200,
                balanceDue: 0
            })
        });
        const invData = await invRes.json();
        if (!invRes.ok) throw new Error(`Inv failed: ${JSON.stringify(invData)}`);
        console.log("Invoice Created:", invData._id);

        console.log("ALL TESTS PASSED!");
    } catch (err) {
        console.error("TEST FAILED!");
        console.error(err.message);
        process.exit(1);
    }
}

test();
