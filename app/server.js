const express = require('express');
const plaidRoutes = require('./routes/plaidRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files for frontend
app.use(express.static('public'));

// Use Plaid routes for API calls
app.use('/api/plaid', plaidRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});