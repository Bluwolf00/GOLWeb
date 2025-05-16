const db = require('./database.js');

const authPage = async (req,res,next) => {
    if (req.session.loggedin) {
        var role;
        try {
            role = await db.getUserRole(req.session.username);
            if (role == "Admin" || role == "Moderator") {
                next();
            } else {
                // Forbidden - Client lacks permission
                res.status(403);
                res.redirect('/error?error=403');
            }
        } catch (error) {
            // Error - Database error
            res.status(500);
            res.redirect('/login');
        }

    } else {
        // Unauthorized - Client not logged in
        res.status(401);
        res.redirect('/login');
    }
}

module.exports = {
    authPage
};