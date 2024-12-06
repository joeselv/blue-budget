CREATE DATABASE BUDGET;
\c budget;

CREATE TYPE transactionType AS ENUM ('Income', 'Expense');

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(50),
    userPassword VARCHAR(100)
);

CREATE TABLE budgets (
    budget_id SERIAL PRIMARY KEY,
    user_id INT,
    amount DECIMAL(15, 2),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INT,
    account_name VARCHAR(255),
    account_type VARCHAR(255),
    balance DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(20) NOT NULL,
    icon_name VARCHAR(20),
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    budget_id INT REFERENCES budgets(budget_id) ON DELETE CASCADE,
    goal_amount DECIMAL(15, 2) NOT NULL,
    assigned_amount DECIMAL(15, 2) DEFAULT 0,
    activity_amount DECIMAL(15, 2) DEFAULT 0,
    UNIQUE (user_id, budget_id, category_name)
);

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(255),
    account_id INT NOT NULL,
    category_id INT,
    transaction_date DATE,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type transactionType,
    transaction_description VARCHAR(100),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);
