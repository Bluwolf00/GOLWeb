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
    res.render('pages/index');
});

app.get('/roster', (req,res) => {
    res.render('pages/roster');
});

app.get('*', (req,res) => {
    res.render('pages/error');
});

app.listen(3000);