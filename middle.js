const db = require('./database.js');

// NOTE:
// THE REDIRECT CALLS ARE ONLY COMPATIBLE WITH EXPRESS 4.x.x
// IF CHANGING TO EXPRESS 5.x.x, USE res.status(403).redirect('/error') INSTEAD

const authPage = async (req,res,next) => {
    if (req.session.loggedin) {
        var role;
        try {
            role = await db.getUserRole(req.session.username);
            if (role == "Admin" || role == "Moderator") {
                next();
            } else {
                // Forbidden - Client lacks permission
                // res.status(403).send("403 Forbidden");
                res.redirect(403, '/error?error=403');
            }
        } catch (error) {
            // Error - Database error
            // res.status(500).send("500 Internal Server Error");
            res.redirect(500, '/login');
        }

    } else {
        // Unauthorized - Client not logged in
        // res.status(401).send("401 Unauthorized");
        res.redirect(401, '/login');
    }
}

const authMemberPage = async (req,res,next) => {
    if (req.session.loggedin) {
        var role;
        try {
            role = await db.getUserRole(req.session.username);
            if (role == "Admin" || role == "Moderator" || role == "Member") {
                next();
            } else {
                // Forbidden - Client lacks permission
                // res.status(403).send("403 Forbidden");
                res.redirect(403, '/error?error=403');
            }
        } catch (error) {
            // Error - Database error
            // res.status(500).send("500 Internal Server Error");
            res.redirect(500, '/login');
        }

    } else {
        // Unauthorized - Client not logged in
        // res.status(401).send("401 Unauthorized");
        res.redirect(401, '/login');
    }
}

module.exports = {
    authPage,
    authMemberPage
};