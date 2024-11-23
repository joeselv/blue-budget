// connects the specific URLs to the backend functions for plaid API calls
const express = require('express');
const { createLinkToken, getAccessToken, getAccountBalance, getTransactions,unlinkAccount } = require('../controllers/plaidController');
const router = express.Router();

router.get('/link-token', createLinkToken); // Endpoint to create a Link Token
router.post('/exchange-public-token', getAccessToken); // Endpoint to exchange Public Token for Access Token
router.post('/account-balance', getAccountBalance); // Endpoint to fetch account balances
router.post('/transactions', getTransactions); // New route for transactions
router.post('/unlink-account', unlinkAccount); // Add this line

module.exports = router;