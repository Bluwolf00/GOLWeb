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
    [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID')
    try {
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
    const rows = [null];
    
    try {
        [rows] = await pool.query('SELECT * FROM ytvideos')
        
    } catch (error) {
        console.log("DATABASE: " + error);
        return rows
    }

    try {
        // If the last update was more than an hour ago or the field is empty, re update the videos from the API
        if (rows[0].last_update === null || rows[0].last_update < (new Date().getTime() - 3600000)) {
            embeds.getInfoFromAPI().then((videos) => {
                embeds.addVideosDuration(videos).then((videos) => {
                    pool.query('INSERT INTO ytvideos VALUES ?', {
                        video1_title: videos.video1.title,
                        video1_thumbnail: videos.video1.thumbnail,
                        video1_id: videos.video1.videoId,
                        video1_url: videos.video1.url,
                        video1_duration: videos.video1.duration,
                        video2_title: videos.video2.title,
                        video2_thumbnail: videos.video2.thumbnail,
                        video2_id: videos.video2.videoId,
                        video2_url: videos.video2.url,
                        video2_duration: videos.video2.duration,
                        video3_title: videos.video3.title,
                        video3_thumbnail: videos.video3.thumbnail,
                        video3_id: videos.video3.videoId,
                        video3_url: videos.video3.url,
                        video3_duration: videos.video3.duration,
                        last_update: new Date().getTime()
                    })
                })
            })
        }
    } catch (error) {
        console.log("API: " + error);
    }

    return rows
}

module.exports = { getMembers, getMember, getMemberBadges, getBadges, getVideos };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }