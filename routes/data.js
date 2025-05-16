const express = require('express');
var router = express.Router();
const db = require('../database.js');

const middle = require('../middle.js');
const authPage = middle.authPage;


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
    const members = await db.getMembers();
    res.send(members);
});

router.get('/getfullmembers', async (req, res) => {
    const members = await db.getFullMembers();
    res.send(members);
});

router.get('/getBadges', async (req, res) => {
    const badges = await db.getBadges();
    res.send(badges);
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
    if (all == "true") {
        var ranks = await db.getRanks(true);
    } else {
        var ranks = await db.getRanks(false, aboveOrBelow, currentRank);
    }
    res.send(ranks);
    });


router.get('/getMemberAttendance', async (req, res) => {
    var name = req.query.name;
    var attendance = { "numberOfEventsAttended": -1, "insertStatus": false };
    try {
        temp = await db.getMemberAttendance(name);
        attendance.numberOfEventsAttended = temp.numberOfEventsAttended;
        attendance.insertStatus = temp.insertStatus;
        if (attendance.insertStatus) {
            res.status(201);
        } else {
            res.status(200);
        }
        res.send(attendance);
    } catch (error) {
        res.status(500);
        res.send(error.message);
    }

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
    if (result.affectedRows > 0) {
        res.status(200);
        // Note: Compatible with Express 4.x.x
        // But not with Express 5.x.x
        res.redirect(req.get('referer') + "?editSuccess=1");
    } else {
        res.status(500);
        res.redirect(req.get('referer') + "?editSuccess=0");
    }
});

// -- DELETE REQUESTS - DATA --

router.delete('/deleteMember', authPage, async (req, res) => {
    var memberID = req.body.memberID;

    if (!memberID) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.deleteMember(memberID);
    if (result[0].affectedRows > 0) {
        res.status(200);
    } else {
        res.status(500);
        result[1] = "Failed to delete member - Check if the member ID exists.";
    }
});

module.exports = router;