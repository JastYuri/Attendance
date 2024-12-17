const express = require("express");
const path = require("path");
const mysql = require("mysql2"); // Use mysql2 for MySQL connection
const dotenv = require("dotenv");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // For MySQL session storage
const util = require('util');

// Load environment variables from .env file
dotenv.config({ path: './.env' });

const server = express(); // Initialize express server

// Create a MySQL connection pool (instead of createConnection for better scalability)
const pool = mysql.createPool({
    host: process.env.DATABASE_host,
    user: process.env.DATABASE_user,
    password: process.env.DATABASE_password,
    database: process.env.DATABASE,
    port: process.env.DATABASE_port
});

// Promisify the pool.query method to enable async/await
const db = pool.promise();

// Export the db object so it can be used in other files
module.exports = db;

// Set up session store to save sessions in MySQL
const sessionStore = new MySQLStore({}, pool);

// Middleware to handle session management
server.use(session({
    secret: process.env.SESSION_SECRET || 'secure_default_secret', // Use .env for security
    resave: false, // Don't save session if it hasn't been modified
    saveUninitialized: false, // Don't save uninitialized sessions
    store: sessionStore, // Store sessions in MySQL
    cookie: { 
        secure: process.env.NODE_ENV === "production", // Enable secure cookies in production
        httpOnly: true, // Prevent access to cookies via JavaScript
        sameSite: 'strict', // Prevent CSRF
        maxAge: 1000 * 60 * 60 * 24 // 1-day session expiry
    }
}));

// Serve static files from the "public" directory
const publicDirectory = path.join(__dirname, 'public');
server.use(express.static(publicDirectory));

// Middleware to parse JSON and URL-encoded data
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Set Handlebars (hbs) as the template engine
server.set('view engine', 'hbs');

// Connect to the database and log the connection status
const connectDb = async () => {
    try {
        // Use db.query to check connectivity
        await db.execute('SELECT 1');
        console.log("Connected to MySQL database.");
    } catch (err) {
        console.error("Database connection error:", err);
    }
};
connectDb();

// Set up routing after the middleware
server.use('/node_modules', express.static('node_modules')); // Serve node_modules as static files
server.use('/', require('./route/pages')); // Use routes defined in pages.js
server.use('/uploads', require('./route/uploadroutes')); // Ensure the uploadroutes.js path is correct

// Start the server on a dynamic port (required for deployment platforms like Render)
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server started at port ${port}`);
});
