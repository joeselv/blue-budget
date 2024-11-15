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
app.use(express.static('public'));
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
  return body.username && body.password;
}

// Signup Route
app.post("/create", async (req, res) => {
  const { username, password } = req.body;

  if (!validateLogin(req.body)) {
    return res.sendStatus(400); // Invalid input
  }

  // Hash the password
  let hash;
  try {
    hash = await argon2.hash(password);
  } catch (error) {
    console.log("Hashing failed", error);
    return res.sendStatus(500);
  }

  // Insert the new user
  try {
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      hash,
    ]);
  } catch (error) {
    console.log("Insertion failed", error);
    return res.sendStatus(500);
  }

  // Automatically log in after signup
  const token = makeToken();
  tokenStorage[token] = username;
  return res.cookie("token", token, cookieOptions).send();
});

// Login Route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!validateLogin(req.body)) {
    return res.sendStatus(400); // Invalid input
  }

  let result;
  try {
    result = await pool.query("SELECT password FROM users WHERE username = $1", [
      username,
    ]);
  } catch (error) {
    console.log("Select failed", error);
    return res.sendStatus(500);
  }

  if (result.rows.length === 0) {
    return res.sendStatus(400); // Username doesn't exist
  }

  const hash = result.rows[0].password;

  // Verify the password
  let verifyResult;
  try {
    verifyResult = await argon2.verify(hash, password);
  } catch (error) {
    console.log("Verification failed", error);
    return res.sendStatus(500);
  }

  if (!verifyResult) {
    return res.sendStatus(400); // Password did not match
  }

  // Generate and store token, then set it in a cookie
  const token = makeToken();
  tokenStorage[token] = username;
  return res.cookie("token", token, cookieOptions).send().json({ message: "Signup successful" });
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
  return res.clearCookie("token", cookieOptions).json({ message: "Logout successful" });
});

// Public Route
app.get("/public", (req, res) => {
  res.send("A public message\n");
});

// Private Route (requires authorization)
app.get("/private", authorize, (req, res) => {
  res.send("A private message\n");
});

// Serve the budget.html file when accessing /dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/budget.html');
});

// Start the server
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
