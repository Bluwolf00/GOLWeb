const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
// const mongo = require('mongodb');
// var url = "mongodb://localhost:27017/";
// var client = new mongo.MongoClient(url);
// var dbname = 'members';

// MongoClient.connect(url, function(err,db) {
//     if (err) throw err;
//     console.log("Database Connected!");
//     db.close()
// });

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

var db;

async function connectDB() {
    client.connect();

    db = client.db('members');
}

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

app.get('/profile:name', (req,res) => {
    var playerN = req.params.name;
    res.render('pages/profile', {memberName: playerN});
});

app.get('/orbat', (req,res) => {
    res.render('pages/roster_new');
});

app.get('*', (req,res) => {
    res.render('pages/error');
});

app.listen(process.env.PORT || 3000);
