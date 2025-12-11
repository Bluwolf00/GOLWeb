const db = require('./database.js');

// NOTE:
// THE REDIRECT CALLS ARE ONLY COMPATIBLE WITH EXPRESS 4.x.x
// IF CHANGING TO EXPRESS 5.x.x, USE res.status(403).redirect('/error') INSTEAD

const authPage = async (req,res,next) => {
    if (req.session.loggedin || req.session.passport) {
        var role;
        try {
            // Check if user is logged in via Passport
            if (typeof req.session.passport !== 'undefined') {
                let role = req.session.passport.user.role.toLowerCase();
                // User is logged in via Passport
                if (role == "admin" || role == "moderator") {
                    next();
                } else {
                    // Forbidden - Client lacks permission
                    // res.status(403).send("403 Forbidden");
                    res.redirect('/error?error=403');
                }
            } else {
                // User is logged in via Username + Password
                role = await db.getUserRole(req.session.username);

                role = role.toLowerCase();
                if (role == "admin" || role == "moderator") {
                    next();
                } else {
                    // Forbidden - Client lacks permission
                    // res.status(403).send("403 Forbidden");
                    console.warn("Forbidden access attempt to admin page by user:", req.session.username);
                    res.redirect('/error?error=403');
                    
                }
            }

        } catch (error) {
            // Error - Database error
            // res.status(500).send("500 Internal Server Error");
            console.error("Error:", error);
            res.redirect('/login');
        }

    } else {
        // Unauthorized - Client not logged in
        // res.status(401).send("401 Unauthorized");
        console.warn("Unauthorized access attempt to admin page");
        res.redirect('/login');
    }
}

const authToken = (req, res, next) => {
    const token = req.get('Authorization');
    const tokenList = process.env.API_TOKEN_LIST ? process.env.API_TOKEN_LIST.split(',') : [];

    if (token && tokenList.includes(token)) {
        next();
    } else {
        res.status(401).send("401 Unauthorized");
    }
}

const authMemberPage = async (req,res,next) => {
    if (req.session.loggedin || req.session.passport) {
        var role;
        try {
            if (req.session.passport.user) {
                let role = req.session.passport.user.role.toLowerCase();
                // User is logged in via Passport
                if (role == "admin" || role == "moderator" || role == "member") {
                    next();
                } else {
                    // Forbidden - Client lacks permission
                    // res.status(403).send("403 Forbidden");
                    res.redirect('/error?error=403');
                }
            } else {
                // User is logged in via UName + Password
                role = await db.getUserRole(req.session.username);
                role = role.toLowerCase();
                if (role == "admin" || role == "moderator" || role == "member") {
                    next();
                } else {
                    // Forbidden - Client lacks permission
                    // res.status(403).send("403 Forbidden");
                    res.redirect('/error?error=403');
                }
            }

        } catch (error) {
            // Error - Database error
            // res.status(500).send("500 Internal Server Error");
            console.error("Database error:", error);
            res.redirect('/login');
        }

    } else {
        // Unauthorized - Client not logged in
        // res.status(401).send("401 Unauthorized");
        // res.redirect(200, '/login');
        res.redirect('/login');
    }
}

module.exports = {
    authPage,
    authMemberPage,
    authToken
};