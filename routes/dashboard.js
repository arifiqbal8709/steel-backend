const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const invoiceDB = new JsonStore('invoices');
const productDB = new JsonStore('products');
const customerDB = new JsonStore('customers');
const staffDB = new JsonStore('staff');
const expenseDB = new JsonStore('expenses');
const purchaseDB = new JsonStore('purchases');

router.use(auth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const invoices = await invoiceDB.find({ userId, isDeleted: false });
        const customers = await customerDB.find({ userId, isDeleted: false });
        const products = await productDB.find({ userId, isDeleted: false });
        const staffEntries = await staffDB.find({ userId, isDeleted: false });

        // 1. Total Sales
        const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        // 2. Pending Payments (Customer Balances)
        const pendingPayments = customers.reduce((sum, c) => sum + (Number(c.previousDue) || 0), 0);

        // 3. Stock Summary
        const totalValue = products.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0);
        const totalItems = products.length;

        // 4. Low Stock Alert
        const lowStock = products
            .filter(p => Number(p.stock) <= (Number(p.lowStockThreshold) || 10))
            .slice(0, 5)
            .map(p => ({ _id: p._id, name: p.name, stock: p.stock }));

        // 5. Staff Outstanding
        const staffOutstanding = staffEntries.reduce((sum, entry) => sum + (Number(entry.balance) || 0), 0);

        // 6. Chart Data (Last 6 Months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();

            const monthSales = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === m && invDate.getFullYear() === y;
            }).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

            const monthStaff = staffEntries.filter(entry => {
                const eDate = new Date(entry.date);
                return eDate.getMonth() === m && eDate.getFullYear() === y;
            }).reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);

            chartData.push({
                name: months[m],
                sales: monthSales,
                salary: monthStaff
            });
        }

        res.json({
            totalSales,
            pendingPayments,
            stockValue: totalValue,
            totalItems,
            staffOutstanding,
            lowStock,
            chartData
        });

    } catch (err) {
        console.error("DASHBOARD STATS ERROR:", err);
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
});

// GET /api/dashboard/annual-report/:year
router.get('/annual-report/:year', async (req, res) => {
    try {
        const userId = req.user.id;
        const year = parseInt(req.params.year);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const invoices = await invoiceDB.find({ userId, isDeleted: false });
        const purchases = await purchaseDB.find({ userId });
        const expenses = await expenseDB.find({ userId, isDeleted: false });

        const monthlyData = months.map((month, i) => {
            const mRev = invoices.filter(inv => {
                const d = new Date(inv.date);
                return d.getFullYear() === year && d.getMonth() === i;
            }).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

            const mPur = purchases.filter(p => {
                const d = new Date(p.date);
                return d.getFullYear() === year && d.getMonth() === i;
            }).reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

            const mExp = expenses.filter(e => {
                const d = new Date(e.date);
                return d.getFullYear() === year && d.getMonth() === i;
            }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            return {
                name: month,
                revenue: mRev,
                purchase: mPur,
                expenses: mExp,
                profit: mRev - mPur - mExp
            };
        });

        const totalRev = monthlyData.reduce((a, m) => a + m.revenue, 0);
        const totalPur = monthlyData.reduce((a, m) => a + m.purchase, 0);
        const totalExp = monthlyData.reduce((a, m) => a + m.expenses, 0);
        const totalPro = totalRev - totalPur - totalExp;

        res.json({
            monthly: monthlyData,
            totalRev,
            totalPur,
            totalExp,
            totalPro
        });

    } catch (err) {
        console.error("ANNUAL REPORT ERROR:", err);
        res.status(500).json({ message: 'Error fetching report', error: err.message });
    }
});

module.exports = router;
