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

app.get('/', (req,res) => {
    res.render('pages/index');
});

app.get('/home', (req,res) => {
    res.render('pages/index');
});

app.get('/about', (req,res) => {
    res.render('pages/about');
});

app.get('/roster', (req,res) => {
    res.render('pages/roster');
});

app.get('/SOP', (req,res) => {
    res.render('pages/sop');
});

app.get('/discord', (req,res) => {
    res.redirect('https://discord.gg/fS6AppB8kg');
});

app.get('/profile', (req,res) => {
    var playerN = req.query.name;
    // console.log(req.query.name);
    res.render('pages/profile');
});

app.get('/memberinfo', async (req,res) => {
    var member = await db.getMember(req.query.name);
    // console.log(req.query.name);
    res.send(member);
});

app.get('/getmembers', async (req,res) => {
    const members = await db.getMembers();
    res.send(members);
});

app.get('/orbat', async (req,res) => {
    const data = await db.getMembers();
    res.render('pages/roster_new', {data: data});
});

app.get('*', (req,res) => {
    res.render('pages/error');
});

app.listen(process.env.PORT || 3000);
