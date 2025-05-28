const express = require('express');
var router = express.Router();

const middle = require('../middle.js');
const authMemberPage = middle.authMemberPage;


// -- GET REQUESTS - SOPs --

router.get('/urban', authMemberPage, async (req, res) => {
    res.redirect(process.env.URBAN_URL);
});

router.get('/mechanized', authMemberPage, async (req, res) => {
    res.redirect(process.env.MECHANIZED_URL);
});

router.get('/bounding', authMemberPage, async (req, res) => {
    res.redirect(process.env.BOUNDING_URL);
});

module.exports = router;