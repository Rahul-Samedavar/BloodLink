const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const https = require('https');
const fs = require('fs');
const jwt = require('jsonwebtoken');

import('./database.mjs')
  .then((db) => {
    database = db;
  })
  .catch((error) => {
    console.error('Error loading database module:', error);
  });

require('dotenv').config();

const basicroutes = require('./routes/basic');
const auth = require('./routes/auth');
const simple = require('./routes/simple');

const app = express();
const port = process.env.PORT || 443;

// Cookie parser middleware
app.use(cookieParser());


// Session middleware
const oneDay = 1000 * 60 * 60 * 24;
app.use(express.json());

app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));
// Set the template engine for pug
app.set('view engine', 'pug');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

app.use("/", auth)
app.use("/", simple)
app.use("/", authenticate)
app.use('/', basicroutes);


// Serving static files
app.use(express.static('public', {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('firebase-messaging-sw.js')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};


const server = https.createServer(options, app);

// Start the server
app.listen(port, () => {
    console.log(`App is running on port ${port}`);
});

function authenticate(req, res, next){
    const token = req.cookies.access_token;
    if(token === null){
        let user = {
            name: "",
            donorID: "",

        }
        req.user = user
    }
    else{
        jwt.verify(token, process.env.JWT_TOKEN, (err, user)=>{
            if (err) return res.redirect('/logout')
            req.user = user
            next()
        })
    }
}