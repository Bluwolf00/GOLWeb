const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const embeds = require('./embeds.js');
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

async function getMembers() {
    var rows = [null];
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query('SELECT Members.MemberID,UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick,DateOfJoin,DateOfPromo,playerStatus,numberOfEventsAttended FROM Ranks,Members LEFT JOIN Attendance ON Members.MemberID = Attendance.MemberID WHERE Members.playerRank = Ranks.rankID ORDER BY Members.MemberID ASC');
    } catch (error) {
    }
    return rows
}

async function getFullMembers() {
    var rows = [null];
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query('SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank ORDER BY m.MemberID ASC');
    } catch (error) {
    }
    return rows
}

async function getFullMemberInfo(memberID) {
    var rows = [null];
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query('SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank AND m.MemberID = ? ORDER BY m.MemberID ASC', [memberID]);
    } catch (error) {
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
        if (!parentName == "None") {
            parentNodeId = await getMemberParent(parentName);
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
    const [rows] = await pool.query('SELECT badgeName,badgePath,isQualification,badgeDescription FROM Badges ORDER BY isQualification,badgeName ASC')
    return rows
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
            rows = await pool.query(`
                SELECT rankName, prefix
                FROM Ranks
                WHERE rankID < (SELECT rankID FROM Ranks WHERE rankName = ?)
                ORDER BY rankID DESC`, [currentRank]);
        } else {
            rows = await pool.query(`
                SELECT rankName, prefix
                FROM Ranks
                WHERE rankID > (SELECT rankID FROM Ranks WHERE rankName = ?)
                ORDER BY rankID ASC`, [currentRank]);
        }
    }
    return rows;
}

// Remember to fix the ranks order in the database as pv2 is higher than pv1

// POST REQUESTS
async function changeRank(member, newRank) {
    var rows = null;
    try {
        console.log("MEMBER: " + member);
        console.log("NEW RANK: " + newRank);
        rows = await pool.query(`
            UPDATE Members
            SET Members.playerRank = (SELECT rankID FROM Ranks WHERE prefix = ?)
            WHERE UName = ?`, [newRank, member]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function performLogin(username, password, fallback) {

    if (!fallback) {
        var rows = [null];
        try {
            [rows] = await pool.query(`
                SELECT username,password
                FROM Users
                WHERE username = ?`, [username]);
        } catch (error) {
            console.log(error);
        } finally {
            if (rows.length == 0) {
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
            INSERT INTO Users (username,password,role)
            VALUES (?,?,"member")`, [username, password]);
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
            FROM Users
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
    var res = null;

    try {
        [rows] = await pool.query(`
            SELECT numberOfEventsAttended, MemberDiscordID, lastUpdate
            FROM Attendance,Members
            WHERE Members.UName = ? AND Members.MemberID = Attendance.MemberID`, [name]);

        // console.log("DATABASE: " + rows);
    } catch (error) {
        console.log(error);
    }

    // console.log("DATABASE: " + rows[0].MemberDiscordID);
    // console.log("DATABASE LENGTH: " + rows.length);

    var attendanceRecords;

    if (rows.length == 0) {
        // Fallback in case the member has no attendance data
        // console.log("FALLBACK: " + name);
        console.log(`Player, ${name} not on record, fetching from API...`);
        attendanceRecords = await embeds.getMemberAttendanceFromAPI();

        res = await performEventsDBConn(attendanceRecords, name, insertOrUpdate = "insert");
    } else {
        var calcTime = new Date().getTime().valueOf() - (3600000 * 24);
        var lastUpdateInt = Date.parse(rows[0].lastUpdate).valueOf();

        // If the last update was more than a day ago, update the attendance data
        if (lastUpdateInt < calcTime) {

            console.log("Updating attendance data for " + name);
            attendanceRecords = await embeds.getMemberAttendanceFromAPI();

            res = await performEventsDBConn(attendanceRecords, name, insertOrUpdate = "update");
        } else {
            console.log("Attendance data for " + name + " is up to date, Fetching from DB...");
            // If the last update was less than a day ago, just return the current attendance data
            res = await performEventsDBConn(attendanceRecords, name, insertOrUpdate = "normal");
        }
    }

    var rqResponse = {
        "numberOfEventsAttended": res.numberOfEventsAttended,
        "insertStatus": res.success
    }

    return rqResponse;
}

async function performEventsDBConn(attendanceRecords, name, insertOrUpdate) {
    var record;
    var events;

    if (insertOrUpdate != "normal") {
        for (var i = 0; i < attendanceRecords.length; i++) {
            if (attendanceRecords[i].name.search(name) != -1) {
                record = attendanceRecords[i];
                events = record.attended;
                break;
            }
        }

        if (!record) {
            // console.log("Member found in attendance records: " + name);
            console.log("Member not found in attendance records: " + name);
            events = 0;
        }
    }


    // Get the member's ID
    var [response] = await pool.query('SELECT MemberID FROM Members WHERE UName = ?', [name]);
    var id = response[0].MemberID;
    var currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // var currentTime = new Date().getTime().valueOf();
    var success = null;

    if (insertOrUpdate == "normal") {
        // Do nothing, just return the current attendance data
        success = false;
    } else {
        if (insertOrUpdate == "insert") {
            // Insert the new member into the database
            var discordId = record.id;
            success = await pool.query('INSERT INTO Attendance (MemberID, MemberDiscordID, numberofEventsAttended, lastUpdate) VALUES (?,?,?,?)', [id, discordId, events, currentTime]);
        }
        else {
            if (insertOrUpdate == "update") {
                // Update the member's attendance in the database
                success = await pool.query('UPDATE Attendance SET numberofEventsAttended=?, lastUpdate=? WHERE MemberID=?', [events, currentTime, id]);
            }
        }
    }

    [rows] = await pool.query(`
                SELECT numberOfEventsAttended, MemberDiscordID
                FROM Attendance,Members
                WHERE Members.UName = ? AND Members.MemberID = Attendance.MemberID`, [name]
    );

    var res = {
        "numberOfEventsAttended": rows[0].numberOfEventsAttended,
        "insertStatus": success
    }

    return res;
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
    var rows = await getFullMembers();

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


module.exports = { getMembers, getFullMembers, getFullMemberInfo, getMember, deleteMember, updateMember, getMemberBadges, getBadges, getVideos, getRanks, changeRank, performLogin, getMemberAttendance, getPool, performRegister, getUserRole, createMember, getDashboardData };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }