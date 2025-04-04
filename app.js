const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./database.js');

const app = express();

app.use(bodyParser.json());

app.use(session({
    secret: 'GOL'
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

// GET REQUESTS - PAGES

app.get('/', (req,res) => {
    res.render('pages/index', {
        loggedin: req.session.loggedin
    });
});

app.get('/home', (req,res) => {
    res.render('pages/index', {
        loggedin: req.session.loggedin
    });
});

app.get('/about', (req,res) => {
    res.render('pages/about', {
        loggedin: req.session.loggedin
    });
});

app.get('/roster', (req,res) => {
    res.render('pages/roster', {
        loggedin: req.session.loggedin
    });
});

app.get('/SOP', (req,res) => {
    res.render('pages/sop', {
        loggedin: req.session.loggedin
    });
});

app.get('/Badges', (req,res) => {
    res.render('pages/badges', {
        loggedin: req.session.loggedin
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

app.get('/login', (req,res) => {

    if (req.session.loggedin) {
        req.session.loggedin = false;
        req.session.destroy();
        res.redirect('/home');
    } else {
        res.render('pages/login', {
            loggedin: req.session.loggedin
        });
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
    const videos = await db.getVideos();
    res.send(videos);
});

app.get('/getRanks', async (req,res) => {
    var aboveOrBelow = req.query.aboveOrBelow;
    var currentRank = req.query.currentRank;
    var ranks = await db.getRanks(aboveOrBelow, currentRank);
    res.send(ranks);
});

app.get('/getMemberAttendance', async (req,res) => {
    var name = req.query.name;
    var attendance = await db.getMemberAttendance(name);
    res.send(attendance);
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
    var username = req.body.username;
    var password = req.body.password;
    var result = await db.performLogin(username, password, true);

    if (result) {
        req.session.loggedin = true;
        res.redirect('/home');
    } else {
        res.send(result);
    }
});

// Error Catcher

app.get('*', (req,res) => {
    res.render('pages/error');
});

app.listen(process.env.PORT || 3000);
