const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const db = require('./database.js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(bodyParser.json());

const sessionStore = new MySQLStore({ clearExpired: true }, db.getPool());

sessionStore.onReady().then(() => {
    console.log('MYSQL Session Store is ready');
}).catch((error) => {
    console.error('Error establishing the MySQL Session Store: ', error);
});

app.use(session({
    secret: process.env.SESSION_SECRET, // To viewers on GitHub, I have changed the previous secret for security reasons.
    resave: false,
    saveUninitialized: false,
    store: sessionStore
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(function (req, res, next) {
    res.locals.loggedin = req.session.loggedin;
    next();
});

app.use(cors({
    origin: `http://localhost:${process.env.PORT || 3000}`,
    methods: ['GET', 'POST']
}));

// Dashboard

const dashboard = require('./routes/dashboard.js');
const dbData = require('./routes/data.js');

app.use('/dashboard', dashboard);
app.use('/data', dbData);
app.use('/sop', require('./routes/sop.js'));

// GET REQUESTS - PAGES

app.get('/', (req, res) => {
    console.log(req.session);
    // req.session.loggedin = false;

    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/home', (req, res) => {
    console.log(req.session);
    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/about', (req, res) => {
    res.render('pages/about', {
        username: req.session.username
    });
});

app.get('/roster', (req, res) => {
    res.render('pages/roster', {
        username: req.session.username
    });
});

app.get('/SOP', (req, res) => {
    res.render('pages/sop', {
        username: req.session.username
    });
});

app.get('/ranks', (req, res) => {
    res.render('pages/ranks', {
        username: req.session.username
    });
});

app.get('/badges', (req, res) => {
    res.render('pages/badges', {
        username: req.session.username
    });
});

app.get('/discord', (req, res) => {
    res.redirect('https://discord.gg/fS6AppB8kg');
});

app.get('/profile', (req, res) => {
    var playerN = req.query.name;
    // console.log(req.query.name);
    res.render('pages/profile', {
        loggedin: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/mods', async (req, res) => {
    res.render('pages/mods', {
        loggedin: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/orbat', async (req, res) => {
    const data = await db.getMembers();
    res.render('pages/roster_new', { data: data, loggedin: req.session.loggedin, username: req.session.username });
});

app.get('/error', (req, res) => {
    var errorCode = req.query.error;
    console.log(errorCode);
    res.render('pages/error', {
        error: errorCode,
        username: req.session.username
    });
});

app.get('/register', (req, res) => {
    res.render('pages/register', {
        username: req.session.username
    });
});

app.get('/login', (req, res) => {

    if (req.query.success) {
        res.render('pages/login', {
            success: true
        });
    } else {
        if (req.session.loggedin) {
            req.session.loggedin = false;
            req.session.username = null;
            // req.session.destroy();
            req.session.save(function () {
                res.redirect('/');
            })
        } else {
            res.render('pages/login', {
                username: req.session.username
            });
        }
    }
});

// Error Catcher

app.get('*', (req, res) => {
    res.render('pages/error', {
        error: 404,
        username: req.session.username
    });
});

app.listen(process.env.PORT || 3000);