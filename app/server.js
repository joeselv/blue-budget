const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const argon2 = require("argon2");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require('path'); 
const env = require("../config/env.json"); 
const plaidRoutes = require("./routes/plaidRoutes");
const fetch = require('node-fetch');

const port = 3000;
let host;
let config;
// fly.io sets NODE_ENV to production automatically, otherwise it's unset when running locally
if (process.env.NODE_ENV == "production") {
    host = "0.0.0.0";
    config = { connectionString: process.env.DATABASE_URL };
} else {
  host = "localhost";
  // Use the values from env.json for localhost configuration
  config = {
      user: env.user,
      host: env.host,
      database: env.database,
      password: env.password,
      port: env.port,
      ssl: env.ssl
  };
}

const app = express();
const fs = require('fs');
app.use(express.static('public'));
app.use('/resources', express.static('resources'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use('/api/plaid', plaidRoutes);
const pool = new Pool(config);

app.use(session({
  secret: 'your_secret_key', // change this
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true } // set to true for HTTPS
}));

// In-memory storage for tokens (use a database for production)
const tokenStorage = {};

// Database connection
pool.connect()
.then(() => {console.log("Connected to database");}
);

//get transactions from API
app.get("/api/transactions", async (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
      return res.sendStatus(400); 
  }

  try {
      const result = await pool.query(`
          SELECT 
              transaction_id,  
              transaction_date, 
              amount, 
              transaction_type, 
              merchant_name
          FROM transactions
      `);
      res.json(result.rows);
  } catch (err) {
      console.error("Error fetching transactions:", err);
      res.status(500).send("Error fetching transactions");
  }
});

//send html file
app.get("/transactions", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
      return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "dashboard", "transactions.html"));
});

/* Generates a random 32-byte token */
function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Cookie options for secure token handling
const cookieOptions = {
  httpOnly: true, // Prevent client-side JavaScript access
  secure: true, // Secure only in production and Fly.io
  sameSite: "strict", // Prevent CSRF attacks
};

// Dummy validation function (expand as needed)
function validateLogin(body) {
  return body.email && body.userpassword;
}

// Signup Route
app.post("/create", async (req, res) => {
  const { email, userpassword } = req.body;
  if (!validateLogin(req.body)) {
    console.log("Invalid input:", req.body);
    return res.sendStatus(400); // Invalid input
  }

  // Hash the userpassword
  let hash;
  try {
    hash = await argon2.hash(userpassword);
  } catch (error) {
    console.log("Hashing failed", error);
    return res.sendStatus(500);
  }

  // Insert the new user
  try {
    await pool.query("INSERT INTO users (email, userpassword) VALUES ($1, $2)", [
      email,
      hash,
    ]);
  } catch (error) {
    console.log("Insertion failed", error);
    return res.sendStatus(500);
  }

  // Automatically log in after signup
  const token = makeToken();
  tokenStorage[token] = email;
  return res.cookie("token", token, cookieOptions).json({ message: "Signup successful" });
});

app.post("/login", async (req, res) => {
  const { email, userpassword } = req.body;

  if (!validateLogin(req.body)) {
    return res.sendStatus(400);
  }

  let result;
  try {
    result = await pool.query("SELECT userpassword FROM users WHERE email = $1", [email]);
  } catch (error) {
    console.log("Select failed", error);
    return res.sendStatus(500);
  }

  if (result.rows.length === 0) {
    return res.sendStatus(400);
  }

  const hash = result.rows[0].userpassword;

  let verifyResult;
  try {
    verifyResult = await argon2.verify(hash, userpassword);
  } catch (error) {
    console.log("Verification failed", error);
    return res.sendStatus(500);
  }

  if (!verifyResult) {
    return res.sendStatus(400);
  }

  // Generate and store token, then set it in a cookie
  const token = makeToken();
  tokenStorage[token] = email;
  res.cookie("token", token, cookieOptions);

  // Redirect to /budget after successful login
  return res.redirect("/budget");
});

// Logout Route
app.post("/logout", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    return res.sendStatus(400); // Already logged out or invalid token
  }
  delete tokenStorage[token];
  return res.clearCookie("token", cookieOptions).json({ message: "Logout successful" });
});

app.get("/budget", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the budget page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/budget.html");
});


async function fetchTransactions() {
  // API URL
  const url = "https://sandbox.plaid.com/transactions/get";

  // Request payload
  const payload = {
    client_id: env.PLAID_CLIENT_ID,
    secret: env.PLAID_SECRET,
    access_token: env.PLAID_ACCESS_TOKEN, //hard coded for example
    start_date: "2024-01-01",
    end_date: "2024-11-18",
    options: {
      count: 3,
      offset: 0,
    },
  };

  try {
    // Make the POST request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // Send the JSON payload
    });

    // Check for response status
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    // Parse and log the response data
    const data = await response.json();
    //console.log("Transactions Response:", data);
    const transactions = data.transactions;

    //clear all previous transactions that were pulled
    try {
      await pool.query("DELETE FROM transactions");
      //console.log("Transactions table cleared.");
    } catch (clearError) {
      console.error("Failed to clear transactions table:", clearError);
      return; // Stop further execution if clearing the table fails
    }

    // Insert transactions into the database
    for (const transaction of transactions) {
      const {
        amount,
        date,
        merchant_name,
      } = transaction;

      try {
        const query = `
          INSERT INTO transactions (category_id, account_id, amount, transaction_date, merchant_name)
          VALUES (4, 1, $1, $2, $3)
          ON CONFLICT (transaction_id) DO NOTHING
        `;
        await pool.query(query, [
          amount,
          date,
          merchant_name,
        ]);

        //console.log(`Inserted transaction: ${transaction_id}`);
      } catch (dbError) {
        console.error(
          //`Failed to insert transaction ${transaction_id}:`,
          dbError
        );
      }
    }
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
  }
}

// Example usage
fetchTransactions("d7f1b8b9-0006-4135-91c0-b5532045a314", 0, 10, "2024-01-01", "2024-11-18");

app.get("/accounts", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the accounts page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/accounts.html");
});

app.get("/settings", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the settings page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/settings.html");
});

app.get('/icons', (req, res) => {
  const iconFolderPath = path.join(__dirname, 'public/resources/categoryIcons/');
  fs.readdir(iconFolderPath, (err, files) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to read icon folder' });
      }
      const icons = files.filter(file => file.endsWith('.svg'));
      res.json(icons);
  });
});

app.get('/categories', async (req, res) => {
  const { userID, budgetID } = req.query;
  
  if (!userID || !budgetID) {
    return res.status(400).send({ error: 'userID and budgetID are required.' });
  }
  
  try {
    const result = await pool.query(
      `SELECT *
        FROM categories c
        WHERE c.user_id = $1 AND c.budget_id = $2;`,
      [userID, budgetID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while fetching categories.' });
  }
});

app.post('/categories', async (req, res) => {
  const { categoryName, iconName, userID, budgetID, goalAmount, assignedAmount } = req.body;

  if (!categoryName || !userID || !budgetID || !goalAmount) {
    return res.status(400).send({ error: 'categoryName, userID, budgetID, and goalAmount are required.' });
  }

  try {
    const categoryResult = await pool.query(
      `INSERT INTO categories (category_name, icon_name, user_id, budget_id, goal_amount, assigned_amount) 
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0)) 
       RETURNING category_id;`,
      [categoryName, iconName, userID, budgetID, goalAmount, assignedAmount]
    );

    const categoryID = categoryResult.rows[0].categoryID;

    res.status(201).send({ categoryID });
    } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while creating the category.' });
  }
});

app.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM categories WHERE categoryID = $1 and userID = $2;`, [id]);
  res.sendStatus(204);
});

app.post('/budgets', async (req, res) => {
  const { userID, amount, startDate, endDate } = req.body;

  if (!userID || !startDate || !endDate || !amount) {
    return res.status(400).send({ error: 'userID, startDate, and endDate are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, amount, start_date, end_date) 
       VALUES ($1, $2, $3, $4) 
       RETURNING budget_id;`,
      [userID, amount, startDate, endDate]
    );

    const budgetID = result.rows[0].budgetID;

    res.status(201).send({ budgetID });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while creating the budget.' });
  }
});

app.post('/budgets/update', async (req, res) => {
  const { budgetID, amount } = req.body;

  if (!budgetID || amount === undefined) {
    return res.status(400).send({ error: 'budgetID and amount are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE budgets 
       SET amount = $2 
       WHERE budget_id = $1 
       RETURNING budget_id;`,
      [budgetID, amount]
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ error: 'Budget not found.' });
    }

    res.status(200).send({ budgetID: result.rows[0].budget_id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while updating the budget.' });
  }
});

app.get('/budgets', async (req, res) => {
  const { userID } = req.query;

  if (!userID) {
    return res.status(400).send({ error: 'userID is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT * 
       FROM budgets 
       WHERE user_id = $1;`,
      [userID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while fetching budgets.' });
  }
});

app.post('/api/update-email', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email already exists in the database
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Update the user's email
    const updateResult = await pool.query('UPDATE users SET email = $1 WHERE user_id = 1', [email]);
    if (updateResult.rowCount > 0) {
      return res.status(200).json({ message: 'Email updated successfully' });
    } else {
      return res.status(400).json({ message: 'No changes made' });
    }
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update password endpoint
app.post('/api/update-password', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }

    try {
        // Hash the password using argon2
        const hashedPassword = await argon2.hash(password);

        // Update the password in the database
        const result = await pool.query('UPDATE users SET userpassword = $1 WHERE user_id = 1', [hashedPassword]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Password updated successfully.' });
        } else {
            return res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
});

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});