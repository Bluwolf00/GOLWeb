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
const { authMemberPage } = require('./middle.js');


// Additional Routes
app.use('/dashboard', dashboard);
app.use('/data', dbData);
app.use('/sop', require('./routes/sop.js'));
app.use('/auth', require('./routes/auth.js'));

function getUserData(req) {
    // Prepare user data
    let role = '';
    let username = '';
    let loggedIn = false;
    let type = '';
    try {
        if (req.session.passport) {
            loggedIn = true;
            role = req.session.passport.user.role;
            username = req.session.passport.user.username;
            type = 'discord'; // If passport is defined, then we know the user is authenticated via Discord
        } else {
            loggedIn = req.session.loggedin || false;
            role = req.session.role || 'public'; // Default to 'public' if role is not set
            username = req.session.username || '';
            type = '';
        }
    } catch (error) {
        console.error("Error getting user data:", error);
    } finally {
        if (typeof role != 'undefined') {
            role = role.toLowerCase();
        }
        return {
            loggedIn: loggedIn,
            role: role,
            username: username,
            type: type
        };
    }
}

// GET REQUESTS - PAGES

app.get('/', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/index', {
        userLogged: userData.loggedIn,
        username: userData.username,
        userRole: userData.role
    });
});

app.get('/home', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/index', {
        userLogged: userData.loggedIn,
        username: userData.username,
        userRole: userData.role
    });
});

app.get('/about', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/about', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/roster', (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/roster', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/SOP', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/sop', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/ranks', (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/ranks', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/oldranks', (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/ranks-old', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/badges', (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/badges', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

app.get('/discord', (req, res) => {
    res.redirect('https://discord.gg/fS6AppB8kg');
});

app.get('/profile', (req, res) => {
    var playerN = req.query.name;

    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/profile', {
        userLogged: userData.loggedIn,
        username: userData.username
    });
});

app.get('/mods', async (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/mods', {
        userLogged: userData.loggedIn,
        username: userData.username
    });
});

app.get('/orbat', async (req, res) => {
    const data = await db.getMembers();
    // Prepare user data
    var userData = getUserData(req);

    res.render('pages/roster_new', { data: data, userLogged: userData.loggedIn, username: userData.username });
});

app.get('/mission-orbat', async (req, res) => {
    res.sendStatus(200);
});

app.get('/mission-orbat/select', async (req, res) => {
    // Prepare user data
    let userData = getUserData(req);

    res.render('pages/mission-orbat-option', { userLogged: userData.loggedIn, username: userData.username, userRole: userData.role || 'member' });
});

app.get('/mission-orbat/live', async (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    if (req.query.selectedOption === 'slots') {
        // Check if the user is logged in, and is an admin or moderator

        if (userData.loggedIn && (userData.role === 'admin' || userData.role === 'moderator')) {
            res.render('pages/mission-orbat', { userLogged: userData.loggedIn, username: userData.username, selectedOption: req.query.selectedOption || 'roles' });
        } else {
            res.redirect('/error?error=403'); // Forbidden
        }

    } else {
        res.render('pages/mission-orbat', { userLogged: userData.loggedIn, username: userData.username, selectedOption: req.query.selectedOption || 'roles' });
    }
});

app.get('/error', (req, res) => {
    var errorCode = req.query.error;

    // Prepare user data
    let userData = getUserData(req);

    console.log(errorCode);
    res.render('pages/error', {
        error: errorCode,
        userLogged: userData.loggedIn,
        username: userData.username
    });
});

app.get('/register', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    if (typeof userData.loggedIn === 'undefined' || userData.loggedIn === false) {
        res.render('pages/register', {
            username: userData.username
        });
    } else {
        res.redirect('/home');
    }

});

app.get('/login', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    if (req.query.success) {
        res.render('pages/login', {
            success: true
        });
    } else {
        if (userData.loggedIn) {
            // If the user is already logged in, redirect to home
            console.log('User is already logged in, redirecting to home');
            res.redirect('/home');
        } else {
            res.render('pages/login', {
                username: userData.username
            });
        }
    }
});

app.get('/passwordchange', authMemberPage, async (req, res) => {

    // Prepare user data
    let userData = getUserData(req);

    if (userData.type === 'discord') {
        // User is authenticated via Discord
        res.redirect('/home');
    } else {
        if (userData.loggedIn) {
            res.render('pages/passwordchange', {
                username: userData.username,
                userLogged: userData.loggedIn
            });
        } else {
            res.redirect('/login');
        }
    }
});

app.get('/logout', (req, res) => {

    // Prepare user data
    let userData = getUserData(req);
    // Clear user session
    if (userData.loggedIn) {

        if (typeof passport !== 'undefined' && passport.deserializeUser) {
            passport.deserializeUser();
        }


        req.session.destroy((err) => {
            if (err) {
                console.error('ERROR:  Failed to destroy session:', err);
                return res.sendStatus(500);
            }
            res.redirect('/');
        });
    } else {
        console.log('User is not logged in, redirecting to home');
        res.redirect('/home');
    };
});

// Error Catcher

app.get('*', (req, res) => {

    let userData = getUserData(req);
    res.render('pages/error', {
        error: 404,
        userLogged: userData.loggedIn,
        username: userData.username
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