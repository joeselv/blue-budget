# blue-budget
CS-375 Budgeting webapp

To run the website locally you will need to have node js, and postgres downloaded.

Then, inside the root folder add a directory called config (case sensitive), and create a file inside called env.json and paste in the following json object replacing the user and password with your own local postgres information:
```
{
	"user": "postgres",
	"host": "localhost",
	"database": "bluebudget",
	"password": "password",
	"port": 5432,
	"PLAID_CLIENT_ID": "your_client_id_here",
  	"PLAID_SECRET": "your_secret_here",
  	"PLAID_ENV": "sandbox",
  	"PLAID_PRODUCTS": "transactions, auth, identity, assets",
	"PLAID_COUNTRY_CODES": "US",
  	"PLAID_ACCESS_TOKEN": "your_access_token_here"
}
```

# Running the Application

There are two ways to run the application. Choose one of the following methods based on your preferences.

## Method 1: Using Environment Variables (Recommended for Mac/Linux, but will work for Windows with extra steps)

If you are using **Windows**, you will need to ensure that **PSQL** is set up as a path variable. After that, create a `.env` file in your root directory with the following content:

```
PGUSER=postgres
PGPORT=5432
PGPASSWORD=password
PGDATABASE=bluebudget
PGHOST=localhost
NODE_ENV=dev
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
```

After which you can utilize the following commands in your local terminal:
 - npm install
 - npm run setup:local - runs database setup
 - npm run start:local - runs the application

## Method 2: Manual Setup (Recommended for Windows as it avoids setting up PSQL in path; also works for Mac/Linux)

If you prefer not to use the `.env` file, you can manually set up the database. Open **PSQL** and run the following command to create the database: `\i path/to/setup.sql/file` (runs database setup)

Once the database is created, run the server manually using: `node server.js` (runs the application) which is located in the /app folder


After running those commands, you should be able to run and access the website locally using the url http://localhost:3000.



