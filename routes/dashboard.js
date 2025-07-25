const express = require('express');
var router = express.Router();
const db = require('../database.js');
const middle = require('../middle.js');
const authPage = middle.authPage;

function getUserData(req) {
    // Prepare user data
    let role = '';
    let username = '';
    let loggedIn = false;
    if (req.session.passport) {
        loggedIn = true;
        role = req.session.passport.user.role;
        username = req.session.passport.user.username;
    } else {
        loggedIn = req.session.loggedin || false;
        role = req.session.role || 'public'; // Default to 'public' if role is not set
        username = req.session.username || '';
    }

    return {
        loggedIn: loggedIn,
        role: role.toLowerCase(),
        username: username
    };
}

router.get('/', authPage, async (req,res) => {

    let userData = getUserData(req);

    res.render('pages/dashboard/dashboard', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

router.get('/users', authPage, async (req,res) => {
    let userData = getUserData(req);
    var editSuccess = req.query.editSuccess;
    var createSuccess = req.query.createSuccess;

    if (!editSuccess) {
        editSuccess = -1;
    }
    if (!createSuccess) {
        createSuccess = -1;
    }
    res.render('pages/dashboard/users', {
        username: userData.username,
        userLogged: userData.loggedIn,
        editSuccess: editSuccess,
        createSuccess: createSuccess
    });
});

// ['/badges','/sop','/videos','/ranks','/loas','/events','/trainings']

// ROUTES THAT ARE NOT YET IMPLEMENTED
router.get('/badges', authPage, async (req,res) => {
    let userData = getUserData(req);
    var editSuccess = req.query.editSuccess;
    var createSuccess = req.query.createSuccess;

    if (!editSuccess) {
        editSuccess = -1;
    }
    if (!createSuccess) {
        createSuccess = -1;
    }
    res.render('pages/dashboard/dashbadges', {
        username: userData.username,
        userLogged: userData.loggedIn,
        editSuccess: editSuccess,
        createSuccess: createSuccess
    });
});

router.get('/sop', authPage, async (req,res) => {
    let userData = getUserData(req);
    res.render('pages/dashboard/dashsop', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

router.get('/videos', authPage, async (req,res) => {
    res.redirect('error?error=404');
});

router.get('/ranks', authPage, async (req,res) => {
    let userData = getUserData(req);
    res.render('pages/dashboard/dashranks', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
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

router.get('/missions', authPage, async (req,res) => {
    let userData = getUserData(req);
    res.render('pages/dashboard/dashmissions', {
        username: userData.username,
        userLogged: userData.loggedIn
    });
});

module.exports = router;