const mysql = require('mysql2');

const dotenv = require('dotenv');
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
module.exports = { getMembers, getMember, getMemberBadges, getBadges };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }