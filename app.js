const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();


var cors = require('cors');
app.use(cors());

const globalErrorHandler = require('./controllers/errorController');

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/images", express.static(path.join("images")));

const mongoose = require('./mongoose');

const userRoutes = require("./routes/user");
const masterRoutes = require("./routes/admin/masterModule");
const librarianRoutes = require("./routes/admin/librarianModule");
const employeeRoutes = require("./routes/employee/employeeModule");
const adminRoutes = require("./routes/admin/adminModule");
const cron = require("./cronJob");
// Mobile API
const mobuserRoutes = require("./routes/mobileuser");

// Add headers before the routes are defined
app.use(function(req, res, next) {

    // Website you wish to allow to connect
    //res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    //res.setHeader('Access-Control-Allow-Origin', 'http://192.168.1.109:4200');

    const allowedOrigins = ['http://localhost:4200', 'http://192.168.1.109:4200', 'https://lms.ntspl.co.in', 'http://192.168.1.240:4200'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/master", masterRoutes);
app.use("/api/v1/librarian", librarianRoutes);
app.use("/api/v1/employee", employeeRoutes);
app.use("/api/v1/admin", adminRoutes);
// Mobile User
app.use("/api/v1/mobile/user", mobuserRoutes);

app.use(globalErrorHandler);

module.exports = app;