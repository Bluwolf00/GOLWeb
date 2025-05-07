const mysql = require('mysql2');

const dotenv = require('dotenv');
const embeds = require('./embeds.js');
dotenv.config()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()

// const result = await pool.query('SELECT * FROM Members')

async function getMembers() {
    var rows = [null];
    try {
        // [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick,status,numberOfEventsAttended FROM Ranks,Members LEFT JOIN Attendance ON Members.MemberID = Attendance.MemberID WHERE Members.Rank = Ranks.rankID');
    } catch (error) {
    }
    return rows
}

async function getMember(name) {
    var rows = [null];
    try {
        rows = await pool.query(`
            SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
            FROM Members,Ranks
            WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0]
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

async function getRanks(aboveOrBelow, currentRank) {
    var rows = null;
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
            SET Members.Rank = (SELECT rankID FROM Ranks WHERE prefix = ?)
            WHERE UName = ?`, [newRank, member]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows
    }
}

async function performLogin(username, password, fallback) {

    if (!fallback) {
        var rows = null;
        try {
            rows = await pool.query(`
                SELECT UName,Password
                FROM Admins
                WHERE UName = ? AND Password = ?`, [username, password]);
        } catch (error) {
            console.log(error);
        } finally {
            return rows
        }
    } else {
        if (username == process.env.ADMIN_USERNAME && password == process.env.ADMIN_PASSWORD) {
            return true;
        } else {
            return false;
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


module.exports = { getMembers, getMember, getMemberBadges, getBadges, getVideos, getRanks, changeRank, performLogin, getMemberAttendance };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }