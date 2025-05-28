const express = require('express');
var router = express.Router();
const embeds = require('../embeds.js');
const middle = require('../middle.js');
const authMemberPage = middle.authMemberPage;


// -- GET REQUESTS - SOPs --

router.get('/urban', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.URBAN_URL);
    res.redirect(url);
});

router.get('/mechanized', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MECHANIZED_URL);
    res.redirect(url);
});

router.get('/bounding', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.BOUNDING_URL);
    res.redirect(url);
});

router.get('/medical-process', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MEDICAL_PROCESS_URL);
    res.redirect(url);
});

router.get('/medical-treatment', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MEDICAL_TREATMENT_URL);
    res.redirect(url);
});

router.get('/medical-tiers', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MEDICAL_TIERS_URL);
    res.redirect(url);
});

router.get('/commanders-brief', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.COMMANDERS_BRIEF_URL);
    res.redirect(url);
});

router.get('/radios', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.RADIOS_URL);
    res.redirect(url);
});

router.get('/mortars', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MORTARS_URL);
    res.redirect(url);
});

router.get('/zeus-handbook', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.ZEUS_URL);
    res.redirect(url);
});

router.get('/infantry-concept', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.INFANTRY_URL);
    res.redirect(url);
});

router.get('/motorized', authMemberPage, async (req, res) => {
    var url = embeds.getSOPUrl(process.env.MOTORIZED_URL);
    res.redirect(url);
});

router.get('/raven', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.RAVEN_URL);
    res.redirect(url);
});

router.get('/hammer', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.HAMMER_URL);
    res.redirect(url);
});

router.get('/angel', async (req, res) => {
    var url = embeds.getSOPUrl(process.env.ANGEL_URL);
    res.redirect(url);
});

module.exports = router;