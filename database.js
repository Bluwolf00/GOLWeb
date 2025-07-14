const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const embeds = require('./embeds.js');
const fs = require('fs');
const { start } = require('repl');
dotenv.config()

var pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    timezone: 'Z', // Set timezone to UTC
}).promise()


function getPool() {
    return pool;
}

async function closePool() {
    // Close the pool and end all connections
    if (pool == null) {
        console.log("WARN:  Pool is already closed");
        return;
    }
    console.log("INFO:  Closing database connection pool...");
    await pool.end()
    console.log("SUCCESS:  Database connection pool closed.");
    pool = null; // Set the pool to null to prevent further use
}

// const result = await pool.query('SELECT * FROM Members')

async function getMembers(includeParentName = false, order = "memberidasc") {
    var rows = [null];
    var query = '';
    var orderBy;
    switch (order.toLowerCase()) {
        case "unameasc":
            orderBy = 'ORDER BY Members.UName ASC';
            break;

        default:
            orderBy = 'ORDER BY Members.memberID ASC';
            if (includeParentName == true) {
                orderBy = 'ORDER BY m.memberID ASC';
            }
            break;
    }
    if (includeParentName == true) {
        query = `SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank ${orderBy}`
    } else {
        query = `SELECT Members.MemberID,UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick,playerStatus,thursdays,sundays,numberOfEventsAttended FROM Ranks,Members LEFT JOIN Attendance ON Members.MemberID = Attendance.MemberID WHERE Members.playerRank = Ranks.rankID ${orderBy}`;
    }
    try {
        [rows] = await pool.query(query);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function getFullMemberInfo(memberID) {
    var rows = [null];
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query('SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank AND m.MemberID = ? ORDER BY m.MemberID ASC', [memberID]);
    } catch (error) {
        console.log(error);
    }
    return rows[0]
};

async function getMember(name) {
    var rows = [null];
    try {
        rows = await pool.query(`
            SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,playerStatus
            FROM Members,Ranks
            WHERE Members.playerRank = Ranks.rankID AND UName = ?`, [name])
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0]
    }
}

async function deleteMember(memberID) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            DELETE FROM Members
            WHERE MemberID = ?`, [memberID])
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

// async function getMemberParent(memberName) {
//     var rows = [null];
//     try {
//         [rows] = await pool.query(`
//             SELECT parentNodeId
//             FROM Members
//             WHERE UName = ?`, [memberName])
//     } catch (error) {
//         console.log(error);
//     } finally {
//         if (rows.length == 0) {
//             return null;
//         }
//         return rows[0].parentNodeId;
//     }
// }

async function getMemberNodeId(memberName) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT nodeId
            FROM Members
            WHERE UName = ?`, [memberName])
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        }
        return rows[0].nodeId;
    }
}

async function getRankFromName(rankName) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT rankID
            FROM Ranks
            WHERE rankName = ?`, [rankName])
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0].rankID;
    }
}

async function getRankByID(rankID) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT rankID,rankName,prefix,rankPath,rankDescription
            FROM Ranks
            WHERE rankID = ?`, [rankID])
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            return rows[0];
        }
    }
}

async function updateMember(memberID, memberName, rank, country, parentName, status, dateOfJoin, dateOfPromo) {
    var rows = [null];
    try {

        // Get the parent node ID from the name
        // If the parent name is "None" AKA the top element, set the parent node ID to "root"
        var parentNodeId = "root";
        if (parentName.toString() !== "None" || parentName.toString() !== "") {
            parentNodeId = await getMemberNodeId(parentName);
            // console.log("Parent Name: " + parentName);
            // console.log("Parent Node ID: " + parentNodeId);
        }
        if (parentNodeId == null) { parentNodeId = "root"; }
        var rankID = await getRankFromName(rank);
        if (dateOfJoin == "") {
            dateOfJoin = null;
        }
        if (dateOfPromo == "") {
            dateOfPromo = null;
        }

        [rows] = await pool.query(`
            UPDATE Members
            SET playerRank = ?,
                UName = ?,
                Country = ?,
                parentNodeId = ?,
                playerStatus = ?,
                DateOfJoin = ?,
                DateOfPromo = ?
            WHERE MemberID = ?`, [rankID, memberName, country, parentNodeId, status, dateOfJoin, dateOfPromo, memberID])
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function createMember(memberName, rank, country, parentName, dateOfJoin) {
    var rows = [null];
    try {
        // Get the highest nodeId in the database
        var [maxNodeId] = await pool.query('SELECT MAX(nodeId) AS maxNodeId FROM Members WHERE nodeId LIKE "E-%"');
        var newNodeId = "E-" + ((parseInt(maxNodeId[0].maxNodeId.split("-")[1]) + 1) + "").padStart(4, '0');
        // Get the parent node ID from the name
        var parentNodeId = "root";
        if (parentName !== "None" || parentName !== "") {
            parentNodeId = await getMemberNodeId(parentName);
        }

        if (parentNodeId == null) { parentNodeId = "root"; }

        var rankID = await getRankFromName(rank);

        var nick = "";
        var playerStatus = "Active";
        if (rank == "Reserve") {
            playerStatus = "Reserve";
        }

        var response = await pool.query(`
            INSERT INTO Members (UName,playerRank,Country,nodeId,parentNodeId,DateOfJoin,nick,playerStatus) VALUES (?,?,?,?,?,?,?,?)`, [memberName, rankID, country, newNodeId, parentNodeId, dateOfJoin, nick, playerStatus]);

        if (response[0].affectedRows > 0) {
            console.log("Member created successfully");
            [rows] = await pool.query('SELECT MemberID FROM Members WHERE nodeId = ?', [newNodeId]);
            var memberID = rows[0].MemberID;
            console.log("Member ID: " + memberID);
            return memberID;
        }
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getBadges() {
    const [rows] = await pool.query('SELECT badgeID,badgeName,badgePath,isQualification,badgeDescription FROM Badges ORDER BY isQualification,badgeName ASC')
    return rows
}

async function getBadge(badgeID) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT badgeID,badgeName,badgePath,isQualification,badgeDescription
            FROM Badges
            WHERE badgeID = ?`, [badgeID])
    }
    catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            return rows[0];
        }
    }
}

async function getAllBadgePaths() {
    var paths = [null];
    try {
        // On the dedicated server, the path is formatted different
        // __dirname = process.cwd() + "\\public\\img\\badge";
        __dirname = process.cwd() + "/public/img/badge";

        // Return all files in the badges directory that are images
        var out = fs.readdirSync(__dirname);
        paths = out.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file)).map(file => `/img/badge/${file}`);
        return paths;
    } catch (error) {
        console.log(error);
        return error;
    }
}

async function updateBadge(badgeID, badgeName, isQualification, badgeDescription, badgePath) {
    var rows = [null];
    try {
        // console.log("Updating badge path: " + badgePath);
        if (badgePath == null || badgePath == "") {
            [rows] = await pool.query(`
                UPDATE Badges
                SET badgeName = ?,
                    isQualification = ?,
                    badgeDescription = ?
                WHERE badgeID = ?`, [badgeName, isQualification, badgeDescription, badgeID]);
        } else {
            [rows] = await pool.query(`
                UPDATE Badges
                SET badgeName = ?,
                    badgePath = ?,
                    isQualification = ?,
                    badgeDescription = ?
                WHERE badgeID = ?`, [badgeName, badgePath, isQualification, badgeDescription, badgeID]);
        }
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function getMemberBadges(name) {
    var rows = [null];
    try {
        rows = await pool.query(`
            SELECT badgeName,badgePath,isQualification,DateAcquired
            FROM Badges,MemberBadges,Members
            WHERE Members.UName = ? AND Members.MemberID = MemberBadges.MemberID AND MemberBadges.badgeID = Badges.badgeID
            ORDER BY isQualification ASC`, [name])
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function getMembersAssignedToBadge(badgeID) {
    var rows = [null];
    try {
        rows = await pool.query(`
            SELECT MemberBadges.MemberID,UName,DateAcquired
            FROM Members,MemberBadges
            WHERE MemberBadges.badgeID = ? AND Members.MemberID = MemberBadges.MemberID
            ORDER BY DateAcquired DESC`, [badgeID])
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function assignBadgeToMembers(memberIDs, badgeID, dateAcquired) {
    var rows = [];
    var result;
    try {
        // Loop through the member IDs and insert the badge for each member
        for (var i = 0; i < memberIDs.length; i++) {
            result = await pool.query(`
                INSERT INTO MemberBadges (badgeID,MemberID,DateAcquired)
                VALUES (?,?,?)`, [badgeID, memberIDs[i], dateAcquired]);
            rows.push(result[0]);
        }
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function removeBadgeFromMembers(memberIDs, badgeID) {
    var rows = [];
    var result;
    try {
        // Loop through the member IDs and insert the badge for each member
        for (var i = 0; i < memberIDs.length; i++) {
            result = await pool.query(`
                DELETE FROM MemberBadges
                WHERE badgeID = ? AND MemberID = ?`, [badgeID, memberIDs[i]]);
            rows.push(result[0]);
        }
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function getVideos(flag = false) {
    var rows = null;

    try {
        [rows] = await pool.query('SELECT * FROM ytvideos');
    } catch (error) {
        console.log("DATABASE: " + error);
        return rows;
    }

    // If the last update was more than 3 hours ago or the field is empty, re update the videos from the API
    // Null check before checking the last update time to prevent errors
    if (rows.length == 0) {
        flag = true;
    } else {
        if (rows[0].last_update < (new Date().getTime() - (3600000 * 3))) {
            flag = true;
        }
    }

    if (flag) {

        console.log("DATABASE: Videos are outdated, updating...");

        var info = await embeds.getInfoFromAPI();
        var videos = await embeds.addVideosDuration(info);

        try {
            if (videos.video1 != null) {
                console.log("DATABASE: API Call successful");
            }
        } catch (error) {
            // If the API call fails, return the current videos
            [rows] = await pool.query('SELECT * FROM ytvideos');
            return rows;
        }

        // Clear the table
        await pool.query('DELETE FROM ytvideos');

        var currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        var sql = 'INSERT INTO ytvideos (title, thumbUrl, videoId, videoUrl, duration, author, last_update) VALUES ?';
        var vals = [
            [videos.video1.title, videos.video1.thumbnail, videos.video1.videoId, videos.video1.url, videos.video1.duration, videos.video1.author, currentTime],
            [videos.video2.title, videos.video2.thumbnail, videos.video2.videoId, videos.video2.url, videos.video2.duration, videos.video2.author, currentTime],
            [videos.video3.title, videos.video3.thumbnail, videos.video3.videoId, videos.video3.url, videos.video3.duration, videos.video3.author, currentTime]
        ];
        await pool.query(sql, [vals]);

        console.log("DATABASE: Videos updated");

        // Get the updated videos
        [rows] = await pool.query('SELECT * FROM ytvideos');
    } else {
        console.log("DATABASE: Videos are up to date");
    }

    return rows;
}

async function getRanks(all, aboveOrBelow, currentRank) {
    var rows = null;
    if (all == true) {
        [rows] = await pool.query(`
            SELECT rankID, rankName, prefix
            FROM Ranks
            ORDER BY rankID ASC`);
    } else {
        if (aboveOrBelow == "above") {
            [rows] = await pool.query(`
                SELECT rankName, prefix
                FROM Ranks
                WHERE rankID < (SELECT rankID FROM Ranks WHERE rankName = ?)
                ORDER BY rankID DESC`, [currentRank]);
        } else {
            [rows] = await pool.query(`
                SELECT rankName, prefix
                FROM Ranks
                WHERE rankID > (SELECT rankID FROM Ranks WHERE rankName = ?)
                ORDER BY rankID ASC`, [currentRank]);
        }
    }
    return rows;
}

async function getComprehensiveRanks() {
    // This function will return all ranks with their nodeId and parentNodeId
    // This is used to populate the rank tree in the dashboard
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT rankID, rankName, prefix, rankPath, rankDescription
            FROM Ranks
            ORDER BY rankID ASC`);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

// POST REQUESTS
async function changeRank(member, newRank) {
    var rows = null;
    try {
        console.log("MEMBER: " + member);
        console.log("NEW RANK: " + newRank);
        rows = await pool.query(`
            UPDATE Members
            SET Members.playerRank = (SELECT rankID FROM Ranks WHERE rankName = ?)
            WHERE MemberID = ?`, [newRank, member]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function getSeniorMembers() {
    // This function will return the members that are Corporal and above
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT MemberID,UName,rankName,nodeId,parentNodeId
            FROM Ranks,Members
            WHERE Members.playerRank = Ranks.rankID AND Ranks.rankID < 5
            ORDER BY Members.playerRank ASC`);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function performLogin(username, password, fallback) {

    if (!fallback) {
        var rows = [null];
        try {
            [rows] = await pool.query(`
                SELECT username,password,role
                FROM users
                WHERE username = ?`, [username]);
        } catch (error) {
            console.log(error);
        } finally {
            if (rows.length == 0) {
                return { "allowed": false, "role": null };
            } else if (typeof rows == "undefined" || typeof rows == "null" || rows == null) {
                return { "allowed": false, "role": null };
            } else {
                var hashedPassword = rows[0].password;
                // Compare the password with the hashed password
                if (bcrypt.compareSync(password, hashedPassword)) {
                    // If the password matches, return true and the user's role
                    console.log("User " + username + " logged in successfully");
                    console.log("User role: " + rows[0].role);
                    var role = rows[0].role;
                    return { "allowed": true, "role": role };
                }
            }
        }
    } else {
        if (username == process.env.ADMIN_USERNAME && password == process.env.ADMIN_PASSWORD) {
            return true;
        } else {
            return false;
        }
    }
}

async function performRegister(username, password) {
    try {
        const result = await pool.query(`
            INSERT INTO users (username,password,role)
            VALUES (?,?,"public")`, [username, password]);
        return result[0].affectedRows > 0;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function resetPassword(username, newPassword) {
    try {
        const hashedPassword = newPassword;
        const result = await pool.query(`
            UPDATE users
            SET password = ?
            WHERE username = ?`, [hashedPassword, username]);
        return result[0].affectedRows > 0;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getUserRole(username) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT role
            FROM users
            WHERE username = ?`, [username]);
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            return rows[0].role;
        }
    }
}

async function getUserMemberID(username) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT MemberID
            FROM users
            WHERE username = ?`, [username]);
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            console.log("getUserMemberID | MemberID: " + rows[0].MemberID);
            return rows.MemberID;
        }
    }
}

async function getMemberAttendance(name) {
    var rows = [null];

    // 200 = Changes made
    // 203 = No changes made
    var updated = 0;

    // Check if the attendance records have been updated in the last 12 hours
    var attendanceUpdated = await isAttendanceUpdated();
    if (!(attendanceUpdated)) {
        updated = await updateMemberAttendance(bypassCheck = true);
    }

    // Get the member's record from the database
    try {
        console.log("Getting attendance records for " + name);
        [rows] = await pool.query(`
            SELECT MemberDiscordID, thursdays, sundays, (thursdays + sundays) AS numberOfEventsAttended
            FROM Attendance,Members
            WHERE Members.UName = ? AND Members.MemberID = Attendance.MemberID`, [name]);

    } catch (error) {
        console.log(error);
    }

    if (rows.length == 0) {
        // If the member is not found in the database
        console.log("GETMEMBERATTENDANCE: Member " + name + " not found");
        return false;
    }

    rqResponse = {
        "thursdays": rows[0].thursdays,
        "sundays": rows[0].sundays,
        "numberOfEventsAttended": rows[0].numberOfEventsAttended,
        "inserted": updated
    }

    return rqResponse;
}

// This function will check if the attendance records have been updated in the last 12 hours
// It will return false if the records are outdated and need to be updated
// It will return true if the records are up to date and do not need to be updated
async function isAttendanceUpdated() {
    try {
        // Check if the attendance records have been updated in the last 12 hours
        var calcTime = new Date().getTime().valueOf() - (3600000 * 12);
        var [rows] = await pool.query('SELECT lastUpdate FROM Attendance ORDER BY lastUpdate DESC LIMIT 1;');
        var lastUpdateInt = Date.parse(rows[0].lastUpdate).valueOf();

        if (lastUpdateInt > calcTime) {
            console.log("Attendance records are up to date, no need to update");
            return true;
        } else {
            console.log("Attendance records are outdated, updating...");
            return false;
        }
    } catch (error) {
        console.error("ERROR: " + error);
        return false;
    }
}

// When this function is called, it will pull the attendance records for every member
async function updateMemberAttendance(bypassCheck = false) {

    // If the user specifies to bypass the update check, it will not perform the lookup
    // This is to prevent the function from performing more database queries than necessary
    if (!bypassCheck) {
        // Check if the attendance records have been updated in the last 12 hours
        // This is to prevent the function from performing more API calls than necessary
        var attendanceUpdated = await isAttendanceUpdated();
    } else {
        attendanceUpdated = false;
    }

    if (attendanceUpdated) {
        // Records are up to date, no need to update
        return 203;
    } else {
        var attendanceRecords = await embeds.getAttendanceReport();

        var memberDetails = [];
        try {
            // Only update the members that are Active or LOA
            var [temp] = await pool.query('SELECT MemberID,UName FROM Members WHERE playerStatus NOT IN ("Inactive", "Reserve")');

            for (var i = 0; i < temp.length; i++) {

                // If the member is in the attendance records, add their attendance records to the memberDetails array
                for (var j = 0; j < attendanceRecords.length; j++) {

                    // console.log("Checking member: " + temp[i].UName + " against attendance record: " + attendanceRecords[j].memberName);

                    var formatName = temp[i].UName.replace(" ", "");

                    // If the member is found
                    if (attendanceRecords[j].memberName.toLowerCase() == formatName.toLowerCase()) {
                        var thursdays = attendanceRecords[j].thursdays;
                        var sundays = attendanceRecords[j].sundays;
                        var memberDiscordId = attendanceRecords[j].memberDiscordId;
                        // console.log("\n-- Member found in attendance records: " + attendanceRecords[j].memberName + " --\n");

                        // Push the details to the array
                        memberDetails.push({
                            "memberId": temp[i].MemberID,
                            "memberDiscordId": memberDiscordId,
                            "memberName": temp[i].UName,
                            "thursdays": thursdays,
                            "sundays": sundays
                        });
                        break;
                    }
                }

            }
        } catch (error) {
            console.log("ERROR: " + error);
        }

        var results = [];

        // Once the attendance records have been filtered to only include the members that are in the database
        // Loop through the attendance records and update the database
        for (var i = 0; i < memberDetails.length; i++) {
            var memberDiscordId = memberDetails[i].memberDiscordId;
            var memberName = memberDetails[i].memberName;
            var thursdays = memberDetails[i].thursdays;
            var sundays = memberDetails[i].sundays;
            var total = memberDetails[i].sundays + memberDetails[i].thursdays;
            var updatedTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Update the attendance records in the database
            var query = await pool.query(`
                UPDATE Attendance
                SET thursdays = ?, sundays = ?, numberOfEventsAttended = ?, lastUpdate = ?
                WHERE MemberDiscordID = ?`, [thursdays, sundays, total, updatedTime, memberDiscordId]);

            if (query[0].affectedRows > 0) {
                results.push(query[0].affectedRows);
            }
            else {
                // If the member is not found in the database, check if the member exists in the Members table, if so, insert the member into the Attendance table
                try {
                    var [rows] = await pool.query('SELECT MemberID FROM Members WHERE UName = ?', [memberName]);
                    if (rows.length > 0) {

                        // Member exists in the Members table
                        if (rows[0].MemberID != null) {
                            console.log("Member " + memberName + " found in the database. Updating attendance records...");
                            var memberId = rows[0].MemberID;

                            // Insert the member into the Attendance table
                            var insert = await pool.query('INSERT INTO Attendance (MemberID, MemberDiscordID, thursdays, sundays, numberOfEventsAttended, lastUpdate) VALUES (?,?,?,?,?,?)', [memberId, memberDiscordId, thursdays, sundays, total, updatedTime]);
                        } else {
                            // Else, the member does not exist, skip the member
                            console.log("Member " + memberName + " not found in the database. Skipping...");

                            // AKA: No record was inserted
                            var insert = false;
                        }
                    }
                } catch (error) {
                    console.error("ERROR: " + error);
                    var insert = false;
                } finally {
                    if (insert) {
                        console.log("SUCCESS: Inserted attendance records for member " + memberName);
                        results.push(insert[0].affectedRows);
                    } else {
                        console.warn("FAIL: Failed to insert attendance records for member " + memberName);
                    }
                }
            }
        }

        if (results.length == 0) {
            console.log("UPDATE ATTEND: No members were updated");
            return 203;
        } else {
            var updatedRecords = results.filter(x => x !== 0).length;
            console.log("Members updated: " + updatedRecords);
            return 200;
        }
    }
}

async function updateMemberLOAs() {

    // console.log("Updating LOAs...");
    var LOAs = await embeds.getMemberLOAsFromAPI();

    // Also update the LOAs in the database
    // console.log("Sending LOAs to the database...");
    var result = await setMemberLOAStatuses(LOAs);

    return result;
}

async function setMemberLOAStatuses(LOAs) {

    // NOTE: This function will only work if the Member has a record in the Attendance table
    // If the member does not have a record in the Attendance table, it will not update the status
    // In order to add a record to the Attendance table, their profile must be viewed first on the website
    // This is because the Attendance table is updated when the profile is viewed
    var rows = null;
    try {
        for (var i = 0; i < LOAs.length; i++) {
            if (Date.now() > LOAs[i].startDate && Date.now() < LOAs[i].endDate) {
                // console.log("Member " + LOAs[i].memberId + " is on LOA");
                [rows] = await pool.query(`
                    UPDATE Members, Attendance
                    SET playerStatus = 'LOA'
                    WHERE Attendance.MemberDiscordID = ? AND Attendance.MemberID = Members.MemberID`, [LOAs[i].memberId]);
            }
        }

        // Now check for any members that were on LOA but are no longer on LOA

        // Get all members that are on LOA
        var [membersOnLOA] = await pool.query(`SELECT Attendance.MemberDiscordID FROM Members, Attendance WHERE Members.playerStatus = 'LOA' AND Members.MemberID = Attendance.MemberID`);

        // Loop through the members on LOA and check if they are in the LOAs array
        for (var i = 0; i < membersOnLOA.length; i++) {
            var found = false;
            for (var j = 0; j < LOAs.length; j++) {
                if (membersOnLOA[i].MemberDiscordID == LOAs[j].memberId) {
                    found = true;
                    break;
                }
            }

            // If the member is not in the LOAs array, set their status to Active
            if (!found) {
                // console.log("Member " + membersOnLOA[i].MemberDiscordID + " is no longer on LOA");
                [rows] = await pool.query(`
                    UPDATE Members, Attendance
                    SET playerStatus = 'Active'
                    WHERE Attendance.MemberDiscordID = ? AND Attendance.MemberID = Members.MemberID`, [membersOnLOA[i].MemberDiscordID]);
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        if (typeof rows == "undefined") {
            console.log("No members LOAs were updated");
            result = 203;
        } else if (rows.affectedRows == 0) {
            console.log("No members LOAs were updated");
            result = 203;
        } else {
            console.log("LOAs Updated: " + rows.affectedRows);
            result = 200;
        }
        return result;
    }
}

// This function will retrieve the LOA status of a member
// It will return true if the member is on LOA, false if the member is not on LOA
async function getMemberLOA(name) {
    var rows = null;
    try {
        rows = await pool.query(`
            SELECT status
            FROM Members
            WHERE UName = ?`, [name]);
    } catch (error) {
        console.log(error);
    }

    if (rows.length == 0) {
        console.log("Member " + name + " not found");
        return false;
    } else {
        if (rows[0].status == "LOA") {
            console.log("Member " + name + " is on LOA");
            return true;
        }
    }
}

async function getSOPs() {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT sopID,sopTitle,sopDescription,authors,sopType,sopDocID,isAAC
            FROM Sop
            ORDER BY sopID ASC`);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function getSOPbyID(id) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT sopID,sopTitle,sopDescription,authors,sopType,sopDocID,isAAC
            FROM Sop
            WHERE sopID = ?`, [id]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function createSOP(sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            INSERT INTO sop (sopTitle,sopDescription,authors,sopType,sopDocID,isAAC,isRestricted)
            VALUES (?,?,?,?,?,?,?)`, [sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function editSOP(sopID, sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            UPDATE sop
            SET sopTitle = ?, sopDescription = ?, authors = ?, sopType = ?, sopDocID = ?, isAAC = ?, isRestricted = ?
            WHERE sopID = ?`, [sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted, sopID]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function updateMissionORBAT(memberID, memberRole, slotNodeID = null) {
    var message = "";

    try {

        // First, get the latest ORBAT for the mission
        var [rows] = await pool.query(`
            SELECT missionID
            FROM missionorbats
            WHERE dateOfMission > ?`, [new Date().toISOString().slice(0, 19).replace('T', ' ')]);

        var missionID = null;
        if (rows.length > 0) {
            // If there are multiple missions, get the latest one
            missionID = rows[0].missionID;
        }

        // Check if the member is already in the ORBAT
        [rows] = await pool.query(`
            SELECT MemberID
            FROM missionorbatmembers
            WHERE memberID = ? AND missionID = ?`, [memberID, missionID]);

        if (rows.length > 0) {
            // If the member is already in the ORBAT, update their role and slotNodeID

            // If the member is to be unassigned, remove them from the ORBAT
            if (memberRole == "NONE") {
                try {
                    console.log("Unassigning member: " + memberID + " from mission ID: " + missionID);
                    rows = await pool.query(`
                        DELETE FROM missionorbatmembers
                        WHERE memberID = ? AND missionID = ?`, [memberID, missionID]);
                    if (rows[0].affectedRows > 0) {
                        console.log("Member unassigned from the ORBAT for mission ID: " + missionID);
                    }
                    message = "Member sucessfully unassigned from the ORBAT";
                    slotNodeID = -1; // Set slotNodeID to -1 to indicate unassignment
                } catch (error) {
                    console.error("Error unassigning member from ORBAT: " + error);
                    message = "Error unassigning member from ORBAT: " + error.message;
                    slotNodeID = -2; // Set slotNodeID to -2 to indicate error
                }
            }

            // If slotNodeID is null, find the next available slot with the specified role
            if (slotNodeID == null) {
                let slotInfo = await getNextAvailableSlot(memberRole, missionID);
                slotNodeID = slotInfo ? slotInfo.slotNodeID : null;
                var callsign = slotInfo ? slotInfo.callsign : null;
                if (slotNodeID == null) {
                    console.log("No available slot found for member: " + memberID + " with role: " + memberRole);
                    message = "No available slot found for role: " + memberRole;
                    return;
                }

                // Update the member's role and slotNodeID
                rows = await pool.query(`
                    UPDATE missionorbatmembers
                    SET MemberRole = ?, slotNodeID = ?, memberCallsign = ?
                    WHERE memberID = ? AND missionID = ?`, [memberRole, slotNodeID, callsign, memberID, missionID]);
                if (rows[0].affectedRows > 0) {
                    console.log("Updated member role and slotNodeID in the ORBAT for mission ID: " + missionID);
                }
            } else {
                // If slotNodeID is provided, update the member's role and slotNodeID directly
                rows = await pool.query(`
                    UPDATE missionorbatmembers
                    SET slotNodeID = ?, memberCallsign = ?
                    WHERE memberID = ? AND missionID = ?`, [slotNodeID, callsign, memberID, missionID]);
                if (rows[0].affectedRows > 0) {
                    console.log("Updated member role in the ORBAT for mission ID: " + missionID);
                }
            }
        } else {
            console.log("Member " + memberID + " is not in the ORBAT for mission ID: " + missionID);
            // Member is not in the ORBAT
            if (slotNodeID == null) {
                console.log("Finding next available slot for member: " + memberID + " with role: " + memberRole);
                // If slotNodeID is null, find the next available slot with the specified role
                let slotInfo = await getNextAvailableSlot(memberRole, missionID);
                slotNodeID = slotInfo ? slotInfo.slotNodeID : null;
                var callsign = slotInfo ? slotInfo.callsign : null;
                if (slotNodeID == null) {
                    console.log("No available slot found for member: " + memberID + " with role: " + memberRole);
                    message = "No available slot found for role: " + memberRole;
                    return;
                }

                // Insert the member into the ORBAT with the specified role and slotNodeID
                rows = await pool.query(`
                    INSERT INTO missionorbatmembers (memberID, missionID, memberRole, memberCallsign, slotNodeID, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)`, [memberID, missionID, memberRole, callsign, slotNodeID, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
                if (rows[0].affectedRows > 0) {
                    console.log("Inserted member into the ORBAT for mission ID: " + missionID + " with role: " + memberRole + " and slotNodeID: " + slotNodeID);
                }
            } else {
                // If slotNodeID is provided, insert the member into the ORBAT with the specified role and slotNodeID
                rows = await pool.query(`
                    INSERT INTO missionorbatmembers (memberID, missionID, MemberRole, memberCallsign, slotNodeID, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)`, [memberID, missionID, memberRole, callsign, slotNodeID, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
                if (rows[0].affectedRows > 0) {
                    console.log("Inserted member into the ORBAT for mission ID: " + missionID + " with role: " + memberRole + " and slotNodeID: " + slotNodeID);
                }
            }
        }

        // Finally, update the mission ORBAT record
        console.log("Updating mission ORBAT record...");

        rows = await pool.query(`
                        UPDATE missionorbats
                        SET filledSlots = (SELECT COUNT(*) FROM missionorbatmembers WHERE missionID = ?)
                        WHERE missionID = ?`, [missionID, missionID]);

        if (rows[0].affectedRows > 0) {
            console.log("Mission ORBAT record updated successfully for mission ID: " + missionID);
        }
    } catch (error) {
        console.error("Error updating mission ORBAT: " + error);
    } finally {
        // Return the missionID and slotNodeID for further processing if needed, and any message if applicable

        // First check if an error occurred
        if (slotNodeID == -2) {
            return { "message": "Error unassigning member from ORBAT: " + message, "missionID": missionID, "slotNodeID": slotNodeID };
        } else {
            if (message.length > 0) {
                return { "message": message, "missionID": missionID, "slotNodeID": slotNodeID };
            } else {
                return { "missionID": missionID, "slotNodeID": slotNodeID };
            }
        }
    }
}

async function getNextAvailableSlot(memberRole, missionID) {

    var slotNodeID = null;
    var callsign = null;

    // Get all currently filled slotNodeIDs for the mission
    [rows] = await pool.query(`
        SELECT slotNodeID
        FROM missionorbatmembers
        WHERE missionID = ?`, [missionID]);
    var filledNodes = rows.map(row => row.slotNodeID);

    // Now obtain all the possible slotNodeIDs for the mission
    [rows] = await pool.query(`
        SELECT layout
        FROM missionorbattemplates, missionorbats
        WHERE missionorbats.templateID = missionorbattemplates.templateID AND missionorbats.missionID = ?`, [missionID]);

    if (rows.length > 0) {
        console.log("Found mission ORBAT template, parsing layout...");
        // console.log("Layout: " + rows[0].layout);
        var rawJSON = rows[0].layout;

        var layout = unwrapORBATJSON(rawJSON);
        // console.log(layout);

        // Loop through the layout and find all the available nodes for the specified role
        // console.log("Filled Nodes: " + filledNodes);
        for (var node in layout) {
            if (filledNodes.length == 0) {
                // If there are no filled nodes, we can return the first available node that matches the role
                if (layout[node].roleName == memberRole) {
                    console.log("No filled nodes found, returning first available node for role: " + memberRole);
                    slotNodeID = layout[node].id;
                    callsign = layout[node].callsign;
                    break; // Found an available node, no need to continue
                }
            } else if (layout[node].roleName == memberRole && !filledNodes.includes(layout[node].id)) {
                // If the node is available and matches the role, set it as the available node
                console.log("Found available node for role: " + memberRole + " with ID: " + layout[node].id);
                slotNodeID = layout[node].id;
                callsign = layout[node].callsign;
                break; // Found an available node, no need to continue
            }
        }

        // If no available node was found, set slotNodeID to null
        if (slotNodeID == null) {
            console.log("No available slot found for role: " + memberRole);
            return { "message": "No available slot found for role: " + memberRole, "slotNodeID": null, "callsign": null };
        } else {
            // Found an available node, return the slotNodeID
            console.log("Found available slotNodeID: " + slotNodeID + " for role: " + memberRole);
            return { "slotNodeID": slotNodeID, "callsign": callsign };
        }
    }
}

function unwrapORBATJSON(data) {
    var newData = [];
    for (const item of data) {
        var newItem = {
            "id": item.id,
            "roleName": item.roleName,
            "callsign": item.callsign,
            "parentNodeId": item.parentNode
        };

        // If the item has subordinates, map them recursively
        if (item.subordinates) {
            if (item.subordinates.length > 0) {
                let subs = unwrapORBATJSON(item.subordinates);
                for (const sub of subs) {
                    newData.push(sub);
                }
            }
        }

        newData.push(newItem);
    }

    return newData;
}

async function getLiveOrbat() {
    // This function will return the live ORBAT for the latest mission
    var rows = [null];
    var message = "";
    try {
        // Get the latest mission ORBAT template that is scheduled for the future
        [rows] = await pool.query(`
            SELECT missionorbattemplates.layout, missionorbats.missionID, missionorbats.dateOfMission
            FROM missionorbats, missionorbattemplates
            WHERE missionorbats.templateID = missionorbattemplates.templateID AND 
            missionorbats.dateOfMission > ?`, [new Date().toISOString().slice(0, 19).replace('T', ' ')]);

        console.log("Found live ORBAT for mission ID: " + rows[0].missionID + " on date: " + rows[0].dateOfMission);
        // Unwrap the ORBAT JSON layout
        var layout = await unwrapORBATJSON(rows[0].layout);

        message = "ORBAT OUT--.";
        message += "\nParsed Layout: " + layout;
        message += "\nRaw Layout: " + JSON.stringify(rows[0].layout);
        message += "\nRaw Rows: " + JSON.stringify(rows);
        console.warn(message);

        if (layout.length == 0) {
            console.log("No layout found for the live ORBAT");
            return {
                missionID: -1,
                dateOfMission: -1,
                layout: [],
                message: "No layout found for the live ORBAT"
            };
        }

        // Now get the members that are in the ORBAT for the mission
        var [members] = await pool.query(`
            SELECT Members.MemberID, Members.UName, Ranks.prefix, missionorbatmembers.memberRole, missionorbatmembers.slotNodeID
            FROM Members, missionorbatmembers, Ranks
            WHERE Members.MemberID = missionorbatmembers.memberID AND missionorbatmembers.missionID = ? AND
            Members.playerRank = Ranks.rankID`, [rows[0].missionID]);

        // Now combine the layout with the members
        for (var i = 0; i < layout.length; i++) {
            // Find the member that matches the slotNodeID
            for (var j = 0; j < members.length; j++) {
                if (layout[i].id == members[j].slotNodeID) {
                    // If a match is found, add the member details to the layout
                    layout[i].memberID = members[j].MemberID;
                    layout[i].playerName = members[j].UName;
                    layout[i].memberRole = members[j].memberRole;
                    layout[i].rankPrefix = members[j].prefix;
                    layout[i].filled = true; // Mark this node as filled
                    break; // No need to continue searching for this node
                }
            }
        }

        // Return the live ORBAT layout with member details
        if (message.length > 0) {
            return {
                missionID: rows[0].missionID,
                dateOfMission: rows[0].dateOfMission,
                layout: layout,
                message: message
            };
        }
        return {
            missionID: rows[0].missionID,
            dateOfMission: rows[0].dateOfMission,
            layout: layout
        };
    }
    catch (error) {
        console.error("Error getting live ORBAT: " + error);
        return null;
    }
}

async function getMemberSlotInfoFromOrbat(memberID) {
    // This function will return the member's role in the next scheduled ORBAT
    var rows = [null];
    var memberRole;
    var slotNodeID;
    var memberCallsign;

    try {
        // Get the missionID of the next scheduled ORBAT
        [rows] = await pool.query(`
            SELECT missionID, missionorbattemplates.composition
            FROM missionorbats, missionorbattemplates
            WHERE dateOfMission > ? AND missionorbats.templateID = missionorbattemplates.templateID`, [new Date().toISOString().slice(0, 19).replace('T', ' ')]);
        if (rows.length == 0) {
            console.log("No upcoming missions found for ORBAT");
            return null;
        }

        var composition = rows[0].composition;
        if (composition == null || composition == "") {
            console.log("No ORBAT composition found for mission ID: " + rows[0].missionID);
            composition = "No composition available";
        }
        var missionID = rows[0].missionID;
        // Now get the member's role in the ORBAT for the mission
        [rows] = await pool.query(`
            SELECT memberRole, slotNodeID, memberCallsign
            FROM missionorbatmembers
            WHERE memberID = ? AND missionID = ?`, [memberID,
            missionID]);
        if (rows.length == 0) {
            console.log('Member: not found in ORBAT for mission ID: ' + missionID);
            memberRole = "Not Selected";
            memberCallsign = "Not Assigned";
            slotNodeID = null;
        } else {
            memberRole = rows[0].memberRole;
            slotNodeID = rows[0].slotNodeID;
            memberCallsign = rows[0].memberCallsign;
        }
        // Return the member's role and slotNodeID
        return {
            "memberRole": memberRole,
            "slotNodeID": slotNodeID,
            "memberCallsign": memberCallsign,
            "composition": composition
        };

    } catch (error) {
        console.log("Error getting member role from ORBAT: " + error);
        return null;
    }
}

async function getMissions() {
    // This function will return all the missions held in the database
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT missionID, dateOfMission, missionorbats.templateID, composition, filledSlots, size
            FROM missionorbats
            LEFT JOIN missionorbattemplates
            ON missionorbats.templateID = missionorbattemplates.templateID
            ORDER BY dateOfMission DESC`);
    }
    catch (error) {
        console.log("Error getting missions: " + error);
        return null;
    }
    if (rows.length == 0) {
        console.log("No missions found in the database");
        return null;
    }

    // Return the missions
    return rows.map(row => ({
        "missionID": row.missionID,
        "missionName": row.missionName,
        "dateOfMission": row.dateOfMission,
        "templateID": row.templateID,
        "composition": row.composition,
        "size": row.size,
        "filledSlots": row.filledSlots
    }));
}

async function getMissionCompositions() {
    // This function will return all the compositions held in the database
    var rows = [null];
    try {
        var response = [];
        [rows] = await pool.query(`
            SELECT DISTINCT composition, templateID
            FROM missionorbattemplates`);

        if (rows.length == 0) {
            console.log("No compositions found in the database");
            return null;
        }

        return rows.map(row => {
            return {
                "composition": row.composition,
                "templateID": row.templateID
            };
        });
    }
    catch (error) {
        console.log("Error getting compositions: " + error);
        return null;
    }
}

async function patchMissions(missionID, templateID, dateOfMission) {
    // This function will either update the mission with the given composition and dateOfMission if it exists,
    // or create a new mission with the given composition and dateOfMission if it does not

    var rows = [null];
    try {
        let doesNotExist = true;

        var missionDate = new Date(dateOfMission);
        var missionDateString = missionDate.toISOString().slice(0, 19).replace('T', ' ');

        // Check if the mission already exists
        [rows] = await pool.query(`
                SELECT missionID
                FROM missionorbats
                WHERE missionID = ?`, [missionID]);

        if (rows.length > 0) {
            // Mission exists, update it
            doesNotExist = false;
            console.log("Updating existing mission with ID: " + rows[0].missionID);
            rows = await pool.query(`
                        UPDATE missionorbats
                        SET templateID = ?, dateOfMission = ?
                        WHERE missionID = ?`, [templateID, missionDateString, missionID]);

            if (rows[0].affectedRows > 0) {
                console.log("Mission updated successfully with ID: " + missionID);
            }
        }
        if (doesNotExist) {

            // Mission does not exist, create a new one
            console.log("Creating new mission with date: " + dateOfMission);

            // Format dateOfMission to UTC format for MySQL
            var dateOfMissionUTC = new Date(dateOfMission).toISOString().slice(0, 19).replace('T', ' ');

            rows = await pool.query(`
                            INSERT INTO missionorbats (templateID, filledSlots, dateOfMission)
                            VALUES (?, 0, ?)`, [templateID, dateOfMissionUTC]);

            if (rows[0].affectedRows > 0) {
                console.log("New mission created with ID: " + rows[0].insertId);
            }
        }
    } catch (error) {
        console.log("Error patching missions: " + error);
        return null;
    } finally {
        return rows;
    }
}

async function deleteMission(missionID) {
    // This function will delete a mission from the database
    var rows = [null];

    try {
        rows = await pool.query(`
            DELETE FROM missionorbats
            WHERE missionID = ?`, [missionID]);

        if (rows[0].affectedRows > 0) {
            console.log("Mission with ID: " + missionID + " deleted successfully");
            return rows[0].affectedRows;
        }
    } catch (error) {
        console.error("Error deleting mission: " + error);
        return null;
    }
}

function daysUntilNext13th() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Set the 15th of this month
    let thirteenth = new Date(year, month, 13);

    // If today is past the 15th, move to next month
    if (today > thirteenth) {
        thirteenth = new Date(year, month + 1, 13);
    }

    // Calculate the difference in milliseconds and convert to days
    const oneDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((thirteenth - today) / oneDay);

    return diffDays;
}

async function getDashboardData() {
    // The dashboard data is a combination of the following:
    // 1. The number of members eligible for the next rank
    // 2. The member that is closest to the next rank
    // 3. The number of members that are active
    // 4. The number of members that are on LOA
    // 5. The number of members that are recruits
    // 6. The due date of the next server payment
    // 7. The number of members that are leaders
    // 8. The number of mission replays that are available
    // 9. The next scheduled training
    // 10. The next scheduled mission

    // Query 1 - Get the number of members eligible for the next rank
    // Query 2 - Get the member that is closest to the next rank
    var rows = await getMembers(false);
    var eligible = 0;
    var difference = -1;
    var nextEligibleMember = null;
    var memberPromos = [];

    // Loop through the members and check if they are eligible for the next rank

    for (var row of rows) {

        // console.log("Checking member: " + row.UName + " with rank: " + row.rankName + " and events attended: " + row.numberOfEventsAttended);

        // Check for Recruits working towards Private
        if (row.rankName == "Recruit") {
            if (row.numberOfEventsAttended >= 4) {
                // If the member is a Recruit and has attended at least 4 events, they are eligible for the next rank
                eligible++;
            }
            if (((Math.abs(row.numberOfEventsAttended - 4)) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(row.numberOfEventsAttended - 4);
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }
            memberPromos.push({
                "UName": row.UName,
                "rankName": row.rankName,
                "numberOfEventsAttended": row.numberOfEventsAttended,
                "nextRank": "Private",
                "eventsToGo": Math.abs(row.numberOfEventsAttended - 4),
                "memberStatus": row.playerStatus
            });
        }

        // Check for Private ranks working towards Private Second Class
        if (row.rankName == "Private") {
            if (row.numberOfEventsAttended >= 30) {
                // If the member is a Private and has attended at least 30 events, they are eligible for the next rank
                eligible++;
                // console.log("Member " + row.UName + " is eligible for the next rank");
            }

            if ((Math.abs(row.numberOfEventsAttended - 30) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(row.numberOfEventsAttended - 30);
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }
            var eventsToGo = Math.abs(row.numberOfEventsAttended - 30);

            // Filter out members that are still a long way from the next rank
            if (eventsToGo < 20) {
                memberPromos.push({
                    "UName": row.UName,
                    "rankName": row.rankName,
                    "numberOfEventsAttended": row.numberOfEventsAttended,
                    "nextRank": "Private Second Class",
                    "eventsToGo": Math.abs(row.numberOfEventsAttended - 30),
                    "memberStatus": row.playerStatus
                });
            }
        }

        // Check for Private Second Class ranks working towards Private First Class
        if (row.rankName == "Private Second Class") {
            if (row.numberOfEventsAttended >= 60) {
                // If the member is a Private Second Class and has attended at least 60 events, they are eligible for the next rank
                eligible++;
                console.log("Member " + row.UName + " is eligible for the next rank");
            }

            if ((Math.abs(row.numberOfEventsAttended - 60) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(row.numberOfEventsAttended - 60);
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }

            var eventsToGo = Math.abs(row.numberOfEventsAttended - 60);

            // Filter out members that are still a long way from the next rank
            if (eventsToGo < 20) {
                memberPromos.push({
                    "UName": row.UName,
                    "rankName": row.rankName,
                    "numberOfEventsAttended": row.numberOfEventsAttended,
                    "nextRank": "Private First Class",
                    "eventsToGo": Math.abs(row.numberOfEventsAttended - 60),
                    "memberStatus": row.playerStatus
                });
            }
        }
    }

    // Query 3 + 4 - Get the number of members that are active + on LOA

    var activeMembers = rows.filter(member => member.playerStatus == "Active").length;
    var leaveMembers = rows.filter(member => member.playerStatus == "LOA").length;

    var loaResponse = await embeds.getMemberLOAsFromAPI();
    var memberLOAs = [];

    // Populate the memberLOAs array with the LOA data and lookup the member's name from the database
    for (var loa of loaResponse) {
        try {
            // Get the member's name from the database
            var [member] = await pool.query('SELECT UName, playerStatus, playerRank FROM Members, Attendance WHERE MemberDiscordID = ? AND Members.MemberID = Attendance.MemberID', [loa.memberId]);

            // console.log("Member LOA", member);
            // console.log("Player Rank", member[0].playerRank);

            if (member.length == 0) {
                // If the member's rank is null or undefined, skip this member
                console.log("Member " + loa.memberId + " either has no rank assigned, or is a reservist, skipping...");
                continue;
            }
            var rankName = await getRankByID(member[0].playerRank);
            var startDate = new Date(loa.startDate).toISOString().slice(0, 19).replace('T', ' ');
            var endDate = new Date(loa.endDate).toISOString().slice(0, 19).replace('T', ' ');
            if (member.length > 0) {
                memberLOAs.push({
                    "UName": member[0].UName,
                    "playerStatus": member[0].playerStatus,
                    "rankName": rankName.rankName,
                    "startDate": startDate,
                    "endDate": endDate
                });
            }
        } catch (error) {
            console.log("Error getting member name for LOA: " + loa.memberName + " - " + error);
        }
    }

    // Sort the memberLOAs by end date
    memberLOAs.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    // console.log("Active Members: " + activeMembers);
    // console.log("Leave Members: " + leaveMembers);

    // Query 5 - Get the number of members that are recruits
    var recruits = rows.filter(member => member.rankName == "Recruit").length;

    // console.log("Recruits: " + recruits);

    // Query 6 - Get the due date of the next server payment
    var nextPaymentDue = daysUntilNext13th();


    // Query 7 - Get the number of members that are leaders
    var leaders = rows.filter(member => (["Corporal", "Sergeant", "Second Lieutenant", "First Lieutenant"].indexOf(member.rankName) > -1)).length;

    // console.log("Leaders: " + leaders);

    // Query 8 - Get the number of mission replays that are available
    // To be implemented at a later date - this will be caluclated from a new table that will be created


    // FOR QUERIES 9 AND 10, They are temporarily commented out until their outputs can be cached in the database, this should reduce the load on the API and speed up the dashboard loading time

    // Query 9 - Get the next scheduled training
    // Using the API to get the next scheduled training
    // var nextTraining = await embeds.getNextTraining();
    var nextTraining = {
        "name": "TBA",
        "date": "2023-10-01T18:00:00Z",
        "time": "18:00 UTC"
    };

    // Query 10 - Get the next scheduled mission
    // Using the API to get the next scheduled mission
    // var nextMission = await embeds.getNextMission();
    var nextMission = {
        "name": "TBA",
        "date": "2023-10-01T18:00:00Z",
        "time": "18:00 UTC"
    };

    // console.log("Next Mission: " + nextMission.name);

    var dashboardData = {
        "promotions": eligible,
        "nextPromotion": nextEligibleMember,
        "activeMembers": activeMembers,
        "leaveMembers": leaveMembers,
        "recruits": recruits,
        "nextTraining": nextTraining,
        "nextMission": nextMission,
        "leaders": leaders,
        "memberPromotions": memberPromos,
        "memberLOAs": memberLOAs,
        "nextPaymentDue": nextPaymentDue
    }

    return dashboardData;
}


module.exports = {
    getMembers, getFullMemberInfo, getMember, deleteMember, updateMember,
    getMemberBadges, getMembersAssignedToBadge, getBadges, getBadge, getVideos, getRanks, getRankByID, getComprehensiveRanks,
    changeRank, performLogin, getMemberAttendance, updateMemberAttendance, updateMemberLOAs,
    getPool, closePool, performRegister, getUserRole, getUserMemberID, createMember, getDashboardData, getMemberLOA,
    getSeniorMembers, updateBadge, getAllBadgePaths, assignBadgeToMembers, removeBadgeFromMembers, resetPassword, getSOPs, getSOPbyID,
    createSOP, editSOP, updateMissionORBAT, getLiveOrbat, getMemberSlotInfoFromOrbat, getMissions, getMissionCompositions, patchMissions, deleteMission
};