const express = require('express');
var router = express.Router();

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

router.get('/privacy', function(req, res) {
    const userData = getUserData(req);
    res.render('pages/policies/privacy', { userLogged: userData.loggedIn, username: userData.username });
});

router.get('/terms', function(req, res) {
    const userData = getUserData(req);
    res.render('pages/policies/terms', { userLogged: userData.loggedIn, username: userData.username });
});

module.exports = router;