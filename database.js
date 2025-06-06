const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const embeds = require('./embeds.js');
const fs = require('fs');
dotenv.config()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()


function getPool() {
    return pool;
}
// const result = await pool.query('SELECT * FROM Members')

async function getMembers(includeParentName = false) {
    var rows = [null];
    var query = '';
    if (includeParentName == true) {
        query = 'SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank ORDER BY m.MemberID ASC'
    } else {
        query = 'SELECT Members.MemberID,UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick,playerStatus,thursdays,sundays,numberOfEventsAttended FROM Ranks,Members LEFT JOIN Attendance ON Members.MemberID = Attendance.MemberID WHERE Members.playerRank = Ranks.rankID';
    }
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query(query);
    } catch (error) {
        console.log(error);
    }
    return rows
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

async function getMemberParent(memberName) {
    var rows = [null];
    try {
        [rows] = await pool.query(`
            SELECT parentNodeId
            FROM Members
            WHERE UName = ?`, [memberName])
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        }
        return rows[0].parentNodeId;
    }
}

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

async function updateMember(memberID, memberName, rank, country, parentName, status, dateOfJoin, dateOfPromo) {
    var rows = [null];
    try {

        // Get the parent node ID from the name
        // If the parent name is "None" AKA the top element, set the parent node ID to "root"
        var parentNodeId = "root";
        if (parentName.toString() !== "None") {
            parentNodeId = await getMemberNodeId(parentName);
            console.log("Parent Name: " + parentName);
            console.log("Parent Node ID: " + parentNodeId);
        }
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

        if (parentNodeId == null) {parentNodeId = "root";}

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

async function getVideos() {
    var rows = null;
    var flag = false;

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
                SELECT username,password
                FROM users
                WHERE username = ?`, [username]);
        } catch (error) {
            console.log(error);
        } finally {
            if (rows.length == 0) {
                return null;
            } else if (typeof rows == "undefined" || typeof rows == "null" || rows == null) {
                return null;
            } else {
                if (rows[0].password)
                    return rows;
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
                    if (attendanceRecords[j].memberName == formatName) {
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
    // This will be implmeneted when the ADMIN Branch is merged with the main branch, as the main branch contains the updated attendance records

    // Query 2 - Get the member that is closest to the next rank
    // This will be implmeneted when the ADMIN Branch is merged with the main branch, as the main branch contains the updated attendance records

    // Query 3 + 4 - Get the number of members that are active + on LOA
    var rows = await getMembers(true);

    var activeMembers = rows.filter(member => member.playerStatus == "Active").length;
    var leaveMembers = rows.filter(member => member.playerStatus == "LOA").length;

    // console.log("Active Members: " + activeMembers);
    // console.log("Leave Members: " + leaveMembers);

    // Query 5 - Get the number of members that are recruits
    var recruits = rows.filter(member => member.rankName == "Recruit").length;

    // console.log("Recruits: " + recruits);

    // Query 6 - Get the due date of the next server payment
    // To be implemented at a later date - this will be caluclated from a new table that will be created

    // Query 7 - Get the number of members that are leaders
    var leaders = rows.filter(member => (["Corporal","Sergeant","Second Lieutenant","First Lieutenant"].indexOf(member.rankName) > -1)).length;

    // console.log("Leaders: " + leaders);

    // Query 8 - Get the number of mission replays that are available
    // To be implemented at a later date - this will be caluclated from a new table that will be created

    // Query 9 - Get the next scheduled training
    // Using the API to get the next scheduled training
    var nextTraining = await embeds.getNextTraining();

    // console.log("Next Training: " + nextTraining);

    // Query 10 - Get the next scheduled mission
    // Using the API to get the next scheduled mission
    var nextMission = await embeds.getNextMission();

    // console.log("Next Mission: " + nextMission);

    var dashboardData = {
        "activeMembers": activeMembers,
        "leaveMembers": leaveMembers,
        "recruits": recruits,
        "nextTraining": nextTraining,
        "nextMission": nextMission,
        "leaders": leaders
    }
    
    return dashboardData;
}


module.exports = { getMembers, getFullMemberInfo, getMember, deleteMember, updateMember,
    getMemberBadges, getMembersAssignedToBadge, getBadges, getBadge, getVideos, getRanks,
    changeRank, performLogin, getMemberAttendance, updateMemberAttendance, updateMemberLOAs,
    getPool, performRegister, getUserRole, createMember, getDashboardData, getMemberLOA,
    getSeniorMembers, updateBadge, getAllBadgePaths, assignBadgeToMembers, removeBadgeFromMembers };