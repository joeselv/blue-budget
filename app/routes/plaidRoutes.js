const express = require('express');
const {
    createLinkToken,
    getAccessToken,
    getLinkedAccounts,
    unlinkAccount
} = require('../controllers/plaidController');
const router = express.Router();

router.get('/link-token', createLinkToken); // Endpoint to create a Link Token
router.post('/exchange-public-token', getAccessToken); // Endpoint to exchange Public Token for Access Token
router.get('/linked-accounts', getLinkedAccounts); // Changed to GET as it fetches linked accounts from the database
router.post('/unlink-account', unlinkAccount); // Endpoint to unlink an account

module.exports = router;
