const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const argon2 = require("argon2");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require('path'); 
const env = require("../config/env.json");
const plaidRoutes = require("./routes/plaidRoutes");

const port = 3000;
let host;
let config;
// fly.io sets NODE_ENV to production automatically, otherwise it's unset when running locally
if (process.env.NODE_ENV == "production") {
	host = "0.0.0.0";
	config = { connectionString: process.env.DATABASE_URL };
} else {
	host = "localhost";
	let { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
	config = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT };
}


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/resources', express.static(path.join(__dirname, 'resources')));
app.use(cookieParser());
app.use('/api/plaid', plaidRoutes);
const pool = new Pool(config);

app.use(session({
  secret: 'your_secret_key', // change this
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true for HTTPS
}));

// In-memory storage for tokens (use a database for production)
const tokenStorage = {};

// Database connection
pool.connect().then(() => {
  console.log("Connected to database");
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
    console.log(validateLogin(req.body));
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
    return res.sendStatus(400); // Invalid input
  }

  let result;
  try {
    result = await pool.query("SELECT userpassword FROM users WHERE email = $1", [email]);
  } catch (error) {
    console.log("Select failed", error);
    return res.sendStatus(500);
  }

  if (result.rows.length === 0) {
    return res.sendStatus(400); // email doesn't exist
  }

  const hash = result.rows[0].userpassword;

  // Verify the userpassword
  let verifyResult;
  try {
    verifyResult = await argon2.verify(hash, userpassword);
  } catch (error) {
    console.log("Verification failed", error);
    return res.sendStatus(500);
  }

  if (!verifyResult) {
    return res.sendStatus(400); // userpassword did not match
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
  return res.clearCookie("token", cookieOptions).json({ message: "Logout successful" });;
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

app.get("/transactions", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the budget page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/transactions.html");
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
    console.log("Transactions Response:", data);
    const transactions = data.transactions;

    // Insert transactions into the database
    for (const transaction of transactions) {
      const {
        transaction_id,
        account_id,
        amount,
        date,
        name,
        category,
        merchant_name,
      } = {
        ...transaction,
        category: transaction.category ? transaction.category.join(", ") : null,
      };

      try {
        const query = `
          INSERT INTO transactions (transaction_id, account_id, amount, date, name, category, merchant_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (transaction_id) DO NOTHING
        `;

        await pool.query(query, [
          transaction_id,
          account_id,
          amount,
          date,
          name,
          category,
          merchant_name,
        ]);

        console.log(`Inserted transaction: ${transaction_id}`);
      } catch (dbError) {
        console.error(
          `Failed to insert transaction ${transaction_id}:`,
          dbError
        );
      }
    }
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
  }
}


// Example usage
// fetchTransactions("d7f1b8b9-0006-4135-91c0-b5532045a314", 0, 10, "2024-01-01", "2024-11-18");


app.get("/accounts", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the budget page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/accounts.html");
});

app.get("/settings", (req, res) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    // Redirect to index.html if not logged in
    return res.redirect("/");
  }
  // Serve the budget page if the user is authorized
  res.sendFile(__dirname + "/public/dashboard/settings.html");
});


// Start the server
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});