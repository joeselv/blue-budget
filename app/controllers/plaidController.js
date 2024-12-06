/* 	
Contains functions that interact with Plaid’s API:
	createLinkToken: Generates a link token to initiate the Plaid Link module on the frontend.
	getAccessToken: Exchanges the public_token (received after linking an account) for an access_token, which is used to fetch financial data.
	getAccountBalance: Retrieves the account balances using the access_token.
  getTransactions: Transaction information also gotten using the access_token.
	These functions are exported to be used in routing.
*/

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../config/env.json');
const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf8'));
const plaid = require('plaid');
const pool = require('../db');
const tokenStorage = {}; 
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
    //console.log('Received public_token:', public_token);
  
    if (!public_token) {
      return res.status(400).json({ error: 'Missing public_token' });
    }
  
    try {
      const response = await client.itemPublicTokenExchange({ public_token });
      const access_token = response.data.access_token;
      
      res.json({ access_token });
    } catch (error) {
      console.error('Error exchanging public_token:', error);
      res.status(500).json({ error: 'Failed to exchange public_token' });
    }
  };

// Fetch Account Balances
// const getAccountBalance = async (req, res) => {
//     const { access_token } = req.body;
//     // const access_token = req.session.access_token;
//     if (!access_token) {
//       return res.status(400).json({ error: 'Missing access_token' });
//     }
  
//     try {
//       const response = await client.accountsBalanceGet({ access_token });
//       res.json(response.data.accounts);
//     } catch (error) {
//       console.error('Error fetching account balance:', error);
//       res.status(500).json({ error: 'Failed to fetch account balance' });
//     }
//   };
  

// const getAccountBalance = async (req, res) => {
//   const { access_token } = req.body;

//   if (!access_token) {
//       return res.status(400).json({ error: 'Missing access_token' });
//   }

//   try {
//       // Fetch account balances from Plaid
//       const response = await client.accountsBalanceGet({ access_token });
//       const accounts = response.data.accounts;

//       // Save account data to the database
//       const userId = req.user.id; // Ensure `req.user` contains authenticated user info

//       for (const account of accounts) {
//           const query = `
//               INSERT INTO accounts (user_id, account_name, account_type, balance)
//               VALUES ($1, $2, $3, $4)
//               ON CONFLICT (account_name) DO UPDATE
//               SET balance = $4
//           `;

//           const values = [
//               userId,                  // Foreign key to the user table
//               account.name,            // Account name (Plaid-provided name)
//               account.type,            // Account type (e.g., depository, credit)
//               account.balances.current // Current balance from Plaid
//           ];

//           await pool.query(query, values);
//       }

//       // Return accounts to the front end
//       res.json(accounts);
//   } catch (error) {
//       console.error('Error fetching account balance:', error);
//       res.status(500).json({ error: 'Failed to fetch account balance' });
//   }
// };

const getAccount = async (req, res) => {
  // Validate the session token from cookies
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing session token' });
  }

  // Verify the token in tokenStorage
  const email = tokenStorage[token];
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }

  // Fetch the user ID from the database using the email
  let userId;
  try {
    const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    userId = userResult.rows[0].user_id;
  } catch (err) {
    console.error('Database query error:', err);
    return res.status(500).json({ error: 'Failed to validate user' });
  }

  // Check for access token in request body
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  try {
    // Fetch account balances from Plaid
    const response = await client.accountsBalanceGet({ access_token });
    const accounts = response.data.accounts;

    // Save account data to the database
    for (const account of accounts) {
      const query = `
        INSERT INTO accounts (user_id, account_name, account_type, balance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (account_name) DO UPDATE
        SET balance = $4
      `;

      const values = [
        userId,                  // Foreign key to the user table
        account.name,            // Account name (Plaid-provided name)
        account.type,            // Account type (e.g., depository, credit)
        account.balances.current // Current balance from Plaid
      ];

      await pool.query(query, values);
    }

    // Return accounts to the front end
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
};

const getLinkedAccounts = async (req, res) => {
  const { token } = req.cookies;

  if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing session token' });
  }

  const email = tokenStorage[token];
  if (!email) {
      return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }

  try {
      const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      const userId = userResult.rows[0].user_id;
      const accounts = await pool.query(
          'SELECT account_name, account_type, balance, plaid_account_id FROM accounts WHERE user_id = $1',
          [userId]
      );

      res.json(accounts.rows);
  } catch (error) {
      console.error('Error fetching linked accounts:', error);
      res.status(500).json({ error: 'Failed to fetch linked accounts' });
  }
};


// const unlinkAccount = async (req, res) => {
//   try {
//       const { accessToken } = req.body;
      
      
//       // Remove from Plaid's Item
//       await client.itemRemove({
//           access_token: accessToken
//       });


//       res.json({ success: true });
//   } catch (error) {
//       console.error('Error unlinking account:', error);
//       res.status(500).json({ error: 'Failed to unlink account' });
//   }
// };

// const unlinkAccount = async (req, res) => {
//   const { plaid_account_id } = req.body;

//   try {
//       const userId = req.user.id; // Ensure user is authenticated
//       const query = 'DELETE FROM accounts WHERE user_id = $1 AND plaid_account_id = $2';
//       await pool.query(query, [userId, plaid_account_id]);

//       res.status(200).json({ message: 'Account unlinked successfully' });
//   } catch (error) {
//       console.error('Error unlinking account:', error);
//       res.status(500).json({ error: 'Failed to unlink account' });
//   }
// };

const unlinkAccount = async (req, res) => {
  const { plaid_account_id } = req.body;

  // Validate the session token from cookies
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing session token' });
  }

  // Verify the token in tokenStorage
  const email = tokenStorage[token];
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }

  // Fetch the user ID from the database using the email
  let userId;
  try {
    const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    userId = userResult.rows[0].user_id;
  } catch (err) {
    console.error('Database query error:', err);
    return res.status(500).json({ error: 'Failed to validate user' });
  }

  // Delete the account associated with the user
  try {
    const query = 'DELETE FROM accounts WHERE user_id = $1 AND plaid_account_id = $2';
    await pool.query(query, [userId, plaid_account_id]);

    res.status(200).json({ message: 'Account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking account:', error);
    res.status(500).json({ error: 'Failed to unlink account' });
  }
};



module.exports = { createLinkToken, getAccessToken, getLinkedAccounts,unlinkAccount  };

