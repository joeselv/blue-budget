# blue-budget
CS-375 Budgeting webapp

To run the website locally you will need to have node js, and postgres downloaded.

From there please create a file called env.json and paste the following json object inside:
```
{
  "name": "blue-budget",
  "version": "1.0.0",
  "description": "budgeting app",
  "main": "index.js",
  "scripts": {
    "start": "cd app; node server.js",
    "setup": "fly postgres connect --app bluebudgetdb < setupDeploy.sql",
    "start:local": "env-cmd node app/server.js",
    "setup:local": "env-cmd psql -d postgres -c 'create database bluebudget' -f setupDeploy.sql"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/joeselv/blue-budget.git"
  },
  "author": "",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/joeselv/blue-budget/issues"
  },
  "homepage": "https://github.com/joeselv/blue-budget#readme",
  "dependencies": {
    "argon2": "^0.30.3",
    "cookie-parser": "^1.4.6",
    "env-cmd": "^10.1.0",
    "express": "^4.21.1",
    "express-session": "^1.18.1",
    "pg": "^8.11.1",
    "plaid": "^29.0.0"
  },
  "devDependencies": {
    "@flydotio/dockerfile": "^0.5.9"
  }
}
```
Then, inside the root folder add a directory called config (case sensitive), and create a file inside called env.json and paste in the following json object replacing the user and password with your own local postgres information:
```
{
  "user": "postgres",
	"host": "localhost",
	"database": "bluebudget",
	"password": "password",
	"port": 5432,
	"PLAID_CLIENT_ID": "67322880fda72b001a353c92",
  "PLAID_SECRET": "63c58bcc224ebf1699808bdf81d8d4",
  "PLAID_ENV": "sandbox",
  "PLAID_PRODUCTS": "transactions, auth, identity, assets",
  "PLAID_COUNTRY_CODES": "US",
  "PLAID_ACCESS_TOKEN": "access-sandbox-fb615a41-b6ff-498e-8737-ae9ee5c2be7d"
}
```

Then, you will need to create one more file called .env in your root directory:
```
PGUSER=postgres
PGPORT=5432
PGPASSWORD=password
PGDATABASE=bluebudget
PGHOST=localhost
NODE_ENV=dev
PLAID_ENV=sandbox
PLAID_CLIENT_ID=672ab021bf4c51001a4d4a0b
PLAID_SECRET=7318f05178208b252b86816d042a86
```
After which run the following commands in your local terminal (If you are using a mac or linux):
 - npm install
 - npm run setup:local
 - npm run start:local

After running those three commands, you should be able to run the website locally using the url http://localhost:3000.



