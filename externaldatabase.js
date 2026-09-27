const {Client} = require('pg');
const db = require('./database.js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const embeds = require('./embeds.js');
const fs = require('fs');
dotenv.config()

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

client.connect();

/**
 * TABLES
 * roster_members - All members of the roster
 * leave_of_absence - All leave of absence notifications
 */

/**
 * 1. Query External Database
 * 2. Push/Pull member data to/from the database
 * 3. Pull leave of absence data from the database
 */

async function queryExtDatabase(query, params) {

    let res = null;
    try {
        if( client.connection === null ) {
            await client.connect();
        }

        res = await client.query(query, params);
        return res.rows;
    } catch (err) {
        console.error('Error querying external database:', err);
        client.end();
        return null;
    } finally {
        return res;
    }
};

const MEMBER_SYNC_TABLE = 'member_sync_state';
const MEMBER_SYNC_KEY = 'website_members';
const MEMBER_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function normalizeComparableValue(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    return value;
}

function valuesDiffer(localValue, externalValue) {
    return normalizeComparableValue(localValue) !== normalizeComparableValue(externalValue);
}

function toMysqlDatetime(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return null;
    }

    return dateValue.toISOString().slice(0, 19).replace('T', ' ');
}

function isFreshSync(lastCheckedAt) {
    if (!lastCheckedAt) {
        return false;
    }

    const checkedAt = new Date(lastCheckedAt);
    if (Number.isNaN(checkedAt.getTime())) {
        return false;
    }

    return Date.now() - checkedAt.getTime() < MEMBER_SYNC_INTERVAL_MS;
}

async function ensureMemberSyncStateTable() {
    await db.queryDatabase(`
        CREATE TABLE IF NOT EXISTS ${MEMBER_SYNC_TABLE} (
            syncKey VARCHAR(50) PRIMARY KEY,
            lastCheckedAt DATETIME NULL,
            lastExternalUpdateAt DATETIME NULL
        )
    `);
}

async function getMemberSyncState() {
    await ensureMemberSyncStateTable();

    const [rows] = await db.queryDatabase(
        `
        SELECT syncKey, lastCheckedAt, lastExternalUpdateAt
        FROM ${MEMBER_SYNC_TABLE}
        WHERE syncKey = ?
    `,
        [MEMBER_SYNC_KEY]
    );

    return rows[0] || null;
}

async function setMemberSyncState(lastCheckedAt, lastExternalUpdateAt) {
    await ensureMemberSyncStateTable();

    await db.queryDatabase(
        `
        INSERT INTO ${MEMBER_SYNC_TABLE} (syncKey, lastCheckedAt, lastExternalUpdateAt)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            lastCheckedAt = VALUES(lastCheckedAt),
            lastExternalUpdateAt = VALUES(lastExternalUpdateAt)
    `,
        [MEMBER_SYNC_KEY, lastCheckedAt, lastExternalUpdateAt]
    );
}

async function getRankLookupMap() {
    const [rows] = await db.queryDatabase(
        `
        SELECT rankID, rankName, prefix
        FROM Ranks
    `
    );

    const rankLookup = new Map();
    for (const row of rows) {
        if (row.rankName) {
            rankLookup.set(String(row.rankName).trim().toLowerCase(), row.rankID);
        }

        if (row.prefix) {
            rankLookup.set(String(row.prefix).trim().toLowerCase(), row.rankID);
        }
    }

    return rankLookup;
}

function resolveRankId(externalMember, rankLookup) {
    const rankName = externalMember.rank_name ?? externalMember.rankName;
    const rankPrefix = externalMember.rank_prefix ?? externalMember.rankPrefix;

    if (rankName) {
        const rankId = rankLookup.get(String(rankName).trim().toLowerCase());
        if (rankId !== undefined) {
            return rankId;
        }
    }

    if (rankPrefix) {
        const rankId = rankLookup.get(String(rankPrefix).trim().toLowerCase());
        if (rankId !== undefined) {
            return rankId;
        }
    }

    return null;
}

function resolvePlayerStatus(externalMember) {
    if (externalMember.on_loa === true) {
        return 'LOA';
    }

    if (externalMember.is_reserve === true) {
        return 'Reserve';
    }

    if (externalMember.is_active === true) {
        return 'Active';
    }

    return 'Inactive';
}

function buildMemberUpdateObject(localMember, externalMember, rankLookup) {
    const updateObject = {
        MemberID: localMember.MemberID
    };

    let hasChanges = false;

    const externalNickname = externalMember.nickname ?? externalMember.Nick;
    if (externalNickname !== undefined) {
        if (valuesDiffer(localMember.UName, externalNickname)) {
            updateObject.UName = externalNickname;
            hasChanges = true;
        }

        if (valuesDiffer(localMember.Nick, externalNickname)) {
            updateObject.Nick = externalNickname;
            hasChanges = true;
        }
    }

    const resolvedRankId = resolveRankId(externalMember, rankLookup);
    if (resolvedRankId !== null && valuesDiffer(localMember.playerRank, resolvedRankId)) {
        updateObject.playerRank = resolvedRankId;
        hasChanges = true;
    }

    const resolvedStatus = resolvePlayerStatus(externalMember);
    if (valuesDiffer(localMember.playerStatus, resolvedStatus)) {
        updateObject.playerStatus = resolvedStatus;
        hasChanges = true;
    }

    return hasChanges ? updateObject : null;
}

async function applyWebsiteMemberUpdates(updatedData) {
    if (!Array.isArray(updatedData) || updatedData.length === 0) {
        return 0;
    }

    const updateColumns = [...new Set(
        updatedData.flatMap((record) => Object.keys(record))
    )].filter((column) => column !== 'MemberID');

    if (updateColumns.length === 0) {
        return 0;
    }

    const memberIds = updatedData.map((record) => record.MemberID);
    const assignments = [];
    const params = [];

    for (const column of updateColumns) {
        const cases = [];

        for (const record of updatedData) {
            if (record[column] === undefined) {
                continue;
            }

            cases.push('WHEN ? THEN ?');
            params.push(record.MemberID, record[column]);
        }

        if (cases.length > 0) {
            assignments.push(`${column} = CASE MemberID ${cases.join(' ')} ELSE ${column} END`);
        }
    }

    if (assignments.length === 0) {
        return 0;
    }

    params.push(...memberIds);

    const query = `
        UPDATE Members
        SET ${assignments.join(', ')}
        WHERE MemberID IN (${memberIds.map(() => '?').join(', ')})`;

    const result = await db.queryDatabase(query, params);
    return Array.isArray(result) && result[0] ? result[0].affectedRows : 0;
}

async function getExternalMembersSince(lastExternalUpdateAt) {
    const params = [];
    let filterClause = '';

    if (lastExternalUpdateAt) {
        filterClause = 'WHERE updated_at > $1';
        params.push(lastExternalUpdateAt);
    }

    return queryExtDatabase(
        `
        SELECT id, guild_id, user_id, nickname, rank_prefix, rank_name, rank_order, is_active, is_reserve, subgroup, on_loa, last_seen, updated_at
        FROM roster_members
        ${filterClause}
        ORDER BY updated_at ASC, id ASC
    `,
        params
    );
}

/**
 * This function will read in the data from the external database, query the local database,
 * and update the local database with any new or updated members.
 * The function will compile the updated data and make a single call to the local database to update all members at once.
 * 
 * Each field for each record will be checked for changes, and if any changes are found, an array of objects will be appended
 * with the Id of the record and any updated fields.
 * @param {JSON} data 
 * 
 */
async function updateWebsiteMembers(force = false) {
    const syncState = await getMemberSyncState();
    if (!force && syncState && isFreshSync(syncState.lastCheckedAt)) {
        return [];
    }

    const externalMembers = await getExternalMembersSince(syncState ? syncState.lastExternalUpdateAt : null);
    if (!Array.isArray(externalMembers) || externalMembers.length === 0) {
        await setMemberSyncState(toMysqlDatetime(new Date()), syncState ? syncState.lastExternalUpdateAt : null);
        return [];
    }

    const localRows = await db.queryDatabase(
        'SELECT MemberID, MemberDiscordID, UName, playerRank, Nick, playerStatus FROM Members'
    );

    const existingData = Array.isArray(localRows) ? localRows[0] : [];
    const localByDiscordId = new Map(
        existingData.map((member) => [String(member.MemberDiscordID), member])
    );
    const rankLookup = await getRankLookupMap();

    const updatedData = [];
    let newestExternalUpdateAt = syncState ? syncState.lastExternalUpdateAt : null;

    for (const member of externalMembers) {
        const discordId = String(member.user_id ?? member.UserID ?? member.discordId);
        const localMember = localByDiscordId.get(discordId);

        if (!localMember) {
            if (member.updated_at && (!newestExternalUpdateAt || new Date(member.updated_at) > new Date(newestExternalUpdateAt))) {
                newestExternalUpdateAt = member.updated_at;
            }
            continue;
        }

        const updateObject = buildMemberUpdateObject(localMember, member, rankLookup);
        if (updateObject) {
            updatedData.push(updateObject);
        }

        if (member.updated_at && (!newestExternalUpdateAt || new Date(member.updated_at) > new Date(newestExternalUpdateAt))) {
            newestExternalUpdateAt = member.updated_at;
        }
    }

    await applyWebsiteMemberUpdates(updatedData);
    await setMemberSyncState(toMysqlDatetime(new Date()), toMysqlDatetime(newestExternalUpdateAt));
    return updatedData;
}

module.exports = {
    updateWebsiteMembers
};