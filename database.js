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
        [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID')
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

    // If the last update was more than an hour ago or the field is empty, re update the videos from the API
    // Null check before checking the last update time to prevent errors
    if (rows.length == 0) {
        flag = true;
    } else {
        if (rows[0].last_update < (new Date().getTime() - 3600000)) {
            flag = true;
        }
    }

    if (flag) {
        embeds.getInfoFromAPI().then((videos) => {
            embeds.addVideosDuration(videos).then((videos) => {

                // Clear the table
                pool.query('DELETE FROM ytvideos');
                
                var currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                var sql = 'INSERT INTO ytvideos (title, thumbUrl, videoId, videoUrl, duration, author, last_update) VALUES ?';
                var vals = [
                    [videos.video1.title, videos.video1.thumbnail, videos.video1.videoId, videos.video1.url, videos.video1.duration, videos.video1.author, currentTime],
                    [videos.video2.title, videos.video2.thumbnail, videos.video2.videoId, videos.video2.url, videos.video2.duration, videos.video2.author, currentTime],
                    [videos.video3.title, videos.video3.thumbnail, videos.video3.videoId, videos.video3.url, videos.video3.duration, videos.video3.author, currentTime]
                ];
                pool.query(sql, [vals]);
            })
        }).catch((error) => {
            console.log("API: " + error);
        })
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

    try {
        [rows] = await pool.query(`
            SELECT numberOfEventsAttended, MemberDiscordID
            FROM Attendance,Members
            WHERE Members.UName = ? AND Members.MemberID = Attendance.MemberID`, [name]);

        // console.log("DATABASE: " + rows);
    } catch (error) {
        console.log(error);
    }

    // console.log("DATABASE: " + rows[0].MemberDiscordID);
    // console.log("DATABASE LENGTH: " + rows.length);

    if (rows.length == 0) {
        // Fallback in case the member has no attendance data
        // console.log("FALLBACK: " + name);
        console.log(`Player, ${name}, not found in database, fetching from API...`);

        var attendanceRecords = await embeds.getMemberAttendanceFromAPI();

        // var record = attendanceRecords.find((element) => {
        //     if (element.name == name) {
        //         rows = [{ numberOfEventsAttended: element.attendance }];
        //     }
        // });

        var record;

        for (var i = 0; i < attendanceRecords.length; i++) {
            // console.log("API RECORD: " + attendanceRecords[i].name);
            // console.log("PLAYER NAME: " + name);
            if (attendanceRecords[i].name.search(name) != -1) {
                record = attendanceRecords[i];
                break;
            }
        }

        var events = record.attended;
        var discordId = record.id;

        // Get the member's ID
        var [response] = await pool.query('SELECT MemberID FROM Members WHERE UName = ?', [name]);
        var id = response[0].MemberID;

        // Insert the new member into the database
        var success = await pool.query('INSERT INTO Attendance (MemberID, MemberDiscordID, numberofEventsAttended) VALUES (?,?,?)', [id, discordId, events]);

        [rows] = await pool.query(`
            SELECT numberOfEventsAttended, MemberDiscordID
            FROM Attendance,Members
            WHERE Members.UName = ? AND Members.MemberID = Attendance.MemberID`, [name]
        );
    }

    /* Returns:
    /* {
    /* numberOfEventsAttended : #,
    /* MemberDiscordID : ''
    /* }
    */
    return rows[0];
}


module.exports = { getMembers, getMember, getMemberBadges, getBadges, getVideos, getRanks, changeRank, performLogin, getMemberAttendance };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }