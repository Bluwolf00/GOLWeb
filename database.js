const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const embeds = require('./embeds.js');
const fs = require('fs');
dotenv.config()

var pool;
var activeConns = 0; // Track the number of active connections

function establishPool() {
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        timezone: 'Z', // Set timezone to UTC
        connectionLimit: 14 // Set the maximum number of connections in the pool

    }).promise(); // Use promise-based API for async/await

    pool.on('connection', (connection) => {
        // console.log("INFO:  Database connection established with ID: " + connection.threadId);
        process.stdout.write(`\x1b[34mINFO: Database connection established: ${connection.threadId}\x1b[0m\n`);
        activeConns++;
        process.stdout.write(`\x1b[34mINFO: Database Active Connections: ${activeConns}\x1b[0m\n`);
    });

    // pool.on('release', (connection) => {
    //     // console.error("ERROR:  Database connection error: " + error);
    //     process.stderr.write(`\x1b[31mINFO: Database connection released: ${connection.threadId}\x1b[0m\n`);
    // });

    // pool.on('acquire', (connection) => {
    //     // console.log("INFO:  Database connection acquired with ID: " + connection.threadId);
    //     process.stdout.write(`\x1b[33mINFO: Database connection acquired: ${connection.threadId}\x1b[0m\n`);
    // });

    return pool;
}

establishPool();

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

async function queryDatabase(query, params = []) {
    // This function is used to query the database with a prepared statement
    // It returns the rows returned by the query
    var rows = [null];
    var conn = null;
    try {
        // var conn = await pool.getConnection();
        rows = await pool.query(query, params);

        if (rows[0] === null) {
            console.warn("No rows returned for query:", query, "with params:", params);
        }
    } catch (error) {
        console.error("ERROR: " + error, "Query: " + query, "Params: ", params);

        if (error.code === 'ER_CON_COUNT_ERROR') {
            // Connection limit exceeded
            // Flush the database connections

            await pool.end();
            establishPool();
        }
    } finally {
        if (typeof conn !== 'undefined' && conn !== null) {
            conn.destroy(); // Destroy the connection to not leak resources
            conn = null; // Set conn to null to prevent further use
        }
        return rows;
    }
}

// const result = await queryDatabase('SELECT * FROM Members')

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
        query = `SELECT Members.MemberID,UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick,playerStatus,thursdays,sundays FROM Ranks,Members WHERE Members.playerRank = Ranks.rankID ${orderBy}`;
    }
    try {
        [rows] = await queryDatabase(query);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function getFullMemberInfo(memberID) {
    var rows = [null];
    try {
        // [rows] = await queryDatabase('SELECT UName,rankName,rankPath,Country,nodeId,parentNodeId,Nick FROM Members,Ranks WHERE Members.Rank = Ranks.rankID');
        [rows] = await queryDatabase('SELECT m.MemberID,m.UName,rankName,m.Country,m.DateOfJoin,m.DateOfPromo,m.Nick,m.nodeId,m.parentNodeId,p.UName AS parentUName,m.playerStatus FROM Ranks,Members m LEFT JOIN Members p ON m.parentNodeId = p.nodeId WHERE Ranks.rankID = m.playerRank AND m.MemberID = ? ORDER BY m.MemberID ASC', [memberID]);
    } catch (error) {
        console.log(error);
    }
    return rows[0]
};

async function getMember(input, byID = false) {
    var rows = [null];
    try {

        if (byID) {
            [rows] = await queryDatabase(`
                SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,playerStatus
                FROM Members,Ranks
                WHERE Members.playerRank = Ranks.rankID AND Members.MemberID = ?`, [input]);
        } else {
            [rows] = await queryDatabase(`
                SELECT UName,rankName,rankPath,Country,Nick,DateOfJoin,DateOfPromo,playerStatus
                FROM Members,Ranks
                WHERE Members.playerRank = Ranks.rankID AND UName = ?`, [input])
        }

    } catch (error) {
        console.log(error);
    } finally {
        return rows[0]
    }
}

async function getMemberNames(memberIDs, includeRank = false) {
    var rows = [null];
    var result = [];

    var members = [];
    if (!Array.isArray(memberIDs)) {
        members = memberIDs.split(',');
    } else {
        members = memberIDs;
    }
    try {

        if (includeRank === true) {
            [rows] = await queryDatabase(`
                SELECT UName, prefix
                FROM Members, Ranks
                WHERE Members.playerRank = Ranks.rankID AND MemberID IN (?)`, [members]);

                // console.log(rows);

            for (let row of rows) {
                result.push(`${row.prefix}. ${row.UName}`);
            }

            // console.log(result);

        } else {
            [rows] = await queryDatabase(`
                SELECT UName
                FROM Members
                WHERE MemberID IN (?)`, memberIDs);

            result = rows.map(row => row.UName);
        }
    } catch (error) {
        console.log(error);
    } finally {
        return result;
    }
}

async function deleteMember(memberID) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
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
//         [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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

        [rows] = await queryDatabase(`
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

async function createMember(memberName, memberdiscordId, rank, country, parentName, dateOfJoin) {
    var rows = [null];
    try {
        // Get the highest nodeId in the database
        var [maxNodeId] = await queryDatabase('SELECT MAX(nodeId) AS maxNodeId FROM Members WHERE nodeId LIKE "E-%"');
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

        var response = await queryDatabase(`
            INSERT INTO Members (UName,playerRank,Country,nodeId,parentNodeId,DateOfJoin,nick,playerStatus,discordId) VALUES (?,?,?,?,?,?,?,?,?)`, [memberName, rankID, country, newNodeId, parentNodeId, dateOfJoin, nick, playerStatus, memberdiscordId]);

        if (response[0].affectedRows > 0) {
            console.log("Member created successfully");
            [rows] = await queryDatabase('SELECT MemberID FROM Members WHERE nodeId = ?', [newNodeId]);
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
    const [rows] = await queryDatabase('SELECT badgeID,badgeName,badgePath,isQualification,badgeDescription FROM Badges ORDER BY isQualification,badgeName ASC')
    return rows
}

async function getBadge(badgeID) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
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
            [rows] = await queryDatabase(`
                UPDATE Badges
                SET badgeName = ?,
                    isQualification = ?,
                    badgeDescription = ?
                WHERE badgeID = ?`, [badgeName, isQualification, badgeDescription, badgeID]);
        } else {
            [rows] = await queryDatabase(`
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
        rows = await queryDatabase(`
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
        rows = await queryDatabase(`
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
            result = await queryDatabase(`
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
            result = await queryDatabase(`
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
        [rows] = await queryDatabase('SELECT * FROM ytvideos');
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
            [rows] = await queryDatabase('SELECT * FROM ytvideos');
            return rows;
        }

        // Clear the table
        await queryDatabase('DELETE FROM ytvideos');

        var currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        var sql = 'INSERT INTO ytvideos (title, thumbUrl, videoId, videoUrl, duration, author, last_update) VALUES ?';
        var vals = [
            [videos.video1.title, videos.video1.thumbnail, videos.video1.videoId, videos.video1.url, videos.video1.duration, videos.video1.author, currentTime],
            [videos.video2.title, videos.video2.thumbnail, videos.video2.videoId, videos.video2.url, videos.video2.duration, videos.video2.author, currentTime],
            [videos.video3.title, videos.video3.thumbnail, videos.video3.videoId, videos.video3.url, videos.video3.duration, videos.video3.author, currentTime]
        ];
        await queryDatabase(sql, [vals]);

        console.log("DATABASE: Videos updated");

        // Get the updated videos
        [rows] = await queryDatabase('SELECT * FROM ytvideos');
    } else {
        console.log("DATABASE: Videos are up to date");
    }

    return rows;
}

async function getRanks(all, aboveOrBelow, currentRank) {
    var rows = null;
    if (all == true) {
        [rows] = await queryDatabase(`
            SELECT rankID, rankName, prefix
            FROM Ranks
            ORDER BY rankID ASC`);
    } else {
        if (aboveOrBelow == "above") {
            [rows] = await queryDatabase(`
                SELECT rankName, prefix
                FROM Ranks
                WHERE rankID < (SELECT rankID FROM Ranks WHERE rankName = ?)
                ORDER BY rankID DESC`, [currentRank]);
        } else {
            [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        rows = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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


async function checkIfUserExists(username, discordId = null, requirePassword = false) {
    var rows = [null];
    var user = null;
    try {
        var exists = false;

        // First check the discord ID

        if (discordId != null) {
            [rows] = await queryDatabase(`
                SELECT MemberID
                FROM Members
                WHERE MemberDiscordID = ?`, [discordId]);

            if (rows.length > 0) {
                // The user has signed in with Discord, check if the member exists in the users table

                var memberID = rows[0].MemberID;

                [rows] = await queryDatabase(`
                    SELECT role, Members.UName, users.userID
                    FROM users, Members
                    WHERE users.MemberID = ? AND Members.MemberID = users.MemberID`, [memberID]);

                if (rows.length > 0) {
                    // The member exists in the users table
                    let role = rows[0].role;
                    let username = rows[0].UName;
                    let userID = rows[0].userID;
                    exists = true;
                    user = {
                        "userID": userID,
                        "memberID": memberID,
                        "username": username,
                        "role": role,
                        "password": null // No password for Discord users
                    };
                }
            }
        } else {
            // If the user is not signing in with Discord, check the username
            [rows] = await queryDatabase(`
                SELECT username, MemberID, userID, role, password
                FROM users
                WHERE username = ?`, [username]);

            if (rows.length > 0) {
                // The user exists in the users table
                exists = true;
                user = {
                    "userID": rows[0].userID,
                    "memberID": rows[0].memberID,
                    "username": username,
                    "role": rows[0].role,
                    "password": rows[0].password
                };
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        return user; // Return the user object if it exists, null otherwise
    }
}

async function getUserById(userId) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            SELECT username, role, MemberID
            FROM users
            WHERE userID = ?`, [userId]);
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length > 0) {
            return rows[0]; // Return the user object
        } else {
            return null; // No user found with the given ID
        }
    }
}

async function performLogin(username, password, fallback) {

    if (!fallback) {
        var rows = [null];
        try {
            [rows] = await queryDatabase(`
                SELECT username,password,role,memberID
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
                    return { "allowed": true, "role": role, "memberID": rows[0].memberID };
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
        const result = await queryDatabase(`
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
        // Check if the user had a password before
        // If they did not, then we can assume that they are signing in with Discord and do not need a password
        var user = await checkIfUserExists(username, null, true);
        if (user == null || user.password == null) {
            console.log("User does not exist: " + username);
            return false; // User does not exist OR they are signing in with Discord
        }


        const hashedPassword = newPassword;
        const result = await queryDatabase(`
            UPDATE users
            SET password = ?
            WHERE username = ?`, [hashedPassword, username]);
        return result[0].affectedRows > 0;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getUserRole(value, key = 'username') {
    var rows = [null];
    try {
        if (key === 'username') {
            // If the key is username, we can directly query the users table
            [rows] = await queryDatabase(`
                SELECT role
                FROM users
                WHERE username = ?`, [value]);
        } else {
            [rows] = await queryDatabase(`
                SELECT role
                FROM users
                WHERE ? = ?`, [key, value]);
        }
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

async function getUsername(userID) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            SELECT username, memberID
            FROM users
            WHERE userID = ?`, [userID]);

        if (rows.length == 0) {
            // Check if the memberID points to a member in the Members table
            let memberID = rows[0].memberID;
            [rows] = await queryDatabase(`
                SELECT UName AS username
                FROM Members
                WHERE MemberID = ?`, [memberID]);
        }
    } catch (error) {
        console.log(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            return rows[0].username;
        }
    }
}

async function getUserMemberID(username) {
    var rows = [null];
    let memberID = null;

    // console.log("Username: " + username);
    try {
        [rows] = await queryDatabase(`
            SELECT MemberID
            FROM users
            WHERE username = ?`, [username]);

        if (rows.length == 0) {
            // Member may be signed in with Discord
            [rows] = await queryDatabase(`
                SELECT MemberID
                FROM Members
                WHERE UName = ?`, [username]);
        }

        try {
            // Wrapped in Try Catch in case "MemberID" is undefined
            if (rows[0].MemberID === null || typeof rows[0].MemberID === "undefined") {
                // Member may be signed in with Discord
                [rows] = await queryDatabase(`
                    SELECT MemberID
                    FROM Members
                    WHERE UName = ?`, [username]);
            }
        } catch (error) {
            console.error("Error in getUserMemberID:", error);
        }

        memberID = rows[0].MemberID;
    } catch (error) {
        console.error(error);
    } finally {
        if (rows.length == 0) {
            return null;
        } else {
            // console.log("getUserMemberID | MemberID: " + rows[0].MemberID);
            return memberID;
        }
    }
}

async function getMemberByDiscordId(discordId) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            SELECT *
            FROM Members
            WHERE MemberDiscordID = ?`, [discordId]);
    }
    catch (error) {
        console.error("Error in getMemberByDiscordId:", error);
    }
    finally {
        if (rows.length == 0) {
            return null; // No user found with the given Discord ID
        } else {
            return rows[0]; // Return the user object
        }
    }
}

async function createUser(username, password, memberDiscordId = null, role = 'public', memberID = null) {

    var created = false;
    var result = [null];
    try {

        // Check if the user already exists
        var userExists = await checkIfUserExists(username, memberDiscordId);
        if (userExists) {
            console.log("User already exists: " + username);

            // Let them log in if they are already registered

            return false; // User already exists
        }

        // If the user is signing with a Discord account, lookup the discord ID from the members table
        if (memberDiscordId != null) {
            memberID = await getMemberByDiscordId(memberDiscordId);

            // If the memberID is not found, it means the user is not in the members table, this means that they are not a member of the Discord server
            if (memberID == null) {
                console.log("No member found with Discord ID: " + memberDiscordId);
                role = "public";
                memberID = null;
            } else {
                memberID = memberID.MemberID;
                role = "member"; // Set role to member if a valid memberID is found
            }

            // Create the user with the Discord ID, since no password is needed for Discord login
            result = await queryDatabase(`
                INSERT INTO users (username, password, role, memberID)
                VALUES (?, ?, ?, ?)`, [null, null, role, memberID]);

            if (result[0].affectedRows > 0) {
                created = true;
            }
        } else {
            // Is a normal user registration
            // The password is already hashed in the route
            // Insert the new user into the database

            result = await queryDatabase(`
                INSERT INTO users (username, password, role, memberID)
                VALUES (?, ?, ?, ?)`, [username, password, role, memberID]);

            if (result[0].affectedRows > 0) {
                // User created successfully
                console.log("User created successfully: " + username);
                created = true;
            }
        }
    } catch (error) {
        console.error("Error in createUser:", error, result);
        return null;
    } finally {
        if (created) {
            if (memberDiscordId) {
                result = await queryDatabase(`
                SELECT userID, UName, role, users.memberID
                FROM users, Members
                WHERE users.memberID = Members.MemberID AND users.memberID = ?`, [memberID]);
                // Return the user object with userID, username, and role

                return {
                    "userID": result[0][0].userID, // Return the user ID of the newly created user
                    "username": result[0][0].UName,
                    "role": result[0][0].role,
                    "memberID": result[0][0].memberID // Return the member ID if available
                }
            } else {
                result = await queryDatabase(`
                    SELECT userID, username, role, memberID
                    FROM users
                    WHERE username = ?`, [username]);
                // Return the user object with userID, username, and role

                return {
                    "userID": result[0][0].userID, // Return the user ID of the newly created user
                    "username": result[0][0].username,
                    "role": result[0][0].role,
                    "memberID": result[0][0].memberID // Return the member ID if available
                }
            }

        } else {
            console.log("User creation failed for: " + username);
            return null; // User creation failed
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
        [rows] = await queryDatabase(`
            SELECT MemberDiscordID, thursdays, sundays, (thursdays + sundays) AS numberOfEventsAttended
            FROM Members
            WHERE UName = ?`, [name]);

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
        var [rows] = await queryDatabase('SELECT lastUpdate FROM Members ORDER BY lastUpdate DESC LIMIT 1;');
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
            var [temp] = await queryDatabase('SELECT MemberID,UName FROM Members WHERE playerStatus NOT IN ("Inactive", "Reserve")');

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
            var updatedTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Update the attendance records in the database
            var query = await queryDatabase(`
                UPDATE Members
                SET thursdays = ?, sundays = ?, lastUpdate = ?
                WHERE MemberDiscordID = ?`, [thursdays, sundays, updatedTime, memberDiscordId]);

            if (query[0].affectedRows > 0) {
                results.push(query[0].affectedRows);
            }
            else {
                // If the member is not found in the Members table, log the error
                console.log("UPDATE ATTEND: Member " + memberName + " not found in the database");
                results.push(0); // Push 0 to indicate no update was made for this member
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
                [rows] = await queryDatabase(`
                    UPDATE Members
                    SET playerStatus = 'LOA'
                    WHERE Members.MemberDiscordID = ?`, [LOAs[i].memberId]);
            }
        }

        // Now check for any members that were on LOA but are no longer on LOA

        // Get all members that are on LOA
        var [membersOnLOA] = await queryDatabase(`SELECT Members.MemberDiscordID FROM Members WHERE Members.playerStatus = 'LOA'`);

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
                [rows] = await queryDatabase(`
                    UPDATE Members
                    SET playerStatus = 'Active'
                    WHERE Members.MemberDiscordID = ?`, [membersOnLOA[i].MemberDiscordID]);
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
        rows = await queryDatabase(`
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
        [rows] = await queryDatabase(`
            SELECT sopID,sopTitle,sopDescription,authors,sopType,sopDocID,isAAC,isRestricted
            FROM sop
            ORDER BY sopID ASC`);

        for (let i = 0; i < rows.length; i++) {
            // For each SOP, get the SOP URL from the embeds module
            rows[i].sopUrl = embeds.getSOPUrl(rows[i].sopDocID);

            // For each SOP, get the authors' names from the Members table with their MemberID
            if (rows[i].authors) {
                rows[i].authorNames = await getMemberNames(rows[i].authors, true);
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function getSOPbyID(id) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            SELECT sopID,sopTitle,sopDescription,authors,sopType,sopDocID,isAAC,isRestricted
            FROM sop
            WHERE sopID = ?`, [id]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows[0];
    }
}

async function createSOP(sopTitle, authors, sopDescription, sopType, sopDocID, isAAC, isRestricted) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            INSERT INTO sop (sopTitle,sopDescription,authors,sopType,sopDocID,isAAC,isRestricted)
            VALUES (?,?,?,?,?,?,?)`, [sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted]);
    } catch (error) {
        console.error(error);
    } finally {
        return rows;
    }
}

async function editSOP(sopID, sopTitle, authors, sopDescription, sopType, sopDocID, isAAC, isRestricted) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            UPDATE sop
            SET sopTitle = ?, sopDescription = ?, authors = ?, sopType = ?, sopDocID = ?, isAAC = ?, isRestricted = ?
            WHERE sopID = ?`, [sopTitle, sopDescription, authors, sopType, sopDocID, isAAC, isRestricted, sopID]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function deleteSOP(sopID) {
    var rows = [null];
    try {
        [rows] = await queryDatabase(`
            DELETE FROM sop
            WHERE sopID = ?`, [sopID]);
    } catch (error) {
        console.log(error);
    } finally {
        return rows;
    }
}

async function updateMissionORBAT(memberID, memberRole, slotNodeID = null, lock = false) {
    var message = "";

    try {

        // First, get the latest ORBAT for the mission
        var [rows] = await queryDatabase(`
            SELECT missionID
            FROM missionorbats
            WHERE dateOfMission > ?`, [new Date().toISOString().slice(0, 19).replace('T', ' ')]);

        var missionID = null;
        if (rows.length > 0) {
            // If there are multiple missions, get the latest one
            missionID = rows[0].missionID;
        }

        // Check if the slot is to be set to locked
        if (memberID === 0 || lock) {
            [rows] = await queryDatabase(`
                INSERT INTO missionorbatmembers (memberID, missionID, roleName, slotNodeID)
                VALUES (?, ?, ?, ?)`, [memberID, missionID, memberRole, slotNodeID]);
            if (rows[0].affectedRows > 0) {
                console.log("Slot locked in the ORBAT for mission ID: " + missionID);
            }
        } else {
            // Check if the member is already in the ORBAT
            [rows] = await queryDatabase(`
                SELECT MemberID
                FROM missionorbatmembers
                WHERE memberID = ? AND missionID = ?`, [memberID, missionID]);
    
            if (rows.length > 0) {
                // If the member is already in the ORBAT, update their role and slotNodeID
    
                // If the member is to be unassigned, remove them from the ORBAT
                if (memberRole == "NONE") {
                    try {
                        console.log("Unassigning member: " + memberID + " from mission ID: " + missionID);
                        rows = await queryDatabase(`
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
                } else if (Array.isArray(memberRole)) {
                    // If memberRole is an array, we need to find the next available slot for each role
                    let memberRoleArray = memberRole.map(role => role);
    
                    // Randomly shuffle the memberRoleArray
                    for (let i = memberRoleArray.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [memberRoleArray[i], memberRoleArray[j]] = [memberRoleArray[j], memberRoleArray[i]];
                    }
    
                    for (let i = 0; i < memberRoleArray.length; i++) {
                        let role = memberRoleArray[i];
                        let slotInfo = await getNextAvailableSlot(role, missionID);
                        if (slotInfo.slotNodeID != null) {
                            slotNodeID = slotInfo.slotNodeID;
                            callsign = slotInfo.callsign;
                            memberRole = role; // Update memberRole to the current role being processed
                            break; // Stop searching once we find an available slot
                        }
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
                    rows = await queryDatabase(`
                        UPDATE missionorbatmembers
                        SET MemberRole = ?, slotNodeID = ?, memberCallsign = ?
                        WHERE memberID = ? AND missionID = ?`, [memberRole, slotNodeID, callsign, memberID, missionID]);
                    if (rows[0].affectedRows > 0) {
                        console.log("Updated member role and slotNodeID in the ORBAT for mission ID: " + missionID);
                    }
                } else {
                    // If slotNodeID is provided, update the member's role and slotNodeID directly
                    rows = await queryDatabase(`
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
    
                if (memberRole === "NONE") {
                    console.log("Member " + memberID + " is not in the ORBAT, but role is set to NONE. No action taken.");
                    message = "Member is not in the ORBAT, no action taken.";
                    return;
                }
    
                if (slotNodeID == null) {
                    let callsign = "";
                    let slotInfo = null;
    
                    if (Array.isArray(memberRole)) {
                        // If memberRole is an array, we need to find the next available slot for each role
                        let memberRoleArray = memberRole.map(role => role);
    
                        // Randomly shuffle the memberRoleArray
                        for (let i = memberRoleArray.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [memberRoleArray[i], memberRoleArray[j]] = [memberRoleArray[j], memberRoleArray[i]];
                        }
    
                        console.log(memberRoleArray);
    
                        for (let i = 0; i < memberRoleArray.length; i++) {
                            let role = memberRoleArray[i];
                            let slotInfo = await getNextAvailableSlot(role, missionID);
                            if (slotInfo.slotNodeID != null) {
                                slotNodeID = slotInfo.slotNodeID;
                                callsign = slotInfo.callsign;
                                memberRole = role; // Update memberRole to the current role being processed
                                break; // Stop searching once we find an available slot
                            }
                        }
                    } else {
                        console.log("Finding next available slot for member: " + memberID + " with role: " + memberRole);
                        // If slotNodeID is null, find the next available slot with the specified role
                        slotInfo = await getNextAvailableSlot(memberRole, missionID);
                        slotNodeID = slotInfo ? slotInfo.slotNodeID : null;
                        callsign = slotInfo ? slotInfo.callsign : null;
                    }
    
                    if (slotNodeID == null) {
                        console.log("No available slot found for member: " + memberID + " with role: " + memberRole);
                        message = "No available slot found for role: " + memberRole;
                        return;
                    }
    
                    // Insert the member into the ORBAT with the specified role and slotNodeID
                    rows = await queryDatabase(`
                        INSERT INTO missionorbatmembers (memberID, missionID, memberRole, memberCallsign, slotNodeID, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)`, [memberID, missionID, memberRole, callsign, slotNodeID, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
                    if (rows[0].affectedRows > 0) {
                        console.log("Inserted member into the ORBAT for mission ID: " + missionID + " with role: " + memberRole + " and slotNodeID: " + slotNodeID);
                    }
                } else {
                    // If slotNodeID is provided, insert the member into the ORBAT with the specified role and slotNodeID
                    rows = await queryDatabase(`
                        INSERT INTO missionorbatmembers (memberID, missionID, MemberRole, memberCallsign, slotNodeID, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)`, [memberID, missionID, memberRole, callsign, slotNodeID, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
                    if (rows[0].affectedRows > 0) {
                        console.log("Inserted member into the ORBAT for mission ID: " + missionID + " with role: " + memberRole + " and slotNodeID: " + slotNodeID);
                    }
                }
            }
        }

        // Finally, update the mission ORBAT record
        console.log("Updating mission ORBAT record...");

        rows = await queryDatabase(`
                        UPDATE missionorbats
                        SET filledSlots = (SELECT COUNT(*) FROM missionorbatmembers WHERE missionID = ? AND memberID > 0)
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
    [rows] = await queryDatabase(`
        SELECT slotNodeID
        FROM missionorbatmembers
        WHERE missionID = ?`, [missionID]);
    var filledNodes = rows.map(row => row.slotNodeID);

    // Now obtain all the possible slotNodeIDs for the mission
    [rows] = await queryDatabase(`
        SELECT layout
        FROM missionorbattemplates, missionorbats
        WHERE missionorbats.templateID = missionorbattemplates.templateID AND missionorbats.missionID = ?`, [missionID]);

    if (rows.length > 0) {
        console.log("Found mission ORBAT template, parsing layout...");
        // console.log("Layout: " + rows[0].layout);
        var rawJSON = rows[0].layout;

        if (typeof rawJSON === "string") {
            // If the layout is a string, parse it as JSON
            rawJSON = JSON.parse(rawJSON);
        }

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
                // console.log("Found available node for role: " + memberRole + " with ID: " + layout[node].id);
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

    // This function will recursively unwrap the ORBAT JSON structure
    // It will flatten the structure and return a new array with the required fields
    function processItem(item) {
        let newItem = {
            id: item.id,
            roleName: item.roleName,
            callsign: item.callsign,
            parentNodeId: item.parentNode
        };

        // If the item has subordinates, map them recursively
        if (item.subordinates) {
            if (item.subordinates.length > 0) {

                for (const sub of item.subordinates) {
                    processItem(sub);
                }
            }
        }

        newData.push(newItem);
    }

    for (const item of data) {
        processItem(item);
    }

    return newData;
}

async function getLiveOrbat() {
    // This function will return the live ORBAT for the latest mission
    var rows = [null];
    var message = "";
    var layout = [];
    try {
        // Get the latest mission ORBAT template that is scheduled for the future
        // Set date to 3h before current time
        var date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');


        [rows] = await queryDatabase(`
            SELECT missionorbattemplates.layout, missionorbats.missionID, missionorbats.dateOfMission
            FROM missionorbats, missionorbattemplates
            WHERE missionorbats.templateID = missionorbattemplates.templateID AND 
            missionorbats.dateOfMission > ?`, [date]);

        if (typeof rows[0] == "undefined" || rows.length == 0) {
            console.log("No live ORBAT found for the next mission");
            return {
                missionID: -1,
                dateOfMission: -1,
                layout: [{ "id": -1, "roleName": "ORBAT not published", "callsign": "", "parentNodeId": "root", "filled": false }]
            };
        }

        // console.log("Found live ORBAT for mission ID: " + rows[0].missionID + " on date: " + rows[0].dateOfMission);
        // Unwrap the ORBAT JSON layout
        if (typeof rows[0].layout === "string") {
            layout = unwrapORBATJSON(JSON.parse(rows[0].layout));
        } else {
            layout = unwrapORBATJSON(rows[0].layout);
        }

        console.log(rows[0].missionID);

        if (layout.length == 0) {
            console.log("No mission found for the live ORBAT");
            return {
                missionID: -1,
                dateOfMission: -1,
                layout: [{ "id": -1, "roleName": "No ORBAT found", "callsign": "", "parentNodeId": null, "filled": false }],
            };
        }

        // Now get the members that are in the ORBAT for the mission
        var [members] = await queryDatabase(`
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
        if (message.length > 0 && typeof rows[0].missionID != "undefined") {
            return {
                missionID: rows[0].missionID,
                dateOfMission: rows[0].dateOfMission,
                layout: layout,
                "message": message
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
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
        [rows] = await queryDatabase(`
                SELECT missionID
                FROM missionorbats
                WHERE missionID = ?`, [missionID]);

        if (rows.length > 0) {
            // Mission exists, update it
            doesNotExist = false;
            console.log("Updating existing mission with ID: " + rows[0].missionID);
            rows = await queryDatabase(`
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

            rows = await queryDatabase(`
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
        rows = await queryDatabase(`
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

        row.numberOfEventsAttended = row.thursdays + row.sundays;

        // console.log("Checking member: " + row.UName + " with rank: " + row.rankName + " and events attended: " + row.numberOfEventsAttended);

        // Check for Recruits working towards Private
        if (row.rankName == "Recruit") {
            if (row.numberOfEventsAttended >= 4) {
                // If the member is a Recruit and has attended at least 4 events, they are eligible for the next rank
                eligible++;
            }

            var eventsToGo = 4 - row.numberOfEventsAttended;

            if ((Math.abs(4 - row.numberOfEventsAttended) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(4 - row.numberOfEventsAttended);
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }

            // If the difference is negative, meaning that the member is eligible, set it to 0
            if (eventsToGo < 0) {
                eventsToGo = 0;
            }

            memberPromos.push({
                "UName": row.UName,
                "rankName": row.rankName,
                "numberOfEventsAttended": row.numberOfEventsAttended,
                "nextRank": "Private",
                "eventsToGo": eventsToGo,
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

            var eventsToGo = 30 - row.numberOfEventsAttended;

            if ((Math.abs(30 - row.numberOfEventsAttended) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(30 - row.numberOfEventsAttended);
                // If the difference is negative, meaning that the member is eligible, set it to 0
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }

            if (eventsToGo < 0) {
                eventsToGo = 0;
            }

            // Filter out members that are still a long way from the next rank
            if (eventsToGo < 20) {
                memberPromos.push({
                    "UName": row.UName,
                    "rankName": row.rankName,
                    "numberOfEventsAttended": row.numberOfEventsAttended,
                    "nextRank": "Private Second Class",
                    "eventsToGo": eventsToGo,
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

            // difference = 60 - row.numberOfEventsAttended;

            var eventsToGo = 60 - row.numberOfEventsAttended;

            if ((Math.abs(60 - row.numberOfEventsAttended) < difference) || difference == -1) {
                // If the member is closer to the next rank than the current difference, update the difference
                difference = Math.abs(60 - row.numberOfEventsAttended);
                nextEligibleMember = `${row.rankName} ${row.UName}`;
            }

            if (eventsToGo < 0) {
                eventsToGo = 0;
            }

            // Filter out members that are still a long way from the next rank
            if (eventsToGo < 20) {
                memberPromos.push({
                    "UName": row.UName,
                    "rankName": row.rankName,
                    "numberOfEventsAttended": row.numberOfEventsAttended,
                    "nextRank": "Private First Class",
                    "eventsToGo": eventsToGo,
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
            var [member] = await queryDatabase('SELECT UName, playerStatus, playerRank FROM Members WHERE MemberDiscordID = ?', [loa.memberId]);

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
            console.error("Error getting member name for LOA: " + loa.memberName + " - " + error);
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

    // console.log(dashboardData);

    return dashboardData;
}


module.exports = {
    getMembers, getFullMemberInfo, getMember, deleteMember, updateMember,
    getMemberBadges, getMembersAssignedToBadge, getBadges, getBadge, getVideos, getRanks, getRankByID, getComprehensiveRanks,
    changeRank, performLogin, getMemberAttendance, updateMemberAttendance, updateMemberLOAs,
    getPool, closePool, performRegister, getUserRole, getUserMemberID, createMember, getDashboardData, getMemberLOA, createUser,
    getSeniorMembers, updateBadge, getAllBadgePaths, assignBadgeToMembers, removeBadgeFromMembers, resetPassword, getSOPs, getSOPbyID, getUsername,
    createSOP, editSOP, updateMissionORBAT, getLiveOrbat, getMemberSlotInfoFromOrbat, getMissions, getMissionCompositions, patchMissions, deleteMission, checkIfUserExists, getUserById,
    deleteSOP
};