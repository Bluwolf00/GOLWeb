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
    const [rows] = await pool.query('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID')
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
module.exports = { getMembers, getMember };


// async function getMember(name) {
//     const rows = await pool.query(`
//         SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,status
//         FROM Members,Ranks
//         WHERE Members.Rank = Ranks.rankID AND UName = ?`, [name])
//     return rows[0]
// }