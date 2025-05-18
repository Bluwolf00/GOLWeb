const express = require('express');
var router = express.Router();
const db = require('../database.js');
const middle = require('../middle.js');
const authPage = middle.authPage;

router.get('/', authPage, async (req,res) => {
    res.render('pages/dashboard', {
        username: req.session.username
    });
});

router.get('/users', authPage, async (req,res) => {
    var editSuccess = req.query.editSuccess;
    var createSuccess = req.query.createSuccess;

    if (!editSuccess) {
        editSuccess = -1;
    }
    if (!createSuccess) {
        createSuccess = -1;
    }
    res.render('pages/users', {
        username: req.session.username,
        editSuccess: editSuccess,
        createSuccess: createSuccess
    });
});

// ['/badges','/sop','/videos','/ranks','/loas','/events','/trainings']

// ROUTES THAT ARE NOT YET IMPLEMENTED
router.get('/badges', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/sop', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/videos', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/ranks', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/loas', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/events', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/trainings', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

module.exports = router;