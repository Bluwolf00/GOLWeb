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

// -- GET REQUESTS - DATA --

router.get('/memberinfo', async (req, res) => {
    let username = req.query.name;
    var member = {};


    if (username) {
        member = await db.getMember(username, false);
    } else {
        let id = req.query.memberID;
        member = await db.getMember(id, true);
    }
    // console.log(req.query.name);
    res.send(member);
});

router.get('/memberbadges', async (req, res) => {
    var badges = await db.getMemberBadges(req.query.name);
    res.send(badges);
});

router.get('/getmembers', async (req, res) => {
    var withParents = req.query.withParents;
    var order = req.query.order;
    var members;

    if (typeof withParents !== "undefined") {
        if (withParents.toString() == "true") {
            members = await db.getMembers(true, order);
        } else {
            members = await db.getMembers(false, order);
        }
    } else {
        members = await db.getMembers(false, order);
    }
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
        const videos = await db.getVideos(false);
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

router.get('/getCompRanks', async (req, res) => {
    var ranks = await db.getComprehensiveRanks();
    res.send(ranks);
});

router.get('/getRankByID', authPage, async (req, res) => {
    var rankID = req.query.rankID;
    if (!rankID) {
        res.status(400).send("Bad Request - Missing rankID parameter");
        return;
    }
    var rank = await db.getRankByID(rankID);
    if (rank) {
        res.send(rank);
    } else {
        res.status(404).send("Not Found - Rank does not exist");
    }
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

router.get('/getSOPs', async (req, res) => {
    try {
        var sops = await db.getSOPs();
        let userData = getUserData(req);

        console.log("SOPs fetched:", sops.length);

        // Check if the logged user has access to restricted SOPs
        if (userData.loggedIn && userData.role && (userData.role.toLowerCase() === 'member' || userData.role.toLowerCase() === 'admin' || userData.role.toLowerCase() === 'moderator')) {
            console.log("User is a member or has access to restricted SOPs, not modifying SOP URLs.");
        } else {
            console.log("User is not a member or does not have access to restricted SOPs, setting SOP URLs to null.");
            sops.forEach(sop => {
                if (sop.isRestricted === 1) {
                    sop.sopUrl = null; // Set SOP URL to null if restricted
                }
            });
        }

        res.send(sops);
    } catch (error) {
        console.error("Error fetching SOPs:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.get('/getSOPbyID', async (req, res) => {
    var sopID = req.query.sopID;
    if (!sopID) {
        res.status(400).send("Bad Request - Missing sopID parameter");
        return;
    }
    try {
        const sop = await db.getSOPbyID(sopID);
        res.send(sop);
    } catch (error) {
        console.error("Error fetching SOPs:", error);
        res.status(500).send("Internal Server Error");
    }
});

// This is a protected route - Only accessible by admins and moderators who are logged in
router.get('/getDashData', authPage, async (req, res) => {
    var data = await db.getDashboardData();
    res.send(data);
});

router.get('/assignedToBadge', authPage, async (req, res) => {
    var badgeID = req.query.badgeID;
    if (!badgeID) {
        res.status(400).send("Bad Request - Missing badgeID parameter");
        return;
    }
    var members = await db.getMembersAssignedToBadge(badgeID);
    res.send(members);
});

router.get('/getLoggedInUser', async (req, res) => {

    // Get user data
    let userData = getUserData(req);

    if (userData.loggedIn) {

        var memberID = await db.getUserMemberID(userData.username);
        res.status(200).send({
            "username": userData.username,
            "role": userData.role,
            "memberID": memberID || null
        });
    } else {
        res.status(401).send({
            "message": "Unauthorized - User not logged in."
        });
    }
});

router.get('/getLiveOrbat', async (req, res) => {
    try {
        var orbatData = await db.getLiveOrbat();

        if (!orbatData || orbatData.layout.length === 0) {
            res.status(404).send("Not Found - Live ORBAT data not found.");
            return;
        }

        if (orbatData.message) {
            // If the ORBAT data contains a message, it means there was an issue fetching the data
            res.send(orbatData.message);
            return;
        } else {
            res.status(200).send(orbatData);
        }
    } catch (error) {
        console.error("Error fetching live ORBAT:", error);
        res.status(500).send("Internal Server Error - Unable to fetch live ORBAT.");
    } finally {
        return;
    }
});

router.get('/getMemberLiveOrbatInfo', async (req, res) => {

    // Get user data
    let userData = getUserData(req);

    try {
        if (userData.loggedIn === true) {
            // If the user is logged in, we will use their memberID to get their role in the live ORBAT
            var memberID = await db.getUserMemberID(userData.username);
            if (!memberID) {
                res.status(401).send("Unauthorized - User not found in the database.");
                return;
            }
            var memberInfo = await db.getMemberSlotInfoFromOrbat(memberID);
            if (memberInfo) {
                res.status(200).send(memberInfo);
            } else {
                res.status(404).send("Not Found - Member role not found in live ORBAT.");
            }
        } else {
            // If the user is not logged in, we will return a 401 Unauthorized status
            res.status(401).send("Unauthorized - User not logged in.");
        }

    } catch (error) {
        console.error("Error fetching live ORBAT member role:", error);
        res.status(500).send("Internal Server Error - Unable to fetch live ORBAT member role.");
    } finally {
        // Ensure that the function closes, this avoids hanging processes
        return;
    }
});

router.get('/getMission', async (req, res) => {
    try {
        var missions;
        if (req.query.missionID) {
            // Return single mission by ID
            missions = await db.getMissions(req.query.missionID);
        } else {
            // Return all missions
            missions = await db.getMissions();
        }

        if (!missions || missions.length === 0) {
            res.status(404).send("Not Found - No missions found.");
            res.send({});
        }

        res.send(missions);
    } catch (error) {
        console.error("Error fetching missions:", error);
        res.status(500).send("Internal Server Error - Unable to fetch missions.");
    }
});

router.get('/getMissionCompositions', async (req, res) => {
    try {
        const compositions = await db.getMissionCompositions();
        res.send(compositions);
    } catch (error) {
        console.error("Error fetching missions:", error);
        res.status(500).send("Internal Server Error - Unable to fetch missions.");
    }
});

// -- POST REQUESTS - DATA --

// Despite being a request that recieves data, this is a POST request to ensure authentication is used
router.post('/fullmemberinfo', authPage, async (req, res) => {
    var memberID = req.body.memberID;
    var member = await db.getFullMemberInfo(memberID);
    res.send(member);
});

router.post('/forceVideoUpdate', authPage, async (req, res) => {
    var result = {};
    var forceUpdate = req.body.forceUpdate;
    var statusCode = 500;
    try {
        result = await db.getVideos(forceUpdate);
        if (result) {
            statusCode = 200;
        } else {
            result = {
                "status": 404,
                "message": "No videos found or unable to fetch videos."
            };
            statusCode = 404;
        }
    } catch (error) {
        result = {
            "status": 500,
            "message": "Internal Server Error - Unable to update videos.",
            "error": error.message
        };
        statusCode = 500;
    } finally {
        res.status(statusCode).send(result);
    }
});

router.post('/performLogin', async (req, res) => {
    const { username, password } = req.body;
    var result = await db.performLogin(username, password, false);

    if (result.allowed) {
        req.session.loggedin = true;
        req.session.username = username;
        req.session.memberID = result.memberID || null; // Store memberID if available
        req.session.role = result.role.toLowerCase();
        req.session.save();
        res.status(200).send({ "result": result, "status": 200, "message": "Successfully logged in." });
        return;
    } else {
        res.status(401).send({ "result": result, "status": 401, "message": "Invalid username or password." });
        return;
    }
});

router.post('/performRegister', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // Check if the username already exists
    let result = await db.checkIfUserExists(username);
    // console.log("Perform Login Result: ", result);

    // Validate the passwords
    const passwordValidation = validatePasswords(password, confirmPassword);
    if (passwordValidation.status === 400) {
        res.status(400).send(passwordValidation);
        return;
    }

    if (result === true) {
        res.status(409).send({ "fullStatus": "Bad Request - Username already taken.", "statusMessage": "Error: Username already taken" }); // Conflict
        return;
    } else {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        result = await db.createUser(username, hashedPassword);
        if (result) {
            res.status(201).send({ "fullStatus": "Success - Registration Sucessful.", "statusMessage": "Success: Registration Sucessful. Redirecting..." });
        } else {
            res.status(500).send({ "fullStatus": "Internal Server Error", "statusMessage": "Server Error: Please try again later." });
        }
        return;
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

    // If the page already has a query string, append the editSuccess parameter to it
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

// Because this route is used to contact the database and the API, it is protected to prevent abuse
// This route will update the attendance of all members.
router.post('/updateMemberAttendance', authPage, async (req, res) => {

    var force = req.body.forceRefresh;

    var result = await db.updateMemberAttendance(force);
    if (result == 203) {
        res.status(203).send("No new attendance found - No changes made.");
    } else if (result == 200) {
        res.status(200).send("Attendance updated successfully.");
    } else {
        res.status(500).send("Internal Server Error - Unable to update attendance.");
    }
});

router.post('/changeRank', authPage, async (req, res) => {
    var member = req.body.memberID;
    var newRank = req.body.newRank;
    var bypassParent = req.body.bypassParent;
    if (!member || !newRank) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.changeRank(member, newRank, bypassParent);
    if (result[0].affectedRows > 0) {
        res.status(200).send({ "result": "Member promoted successfully" });
    } else {
        res.status(500).send({ "result": "Failed to promote member - Check if the rank exists or if the member name is correct." });
    }
});

router.post('/createMember', authPage, async (req, res) => {
    var memberName = req.body.newuname;
    var memberDiscordId = req.body.newdiscordId; // New field for Discord ID
    var memberRank = req.body.newrank;
    var memberCountry = req.body.newcountry;
    var memberParent = req.body.newreporting;
    var memberJoined = req.body.newjoined;

    if (!memberName || !memberDiscordId || !memberRank || !memberCountry || !memberParent) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }
    var result = await db.createMember(memberName, memberDiscordId, memberRank, memberCountry, memberParent, memberJoined);
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

router.post('/updateRank', authPage, async (req, res) => {
    var rankName = req.body.rankname;
    var rankDescription = req.body.description;
    var rankPrefix = req.body.prefix;

    // Search the description string for script tags and remove them
    rankDescription = rankDescription.replace(/<script.*?>.*?<\/script>/g, '');

    res.status(307).send({ message: "This endpoint is not yet implemented. Please try again later." });
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

router.post('/assignBadge', authPage, async (req, res) => {
    var memberIDs = req.body.members; // This should be an array of member IDs
    var badgeID = req.body.badgeID;
    var dateAwarded = req.body.dateAcquired;

    if (!memberIDs || !badgeID) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    if (Array.isArray(memberIDs)) {
        // If memberIDs is an array, remove the memberIDs that are already assigned to the badge
        var [assignedMembers] = await db.getMembersAssignedToBadge(badgeID);
        var membersToBeAdded = [];
        var membersToBeRemoved = [];

        // Filter out the member IDs that are already assigned to the badge
        membersToBeAdded = memberIDs.filter(memberID => {
            return !assignedMembers.some(assignedMember => parseInt(memberID) === parseInt(assignedMember.MemberID));
        });

        // If there are members that already have the badge, but are not in the new list, we will add them to the removedFromMembers array
        for (const assignedMember of assignedMembers) {
            if (!memberIDs.includes(assignedMember.MemberID.toString())) {
                membersToBeRemoved.push(assignedMember.MemberID);
            }
        }
    }

    if (memberIDs.length === 0) {
        res.status(400).send("Bad Request - No new members to assign to the badge.");
        return;
    }

    var result;
    var rowsSummed = 0;

    if (membersToBeAdded.length > 0) {
        result = await db.assignBadgeToMembers(membersToBeAdded, badgeID, dateAwarded);
        rowsSummed = result.affectedRows;

        if (result.affectedRows === 0) {
            res.status(500).send({ "result": "Failed to assign badge - Check if the badge ID exists or if the member IDs are correct." });
            return;
        }
    }


    if (membersToBeRemoved.length > 0) {
        // If there are members that need to be removed from the badge, we will remove them
        result = await db.removeBadgeFromMembers(membersToBeRemoved, badgeID);
        rowsSummed += result.affectedRows;
    }

    if (rowsSummed > 0) {
        res.status(200).send({ "result": "Badge updated successfully!", "status": 200 });
    } else {
        res.status(500).send({ "result": "Failed to update badge - Check if the badge ID exists or if the member IDs are correct." });
    }
});

router.post('/createSOP', authPage, async (req, res) => {
    const { newtitle, newauthors, newdescription, newdocType, newdocId } = req.body;
    const isAAC = req.body.newaacSOP === 'on';
    const isRestricted = req.body.newrestrictedDoc === 'on';

    if (!newtitle || !newauthors || !newdescription || !newdocType || !newdocId) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    try {
        const result = await db.createSOP(newtitle, newauthors, newdescription, newdocType, newdocId, isAAC, isRestricted);
        if (result) {
            res.status(201).send({ "result": "SOP created successfully", "status": 201 });
        } else {
            res.status(500).send({ "result": "Failed to create SOP - Check if the SOP already exists." });
        }
    } catch (error) {
        console.error("Error creating SOP:", error);
        res.status(500).send({ "result": "Internal Server Error - Unable to create SOP." });
    }
});

router.post('/editSOP', authPage, async (req, res) => {
    const { sopID, title, Authors, description, docType, docId } = req.body;
    var isAAC;
    var isRestricted;
    if (req.body.newaacSOP === 'on') {
        isAAC = 1;
    } else {
        isAAC = 0;
    }
    if (req.body.newrestrictedDoc === 'on') {
        isRestricted = 1;
    } else {
        isRestricted = 0;
    }

    if (!sopID || !title || !Authors || !description || !docType || !docId) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    // Check if the authors are valid
    if (Authors.includes(',')) {
        // If authors are provided as a comma-separated string, split them into an array
        var authorList = Authors.split(',').map(author => author.trim());
        // Validate each author and check if their name returns a valid member
        for (const author of authorList) {
            const member = await db.getMember(author);
            if (!member || member.length === 0) {
                res.status(400).send({ "result": `Bad Request - Author "${author}" does not exist.` });
                return;
            }
        }
    }

    try {
        const result = await db.editSOP(sopID, title, Authors, description, docType, docId, isAAC, isRestricted);
        if (result) {
            res.status(200).send({ "result": "SOP updated successfully", "status": 200 });
        } else {
            res.status(500).send({ "result": "Failed to update SOP - Check if the SOP exists." });
        }
    } catch (error) {
        console.error("Error updating SOP:", error);
        res.status(500).send({ "result": "Internal Server Error - Unable to update SOP." });
    }
});

router.post('/resetPassword', authPage, async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
        res.status(400).send({ "fullStatus": "Bad Request - Passwords do not match.", "statusMessage": "Error: Passwords do not match." });
        return;
    }

    if (!newPassword || newPassword.length < 8) {
        res.status(400).send({ "fullStatus": "Bad Request - Password must be at least 8 characters long.", "statusMessage": "Error: Password must be at least 8 characters long." });
        return;
    }

    // Check password strength
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        res.status(400).send({ "fullStatus": "Bad Request - Password must contain at least one uppercase letter, one lowercase letter, and one number.", "statusMessage": "Error: Password must contain at least one uppercase letter, one lowercase letter, and one number." });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await db.resetPassword(req.session.username, hashedPassword);

        if (result) {
            res.status(200).send({ "fullStatus": "SUCCESS: Password reset successfully!", "statusMessage": "Password reset successfully!" });
        } else {
            res.status(500).send({ "fullStatus": "Internal Server Error - Unable to reset password.", "statusMessage": "Error: Unable to reset password. Please try again later." });
        }
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).send({ "fullStatus": "Internal Server Error - Unable to reset password.", "statusMessage": "Error: Unable to reset password. Please try again later." });
    }
});

// -- PATCH REQUESTS - DATA --

router.patch('/orbatSubmission', async (req, res) => {

    // Get user data
    let userData = getUserData(req);

    var memberID = req.body.selectedMember;
    var memberRole = req.body.chosen_role;
    var memberSlotID = req.body.memberSlotID;
    var unassign = req.body.unassign;

    if (unassign === "on") {
        memberRole = "NONE";
    }

    switch (memberRole.toLowerCase()) {
        case "fac":
            // Handle Forward Air Controller role
            memberRole = "Forward Air Controller";
            break;

        case "any basic":
            // Set memberRole to be an array of the basic roles
            memberRole = [
                "Rifleman",
                "Grenadier",
                "Assistant Gunner",
                "Automatic Rifleman"
            ];
            break;

        case "any leader":
            // Set memberRole to be an array of the leader roles
            memberRole = [
                "Fire Team Leader",
                "Squad Leader",
                "Platoon Leader"
            ];
            break;

        default:
            break;
    }

    console.log("Member Role: ", memberRole);



    // If the memberID does not equal the current logged in user, we will check if the user is an admin or moderator
    if (userData.loggedIn && userData.role && userData.role.toLowerCase() !== "admin" && userData.role.toLowerCase() !== "moderator") {
        if (parseInt(memberID) !== parseInt(userData.memberID)) {
            console.log("Member ID: %d | Session Member ID: %s", memberID, userData.memberID);
            console.log(memberID !== userData.memberID);
            res.status(403).send("Forbidden - You are not allowed to update this member's ORBAT.");
            return;
        }
    } else if (!userData.loggedIn) {
        res.status(401).send("Unauthorized - You must be logged in to update the ORBAT.");
        return;
    }

    if (!memberID || !memberRole) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    if (!memberSlotID) {
        // Role Selection
        var result = await db.updateMissionORBAT(memberID, memberRole);
    } else {
        // Slot Selection
        var result = await db.updateMissionORBAT(memberID, memberRole, memberSlotID);
    }

    if (result) {
        // console.log("Result Message: " + result.message);
        if (result.message) {
            res.status(200).send({ "message": result.message, "slotNodeID": result.slotNodeID });
            return;
        } else {
            res.status(200).send({ "message": "Member added to ORBAT successfully", "slotNodeID": result.slotNodeID });
        }
    } else {
        res.status(500).send({ "message": "Failed to add member to ORBAT - Check if the member name is correct.", "slotNodeID": result.slotNodeID });
    }
    return;
});

router.patch('/missionorbatSubmission', authPage, async (req, res) => {
    // This route is used to either create or update a mission on the database.

    var missionID;
    var missionDate;
    var templateID;

    if (req.body.new_composition) {
        // Must be the Create Modal
        templateID = req.body.new_composition;
        missionDate = req.body.missionDatetimeNew;
        missionID = null; // No mission ID for new missions
    } else {
        templateID = req.body.composition;
        missionDate = req.body.missionDatetime;
        missionID = req.body.missionID; // This is the ID of the mission to update
    }

    if (!templateID || !missionDate) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    try {
        // If the mission already exists, it will update it, otherwise it will create a new mission
        var result = await db.patchMissions(missionID, templateID, missionDate);

        // console.log("Patch Missions Result: ", result);
        if (result) {
            if (result[0].affectedRows > 0) {
                res.status(200).send({ "message": "Mission updated successfully", "missionID": result.insertId || templateID });
            } else {
                res.status(500).send({ "message": "Failed to update mission - Check if the mission exists." });
            }
        }
    } catch (error) {
        console.error("Error processing mission ORBAT submission:", error);
        res.status(500).send("Internal Server Error - Unable to process mission ORBAT submission.");
    } finally {
        return;
    }
});

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

router.delete('/deleteMission', authPage, async (req, res) => {
    var missionID = req.query.missionId;

    if (!missionID) {
        res.status(400).send("Bad Request - Missing Parameters");
        return;
    }

    try {
        var result = await db.deleteMission(missionID);
        if (result > 0) {
            res.status(200).send({ "result": "Mission deleted successfully" });
        } else {
            res.status(404).send({ "result": "Mission not found or already deleted" });
        }
    } catch (error) {
        console.error("Error deleting mission:", error);
        res.status(500).send({ "result": "Internal Server Error - Unable to delete mission." });
    }
});

router.delete('/deleteSOP', authPage, async (req, res) => {
    const sopID = req.query.sopID;

    if (!sopID) {
        res.status(400).send("Bad Request - Missing sopID parameter");
        return;
    }

    try {
        const result = await db.deleteSOP(sopID);
        if (result.affectedRows > 0) {
            res.status(200).send({ "result": "SOP deleted successfully" });
        } else {
            res.status(404).send({ "result": "SOP not found or already deleted" });
        }
    } catch (error) {
        console.error("Error deleting SOP:", error);
        res.status(500).send({ "result": "Internal Server Error - Unable to delete SOP." });
    }
});

// Catcher

router.get('*', (req, res) => {
    res.status(404).send({ "error": "Not Found - The requested resource does not exist." });
});

// Helper Functions

function validatePasswords(password, confirmPassword) {
    if (password !== confirmPassword) {
        return { "fullStatus": "Bad Request - Passwords do not match.", "statusMessage": "Error: Passwords do not match.", "status": 400 };
    }

    if (!password || password.length < 8) {
        return { "fullStatus": "Bad Request - Password must be at least 8 characters long.", "statusMessage": "Error: Password must be at least 8 characters long.", "status": 400 };
    }

    // Check password strength
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return { "fullStatus": "Bad Request - Password must contain at least one uppercase letter, one lowercase letter, and one number.", "statusMessage": "Error: Password must contain at least one uppercase letter, one lowercase letter, and one number.", "status": 400 };
    }

    return { "fullStatus": "SUCCESS: Passwords are valid.", "statusMessage": "Passwords are valid.", "status": 200 };
}

module.exports = router;