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

app.get('/index', (req,res) => {
    res.render('pages/index');
});

app.get('/about', (req,res) => {
    res.render('pages/index');
});

app.get('/roster', (req,res) => {
    res.render('pages/roster');
});

app.listen(8080);