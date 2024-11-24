const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Models
const TransactionSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    dateOfSale: Date,
    category: String,
    sold: Boolean,
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

// Initialize Database
app.get('/api/initialize', async (req, res) => {
    try {
        const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        console.log(data);
        await Transaction.deleteMany({});
        await Transaction.insertMany(data);
        res.json({ message: 'Database initialized with seed data.' });
    } catch (error) {
        console.error('Error during initialization:', error);
        res.status(500).json({ error: 'Failed to initialize database.' });
    }
});

// List Transactions with Search and Pagination
app.get('/api/transactions', async (req, res) => {
    const { month, search = "", page = 1, perPage = 10 } = req.query;
    const validMonths = [
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (!validMonths.includes(month)) {
        return res.status(400).json({ error: 'Invalid month value' });
    }

    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || 10;

    const query = {
        $expr: {
            $eq: [{ $month: "$dateOfSale" }, validMonths.indexOf(month) + 1]
        },
        $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
    };

    console.log('Query:', JSON.stringify(query, null, 2)); // Debugging the query

    try {
        const transactions = await Transaction.find(query)
            .skip((pageNum - 1) * perPageNum)
            .limit(perPageNum);
        const totalRecords = await Transaction.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / perPageNum);

        res.json({ transactions, totalPages });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});



// Statistics API
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;
    const validMonths = [
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (!validMonths.includes(month)) {
        return res.status(400).json({ error: 'Invalid month value' });
    }

    // Get the month index (1 for January, 2 for February, etc.)
    const monthIndex = validMonths.indexOf(month) + 1; // Month number (1-12)

    // Create start and end date for the selected month, using UTC
    const startDate = new Date(Date.UTC(2024, monthIndex - 1, 1)); // Start of the month in UTC
    const endDate = new Date(Date.UTC(2024, monthIndex, 1)); // Start of the next month in UTC

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    try {
        // Total sales (sold items only)
        const totalSales = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate }, sold: true } },
            { $group: { _id: null, totalAmount: { $sum: "$price" }, count: { $sum: 1 } } }
        ]);

        // Total not sold items
        const totalNotSold = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lt: endDate },
            sold: false
        });

        console.log('Total Sales:', totalSales);
        console.log('Total Not Sold:', totalNotSold);

        // Respond with the data
        res.json({
            totalSales: totalSales[0] || { totalAmount: 0, count: 0 },
            totalNotSold
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Bar Chart API
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;
    const validMonths = [
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (!validMonths.includes(month)) {
        return res.status(400).json({ error: 'Invalid month value' });
    }

    const startDate = new Date(`2024-${month}-01`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
    const ranges = [
        [0, 100], [101, 200], [201, 300], [301, 400], [401, 500],
        [501, 600], [601, 700], [701, 800], [801, 900], [901, Infinity]
    ];

    try {
        const chartData = await Promise.all(ranges.map(async ([min, max]) => {
            const count = await Transaction.countDocuments({
                dateOfSale: { $gte: startDate, $lt: endDate },
                price: { $gte: min, $lt: max === Infinity ? Infinity : max }
            });
            return { range: `${min}-${max === Infinity ? "above" : max}`, count };
        }));
        res.json(chartData);
    } catch (error) {
        console.error('Error fetching bar chart data:', error);
        res.status(500).json({ error: 'Failed to fetch bar chart data' });
    }
});

// Pie Chart API
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;
    const validMonths = [
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (!validMonths.includes(month)) {
        return res.status(400).json({ error: 'Invalid month value' });
    }

    const startDate = new Date(`2024-${month}-01`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    try {
        const categories = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching pie chart data:', error);
        res.status(500).json({ error: 'Failed to fetch pie chart data' });
    }
});

// Combined API
app.get('/api/combined', async (req, res) => {
    const { month } = req.query;

    try {
        const [transactions, statistics, barChart, pieChart] = await Promise.all([
            Transaction.find({ dateOfSale: { $gte: startDate, $lt: endDate } }).limit(10),
            Transaction.aggregate([{ $group: { total: { $sum: "$price" } } }]),
            // Additional combined data logic can be expanded.
        ]);
        res.json({ transactions, statistics, barChart, pieChart });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});

// Start the server
app.listen(5000, () => console.log('Server running on port 5000'));
