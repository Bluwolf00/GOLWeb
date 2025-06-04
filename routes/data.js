const express = require('express');
var router = express.Router();
const db = require('../database.js');
const bcrypt = require('bcryptjs');

const middle = require('../middle.js');
const authPage = middle.authPage;

const multer = require('multer');
var store = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/badge/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: store });

// -- GET REQUESTS - DATA --

router.get('/memberinfo', async (req, res) => {
    var member = await db.getMember(req.query.name);
    // console.log(req.query.name);
    res.send(member);
});

router.get('/memberbadges', async (req, res) => {
    var badges = await db.getMemberBadges(req.query.name);
    res.send(badges);
});

router.get('/getmembers', async (req, res) => {
    var withParents = req.query.withParents;
    var members;

    if (typeof withParents !== "undefined") {
        if (withParents.toString() == "true") {
            members = await db.getMembers(true);
        } else {
            members = await db.getMembers(false);
        }
    } else {
        members = await db.getMembers(false);
    }
    res.send(members);
});

router.get('/getmemberswparents', async (req, res) => {
    const members = await db.getMembers();
    res.send(members);
});

router.get('/getBadges', async (req, res) => {
    const badges = await db.getBadges();
    res.send(badges);
});

router.get('/getBadge', async (req, res) => {
    const badgeID = req.query.badgeID;
    if (!badgeID) {
        res.status(400).send("Bad Request - Missing badgeID parameter");
        return;
    }
    const badge = await db.getBadge(badgeID);
    if (badge) {
        res.send(badge);
    } else {
        res.status(404).send("Not Found - Badge does not exist");
    }
});

router.get('/getAllBadgePaths', authPage, async (req, res) => {
    try {
        const allBadges = await db.getAllBadgePaths();
        res.send(allBadges);
    } catch (error) {
        res.status(500).send("Internal Server Error - Unable to retrieve badge paths");
        console.error("Error fetching badge paths:", error);
    }
});

router.get('/getVideos', async (req, res) => {

    try {
        const videos = await db.getVideos();
        res.send(videos);
    } catch (error) {
        res.send(error);
    }
});

router.get('/getRanks', async (req, res) => {
    var all = req.query.all;
    var aboveOrBelow = req.query.aboveOrBelow;
    var currentRank = req.query.currentRank;
    if (typeof currentRank === "string") {
        currentRank = currentRank.replaceAll("_", " ");
    } else {
        currentRank = null;
    }
    if (all == "true") {
        var ranks = await db.getRanks(true);
    } else {
        var ranks = await db.getRanks(false, aboveOrBelow, currentRank);
    }
    res.send(ranks);
});

router.get('/getMemberAttendance', async (req, res) => {
    var name = req.query.name;
    var content = { "thursdays": -1, "sundays": -1, "numberOfEventsAttended": -1 };
    try {
        temp = await db.getMemberAttendance(name);
        if (temp == null || temp == false) {
            content.thursdays = 0;
            content.sundays = 0;
            content.numberOfEventsAttended = 0;
        } else {
            content.thursdays = temp.thursdays;
            content.sundays = temp.sundays;
            content.numberOfEventsAttended = temp.numberOfEventsAttended;
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
    res.send(content);
});

// Needs rate limited
router.get('/updateMemberLOAs', async (req, res) => {
    var result = await db.updateMemberLOAs();
    if (result == 203) {
        res.status(203).send("No new LOAs found - No changes made.");
    } else if (result == 200) {
        res.status(200).send("LOAs updated successfully.");
    }
});

// Needs rate limited
router.get('/updateAttendance', async (req, res) => {
    var result = await db.updateMemberAttendance();
    if (result == 203) {
        res.status(203).send("No new attendance found - No changes made.");
    } else if (result == 200) {
        res.status(200).send("Attendance updated successfully.");
    }
});


// This route will return a list of members who are considered "senior members"/"leadership" based on their rank.
router.get('/seniorMembers', authPage, async (req, res) => {
    try {
        const members = await db.getSeniorMembers();
        res.send(members);
    } catch (error) {
        console.error("Error fetching senior members:", error);
        res.status(500).send("Internal Server Error");
    }
});


// This is a protected route - Only accessible by admins and moderators who are logged in
router.get('/getDashData', authPage, async (req, res) => {
    var data = await db.getDashboardData();
    res.send(data);
});

// -- POST REQUESTS - DATA --

// Despite being a request that recieves data, this is a POST request to ensure authentication is used
router.post('/fullmemberinfo', authPage, async (req, res) => {
    var memberID = req.body.memberID;
    var member = await db.getFullMemberInfo(memberID);
    res.send(member);
});

router.post('/performLogin', async (req, res) => {
    const { username, password } = req.body;
    var result = await db.performLogin(username, password, false);

    if (result) {
        req.session.loggedin = true;
        req.session.username = username;
        req.session.save(function () {
            return res.redirect('/home');
        });
    } else {
        res.send(result);
    }
});

router.post('/performRegister', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username already exists
    let result = await db.performLogin(username, password, false);
    console.log(result);

    if (result) {
        res.status(409); // Conflict
        res.redirect('/register?error=existinguser');
    } else {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        result = await db.performRegister(username, hashedPassword);
        if (result) {
            res.status(201); // Created
            res.redirect('/login?success=true');
        } else {
            res.send(result);
        }
    }
});

router.post('/updateMember', authPage, async (req, res) => {
    var memberID = req.body.memberid;
    var memberName = req.body.uname;
    var memberRank = req.body.rank;
    var memberCountry = req.body.country;
    var memberParent = req.body.reporting;
    var memberStatus = req.body.status;
    var memberJoined = req.body.joined;
    var memberPromo = req.body.promoDate;

    console.log(memberID, memberName, memberRank, memberCountry, memberParent, memberStatus, memberJoined);

    if (!memberID || !memberName || !memberRank || !memberCountry || !memberParent || !memberStatus) {
        res.status(400).send(`Bad Request - Missing Parameters : ${memberID}, ${memberName}, ${memberRank}, ${memberCountry}, ${memberParent}, ${memberStatus}`);
        return;
    }
    var result = await db.updateMember(memberID, memberName, memberRank, memberCountry, memberParent, memberStatus, memberJoined, memberPromo);
    var referer = req.get('referer');
    if (referer.indexOf('?') > -1) {
        referer = referer.substring(0, referer.indexOf('?'));
    }
    if (result.affectedRows > 0) {
        res.status(200);
        // Note: Compatible with Express 4.x.x
        // But not with Express 5.x.x
        res.redirect(referer + "?editSuccess=1");
    } else {
        res.status(500);
        res.redirect(referer + "?editSuccess=0");
    }
});

router.post('/changeRank', authPage, async (req, res) => {
    var member = req.body.memberID;
    var newRank = req.body.newRank;
    if (!member || !newRank) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.changeRank(member, newRank);
    if (result[0].affectedRows > 0) {
        res.status(200).send({ "result": "Member promoted successfully" });
    } else {
        res.status(500).send({ "result": "Failed to promote member - Check if the rank exists or if the member name is correct." });
    }
});

router.post('/createMember', authPage, async (req, res) => {
    var memberName = req.body.newuname;
    var memberRank = req.body.newrank;
    var memberCountry = req.body.newcountry;
    var memberParent = req.body.newreporting;
    var memberJoined = req.body.newjoined;

    if (!memberName || !memberRank || !memberCountry || !memberParent) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.createMember(memberName, memberRank, memberCountry, memberParent, memberJoined);
    var referer = req.get('referer');
    if (referer.indexOf('?') > -1) {
        referer = referer.substring(0, referer.indexOf('?'));
    }
    if (result > 0) {
        res.status(200);
        res.redirect(referer + "?createSuccess=1");
    } else if (!result) {
        res.status(500);
        res.redirect(referer + "?createSuccess=0");
    }
});

router.post('/updateBadge', [authPage, upload.single('image')], async (req, res) => {
    var badgeID = req.body.badgeid;
    var badgeName = req.body.name;
    var badgeDescription = req.body.desc;
    var badgeIsQualification = req.body.qual;
    var badgeImage = req.file;
    var neworexisting = req.body.uploadimage;
    var badgeImgPath = null;

    if (!badgeID || !badgeName || !badgeDescription || typeof badgeIsQualification === "undefined") {
        res.status(400).send("Bad Request - Missing Parameters." + req.body);
        return;
    }

    if (badgeIsQualification === "on") {
        badgeIsQualification = 1;
    } else {
        badgeIsQualification = 0;
    }

    // If neworexisting is set to "new", we will upload a new image, otherwise we will use the passed imagePath
    if (neworexisting === "existing") {
        // If the user chose to use an existing image, we will use the path provided in the form
        badgeImgPath = req.body.existingimage;
        if (!badgeImgPath) {
            res.status(400).send("Bad Request - No existing image path provided.");
            return;
        } else if (badgeImgPath.startsWith("/")) {
            // If the path starts with a slash, we need to remove it to get the correct path
            badgeImgPath = badgeImgPath.substring(1);
        }
    } else {
        try {
            if (badgeImage) {
                // If an image is uploaded, use its path
                badgeImgPath = (badgeImage.destination.split("public/")[1]) + badgeImage.filename; // This will be the path to the uploaded file
            } else {
                badgeImgPath = null; // If no image is uploaded, use a placeholder or existing path
                console.log("No image uploaded, using existing badge image path.");
            }
        } catch (error) {
            console.error("Error processing uploaded image:", error);
            res.status(500).send("Error processing uploaded image: " + error.message);
            return;
        }
    }

    var result = await db.updateBadge(badgeID, badgeName, badgeIsQualification, badgeDescription, badgeImgPath);
    if (result.affectedRows > 0) {
        res.status(200).redirect('/dashboard/badges?editSuccess=1');
    } else {
        res.status(500).redirect('/dashboard/badges?editSuccess=0');
    }
});

// -- PATCH REQUESTS - DATA --

router.patch('/changeRank', authPage, async (req, res) => {
    // var member = req.body.member;
    // var newRank = req.body.newRank;
    var member = req.body.member;
    var newRank = req.body.newRank;
    var auth = req.get('Authorization');
    if (auth != process.env.AUTH_TOKEN || auth != process.env.AUTH_TOKEN_2) {
        res.status(403).send("Forbidden - Invalid Token");
        return;
    }

    if (!member || !newRank) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    var result = await db.changeRank(member, newRank);
    if (result[0].affectedRows > 0) {
        res.status(200);
    } else {
        res.status(500);
        result[1] = "Failed to change rank - Check if the rank exists or if the member name is correct.";
    }
    res.send(result);
});

// -- DELETE REQUESTS - DATA --

router.delete('/deleteMember', authPage, async (req, res) => {
    var memberID = req.body.memberID;

    if (!memberID) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.deleteMember(memberID);
    console.log("DELETION RESULT: " + result);
    if (result) {
        res.status(200).send({ "result": "Member deleted successfully" });
    } else {
        res.status(500).send({ "result": "Failed to delete member - Check if the member ID exists." });
    }
});

// Catcher

router.get('*', (req, res) => {
    res.status(404).send({ "error": "Not Found - The requested resource does not exist." });
});

module.exports = router;