\c bluebudget
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS budgets;
DROP TYPE IF EXISTS account_type;
DROP TYPE IF EXISTS category_type;
DROP TYPE IF EXISTS transaction_type;


CREATE TYPE account_type AS ENUM ('Checking', 'Savings', 'Credit', 'Investment');
CREATE TYPE category_type AS ENUM ('Income', 'Expense');
CREATE TYPE transaction_type AS ENUM ('Income', 'Expense');

CREATE TABLE users (
    userID SERIAL PRIMARY KEY,
    email VARCHAR(50),
    userPassword VARCHAR(100)
);

CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
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

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(255),
    account_id INT NOT NULL,
    categoryID INT,
    transactionDate DATE,
    merchant_name VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    FOREIGN KEY (categoryID) REFERENCES categories(categoryID)
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