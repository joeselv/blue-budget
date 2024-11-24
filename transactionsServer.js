const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

const env = require('./env.json');
const pool = new Pool(env);


pool.connect()
    .then(() => console.log(`Connected to database ${env.database}`))
    .catch((err) => console.error('Error connecting to database:', err));

app.use(express.static("public"));

app.get('/transactions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                transactionId, 
                accountType, 
                categoryType, 
                transactiondate, 
                amount, 
                transactiontype, 
                transactiondescription 
            FROM transactions
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).send('Error fetching transactions');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transactions.html'));
});

app.listen(port, () => {
    console.log(`Server running at: http://localhost:${port}`);
});
