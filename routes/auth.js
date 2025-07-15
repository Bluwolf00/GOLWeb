const express = require('express');
var router = express.Router();
const {passport, Strategy} = require('../discord.js');

// Auth Route

router.get('/discord', passport.authenticate('discord'), (req, res) => {
    res.send(200);
});

router.get('/discord/redirect', passport.authenticate('discord'), (req, res) => {
    res.send(200);
});

module.exports = router;