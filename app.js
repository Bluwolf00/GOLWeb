const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

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

app.get('*', (req,res) => {
    res.render('pages/error');
});

app.listen(process.env.PORT || 3000);
