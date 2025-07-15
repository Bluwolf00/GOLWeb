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
    store: sessionStore,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
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
app.use('/auth', require('./routes/auth.js'));

// GET REQUESTS - PAGES

app.get('/', (req, res) => {
    // req.session.loggedin = false;

    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username,
        userRole: req.session.role || 'public' // Default to 'public' if role is not set
    });
});

app.get('/home', (req, res) => {
    // console.log(req.session);

    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username,
        userRole: req.session.role || 'public' // Default to 'public' if role is not set
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

app.get('/oldranks', (req, res) => {
    res.render('pages/ranks-old', {
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

app.get('/mission-orbat', async (req, res) => {
    res.sendStatus(200);
});

app.get('/mission-orbat/select', async (req, res) => {
    res.render('pages/mission-orbat-option', { loggedin: req.session.loggedin, username: req.session.username, userRole: req.session.role || 'Member' });
});

app.get('/mission-orbat/live', async (req, res) => {
    if (req.query.selectedOption === 'slots') {
        // Check if the user is logged in, and is an admin or moderator
        if (req.session.loggedin && (req.session.role === 'admin' || req.session.role === 'moderator')) {
            res.render('pages/mission-orbat', { loggedin: req.session.loggedin, username: req.session.username, selectedOption: req.query.selectedOption || 'roles' });
        } else {
            res.redirect('/error?error=403'); // Forbidden
        }

    } else {
        res.render('pages/mission-orbat', { loggedin: req.session.loggedin, username: req.session.username, selectedOption: req.query.selectedOption || 'roles' });
    }
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

    if (typeof req.session.loggedin === 'undefined' || req.session.loggedin === false) {
        res.render('pages/register', {
            username: req.session.username
        });
    } else {
        res.redirect('/home');
    }

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
            req.session.role = null; // Clear the role as well
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

const server = app.listen(process.env.PORT || 3000);
console.log(`\nServer is running on port ${process.env.PORT || 3000}\n`);

// Graceful Shutdown - Handles server closure and resource cleanup
// This function is called when the server receives a termination signal (SIGINT or SIGTERM)
async function handleClosure(event) {
    console.log(`\nINFO:  ${event} received. Closing server...`);
    try {
        server.close(() => console.log('SUCCESS:  Server closed gracefully.'));
        await sessionStore.close(); // Close the session store
        await db.closePool(); // Close the database connection pool

        console.log('SUCCESS:  Session store and database connection pool closed.');
    } catch (error) {
        console.error('ERROR:  Error closing resources:', error);
    }
    console.log('SUCCESS:  All resources closed gracefully.');
    process.exit(0); // Exit the process
}

// Process Handling - Handles graceful shutdown of the server
process.on('SIGINT', async () => {
    await handleClosure("SIGINT");
});

process.on('SIGTERM', async () => {
    await handleClosure("SIGTERM");
});