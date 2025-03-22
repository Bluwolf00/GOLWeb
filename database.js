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

        var info = await embeds.getInfoFromAPI();
        var videos = await embeds.addVideosDuration(info);

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

module.exports = { getMembers, getMember, getMemberBadges, getBadges, getVideos };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }