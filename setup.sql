CREATE DATABASE BUDGET;
/c BUDGET

CREATE TABLE users (
    userID INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(20) UNIQUE,
    userPassword VARCHAR(20),
    email VARCHAR(50)
);

CREATE TABLE accounts (
    accountID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT,
    accountName VARCHAR(20),
    accountPassword VARCHAR(20), 
    accountType ENUM('Checking', 'Savings', 'Credit', 'Investment'),
    balance DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (userID) REFERENCES users(userID)
);

CREATE TABLE categories (
    categoryID INT PRIMARY KEY AUTO_INCREMENT,
    categoryName VARCHAR(20),
    categoryType ENUM('Income', 'Expense')
);

CREATE TABLE transactions (
    transactionID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT,
    accountID INT,
    categoryID INT,
    transactionDate DATE,
    amount DECIMAL(15, 2),
    transactionType ENUM('Income', 'Expense'),
    transactionDescription VARCHAR(100),
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (accountID) REFERENCES accounts(accountID),
    FOREIGN KEY (categoryID) REFERENCES categories(categoryID)
);

CREATE TABLE budgets (
    budgetID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT,
    categoryID INT,
    amount DECIMAL(15, 2),
    startDate DATE,
    endDate DATE,
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (categoryID) REFERENCES categories(categoryID)
);

