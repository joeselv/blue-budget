/* 	
Contains functions that interact with Plaid’s API:
	createLinkToken: Generates a link token to initiate the Plaid Link module on the frontend.
	getAccessToken: Exchanges the public_token (received after linking an account) for an access_token, which is used to fetch financial data.
	getAccountBalance: Retrieves the account balances using the access_token.
  getTransactions: Transaction information also gotten using the access_token.
	These functions are exported to be used in routing.
*/

const fs = require('fs');
const envConfig = JSON.parse(fs.readFileSync('../config/env.json', 'utf8'));
const plaid = require('plaid');

const client = new plaid.PlaidApi(
  new plaid.Configuration({
    basePath: plaid.PlaidEnvironments[envConfig.PLAID_ENV],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': envConfig.PLAID_CLIENT_ID,
        'PLAID-SECRET': envConfig.PLAID_SECRET,
      },
    },
  })
);

// Generate a link token for the frontend
const createLinkToken = async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: 'unique-user-id' },
      client_name: 'Blue Budget',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating link token' });
  }
};

// Exchange Public Token for Access Token
const getAccessToken = async (req, res) => {
    const { public_token } = req.body;
  
    // Log the received public_token to ensure it is reaching the backend
    console.log('Received public_token:', public_token);
  
    if (!public_token) {
      return res.status(400).json({ error: 'Missing public_token' });
    }
  
    try {
      const response = await client.itemPublicTokenExchange({ public_token });
      const access_token = response.data.access_token;
  
      // Log the access_token received from Plaid
      console.log('Access Token:', access_token);
  
      res.json({ access_token });
    } catch (error) {
      console.error('Error exchanging public_token:', error);
      res.status(500).json({ error: 'Failed to exchange public_token' });
    }
  };

// Fetch Account Balances
const getAccountBalance = async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'Missing access_token' });
    }
  
    try {
      const response = await client.accountsBalanceGet({ access_token });
      res.json(response.data.accounts);
    } catch (error) {
      console.error('Error fetching account balance:', error);
      res.status(500).json({ error: 'Failed to fetch account balance' });
    }
  };
  
  const getTransactions = async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
        return res.status(400).json({ error: 'Missing access_token' });
    }
  
    try {
        const response = await client.transactionsGet({
        access_token: access_token,
        start_date: '2024-01-01', //desired start date
        end_date: '2024-11-30'    //desired end date
        });
        res.json(response.data.transactions); // Return the list of transactions
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  };

module.exports = { createLinkToken, getAccessToken, getAccountBalance, getTransactions };