const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const db = require('./database.js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

app.use(bodyParser.json());

const sessionStore = new MySQLStore({clearExpired: true}, db.getPool());

sessionStore.onReady().then(() => {
    console.log('MYSQL Session Store is ready');
}).catch((error) => {
    console.error('Error estbalishing the MySQL Session Store: ', error);
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
app.use(function(req,res,next) {
    res.locals.loggedin = req.session.loggedin;
    next();
});

// AUTHENTICATION MIDDLEWARE

const authPage = async (req,res,next) => {
    if (req.session.loggedin) {
        var role;
        try {
            role = await db.getUserRole(req.session.username);
            if (role == "Admin" || role == "Moderator") {
                next();
            } else {
                res.redirect('/error?error=403');
            }
        } catch (error) {
            res.redirect('/login');
        }

    } else {
        res.redirect('/login');
    }
}

// GET REQUESTS - PAGES

app.get('/', (req,res) => {
    console.log(req.session);
    // req.session.loggedin = false;
    
    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/home', (req,res) => {
    console.log(req.session);
    res.render('pages/index', {
        userLogged: req.session.loggedin,
        username: req.session.username
    });
});

app.get('/about', (req,res) => {
    res.render('pages/about', {
        username: req.session.username
    });
});

app.get('/roster', (req,res) => {
    res.render('pages/roster', {
        username: req.session.username
    });
});

app.get('/SOP', (req,res) => {
    res.render('pages/sop', {
        username: req.session.username
    });
});

app.get('/Badges', (req,res) => {
    res.render('pages/badges', {
        username: req.session.username
    });
});

app.get('/discord', (req,res) => {
    res.redirect('https://discord.gg/fS6AppB8kg');
});

app.get('/profile', (req,res) => {
    var playerN = req.query.name;
    // console.log(req.query.name);
    res.render('pages/profile', {
        loggedin: req.session.loggedin
    });
});

app.get('/mods', async (req,res) => {
    res.render('pages/mods', {
        loggedin: req.session.loggedin
    });
});

app.get('/orbat', async (req,res) => {
    const data = await db.getMembers();
    res.render('pages/roster_new', {data: data, loggedin: req.session.loggedin});
});

app.get('/error', (req,res) => {
    var errorCode = req.query.error;
    console.log(errorCode);
    res.render('pages/error', {
        error: errorCode,
        username: req.session.username
    });
});

app.get('/register', (req,res) => {
    res.render('pages/register', {
        username: req.session.username
    });
});

app.get('/dashboard', authPage, async (req,res) => {
    res.render('pages/dashboard', {
        username: req.session.username
    });
});

app.get('/login', (req,res) => {

    if (req.query.success) {
        res.render('pages/login', {
            success: true
        });
    } else {
        if (req.session.loggedin) {
            req.session.loggedin = false;
            // req.session.destroy();
            req.session.save(function() {
                res.redirect('/');
            })
        } else {
            res.render('pages/login', {
                username: req.session.username
            });
        }
    }

});

// GET REQUESTS - DATA

app.get('/memberinfo', async (req,res) => {
    var member = await db.getMember(req.query.name);
    // console.log(req.query.name);
    res.send(member);
});

app.get('/memberbadges', async (req,res) => {
    var badges = await db.getMemberBadges(req.query.name);
    res.send(badges);
});

app.get('/getmembers', async (req,res) => {
    const members = await db.getMembers();
    res.send(members);
});

app.get('/getBadges', async (req,res) => {
    const badges = await db.getBadges();
    res.send(badges);
});

app.get('/getVideos', async (req,res) => {
    
    try {
        const videos = await db.getVideos();
        res.send(videos);
    } catch (error) {
        res.send(error);
    }
});

app.get('/getRanks', async (req,res) => {
    var aboveOrBelow = req.query.aboveOrBelow;
    var currentRank = req.query.currentRank;
    var ranks = await db.getRanks(aboveOrBelow, currentRank);
    res.send(ranks);
});


app.get('/getMemberAttendance', async (req,res) => {
    var name = req.query.name;
    var attendance = {"numberOfEventsAttended": -1, "insertStatus": false};
    try {
        temp = await db.getMemberAttendance(name);
        attendance.numberOfEventsAttended = temp.numberOfEventsAttended;
        attendance.insertStatus = temp.insertStatus;
        if (attendance.insertStatus) {
            res.status(201);
        } else {
            res.status(200);
        }
        res.send(attendance);
    } catch (error) {
        res.status(500);
        res.send(error.message);
    }

});

// POST REQUESTS

app.post('/changeRank', async (req,res) => {
    // var member = req.body.member;
    // var newRank = req.body.newRank;
    var member = req.get('member');
    var newRank = req.get('newRank');
    var auth = req.get('Authorization');
    if (auth != process.env.AUTH_TOKEN || auth != process.env.AUTH_TOKEN_2) {
        res.status(403).send("Forbidden - Invalid Token");
        return;
    }

    if (!member || !newRank) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    var result = await db.changeRank(member, newRank);
    if (result[0].affectedRows > 0) {
        res.status(200);
    } else {
        res.status(500);
        result[1] = "Failed to change rank - Check if the rank exists or if the member name is correct.";
    }
    res.send(result);
});

app.post('/performLogin', async (req,res) => {
    const { username, password } = req.body;
    var result = await db.performLogin(username, password, false);

    if (result) {
        req.session.loggedin = true;
        req.session.username = username;
        // await sessionStore.set(req.sessionID, {loggedin: true});
        req.session.save(function() {
            return res.redirect('/home');
        });
    } else {
        res.send(result);
    }
});

app.post('/performRegister', async (req,res) => {
    const { username, password, email } = req.body;

    // Check if the username already exists
    let result = await db.performLogin(username, password, false);
    console.log(result);

    if (result) {
        res.redirect('/register?error=existinguser');
    } else {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        result = await db.performRegister(username, hashedPassword);
        if (result) {
            res.redirect('/login?success=true');
        } else {
            res.send(result);
        }
    }
});

// Error Catcher

app.get('*', (req,res) => {
    res.render('pages/error', {
        error: 404,
        username: req.session.username
    });
});

app.listen(process.env.PORT || 3000);
