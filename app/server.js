const express = require("express");
const { Pool } = require("pg");
const argon2 = require("argon2");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const env = require("../config/env.json");

const hostname = "localhost";
const port = 3000;
const pool = new Pool(env);
const app = express();
const fs = require('fs');
const path = require('path');
app.use(express.static('public'));
app.use('/resources', express.static('resources'));
app.use(express.json());
app.use(cookieParser());

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
  secure: process.env.NODE_ENV === "production", // Only over HTTPS in production
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


// Authorization Middleware
const authorize = (req, res, next) => {
  const { token } = req.cookies;
  if (!token || !tokenStorage[token]) {
    return res.sendStatus(403); // Unauthorized
  }
  next();
};

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


// Start the server
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
