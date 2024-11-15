CREATE DATABASE BUDGET;
\c budget;

CREATE TYPE account_type AS ENUM ('Checking', 'Savings', 'Credit', 'Investment');
CREATE TYPE category_type AS ENUM ('Income', 'Expense');
CREATE TYPE transaction_type AS ENUM ('Income', 'Expense');

CREATE TABLE users (
    userID SERIAL PRIMARY KEY,
    email VARCHAR(50),
    userPassword VARCHAR(100)
);

CREATE TABLE accounts (
    accountID SERIAL PRIMARY KEY,
    userID INT,
    accountName VARCHAR(20),
    accountType account_type,
    balance DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (userID) REFERENCES users(userID)
);

CREATE TABLE categories (
    categoryID SERIAL PRIMARY KEY,
    categoryName VARCHAR(20),
    categoryType category_type
);

/* CREATE TABLE transactions (
    transactionID SERIAL PRIMARY KEY,
    userID INT,
    accountID INT,
    categoryID INT,
    transactionDate DATE,
    amount DECIMAL(15, 2),
    transactionType transaction_type,
    transactionDescription VARCHAR(100),
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (accountID) REFERENCES accounts(accountID),
    FOREIGN KEY (categoryID) REFERENCES categories(categoryID)
); */

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(255),
    category VARCHAR(255),
    merchant_name VARCHAR(255)
);

CREATE TABLE budgets (
    budgetID SERIAL PRIMARY KEY,
    userID INT,
    categoryID INT,
    amount DECIMAL(15, 2),
    startDate DATE,
    endDate DATE,
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (categoryID) REFERENCES categories(categoryID)
);
