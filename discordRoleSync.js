const db = require('./database.js');
const dotenv = require('dotenv');

dotenv.config();

const DEBUG = false;

// Default to 30 minutes if not set or invalid, but allow configuration via environment variable
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_RANK_ROLE_NAMES = [
    'recruit',
    'private',
    'private 2nd class',
    'private 1st class',
    'lance corporal',
    'corporal',
    'sergeant',
    'staff sergeant',
    'airman',
    'first class airman',
    'senior airman',
    '2nd lieutenant',
    '1st lieutenant'
];
const DEFAULT_ACTIVE_STATUS_NAMES = ['active'];
const DEFAULT_RESERVE_STATUS_NAMES = ['reserve', 'reservist'];
const DEFAULT_NEW_MEMBER_ROLE_NAMES = ['recruit'];
const DEFAULT_IGNORED_RANK_NAMES = ['active', 'inactive', 'loa', 'root', 'origin', 'member', 'public', 'guest'];

let syncTimer = null;
let syncRunning = false;

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function debugLog(message) {
    if (DEBUG) {
        console.log(message);
    }
}

function parseNameList(value, fallback) {
    if (typeof value !== 'string' || value.trim() === '') {
        return fallback.slice();
    }

    return value
        .split(',')
        .map((item) => normalizeName(item))
        .filter(Boolean);
}

function getAuthorizationHeader() {
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
        return null;
    }

    return token.startsWith('Bot ') ? token : `Bot ${token}`;
}

async function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDiscordJson(path, attempt = 0) {
    const authorization = getAuthorizationHeader();
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!authorization || !guildId) {
        return null;
    }

    const response = await fetch(`https://discord.com/api/v10${path}`, {
        method: 'GET',
        headers: {
            authorization,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get('retry-after') || '1');
        await wait((retryAfter * 1000) + 50);
        return fetchDiscordJson(path, attempt + 1);
    }

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Discord API request failed (${response.status}): ${body}`);
    }

    return response.json();
}

async function fetchGuildRoles() {
    const guildId = process.env.DISCORD_GUILD_ID;
    return fetchDiscordJson(`/guilds/${guildId}/roles`);
}

async function fetchGuildMembers() {
    const guildId = process.env.DISCORD_GUILD_ID;
    const members = [];
    let after = null;

    while (true) {
        const query = new URLSearchParams({ limit: '1000' });
        if (after) {
            query.set('after', after);
        }

        const page = await fetchDiscordJson(`/guilds/${guildId}/members?${query.toString()}`);

        if (!Array.isArray(page) || page.length === 0) {
            break;
        }

        members.push(...page);

        if (page.length < 1000) {
            break;
        }

        after = page[page.length - 1].user.id;
    }

    return members;
}

function getHighestMatchingRank(roleEntries, knownRanks) {
    const ignoredRanks = new Set(parseNameList(process.env.DISCORD_IGNORED_RANK_ROLE_NAMES, DEFAULT_IGNORED_RANK_NAMES));

    return roleEntries
        .filter((entry) => knownRanks.has(normalizeName(entry.name)))
        .filter((entry) => !ignoredRanks.has(normalizeName(entry.name)))
        .sort((left, right) => right.position - left.position)[0] || null;
}

function resolveStatus(roleNames) {
    const activeRoles = new Set(parseNameList(process.env.DISCORD_ACTIVE_ROLE_NAMES, DEFAULT_ACTIVE_STATUS_NAMES));
    const reserveRoles = new Set(parseNameList(process.env.DISCORD_RESERVE_ROLE_NAMES, DEFAULT_RESERVE_STATUS_NAMES));

    const hasReserve = roleNames.some((roleName) => reserveRoles.has(normalizeName(roleName)));
    if (hasReserve) {
        return 'Reserve';
    }

    const hasActive = roleNames.some((roleName) => activeRoles.has(normalizeName(roleName)));
    if (hasActive) {
        return 'Active';
    }

    return null;
}

function resolveNewMemberRole(roleNames) {
    const recruitRoles = new Set(parseNameList(process.env.DISCORD_NEW_MEMBER_ROLE_NAMES, DEFAULT_NEW_MEMBER_ROLE_NAMES));
    return roleNames.some((roleName) => recruitRoles.has(normalizeName(roleName)));
}

function hasGuildMemberRole(roleNames) {
    return roleNames.some((name) => normalizeName(name) === 'member');
}

function getMemberDisplayName(guildMember) {
    return guildMember.nick || guildMember.user.global_name || guildMember.user.username;
}

function getGuildMemberRoles(guildMember, roleLookup) {
    return (guildMember.roles || [])
        .map((roleId) => roleLookup.get(roleId))
        .filter(Boolean)
        .sort((left, right) => right.position - left.position);
}

function getConfiguredRankRoleNames() {
    return new Set(parseNameList(process.env.DISCORD_RANK_ROLE_NAMES, DEFAULT_RANK_ROLE_NAMES));
}

async function runDiscordRoleSync() {
    if (syncRunning) {
        return { skipped: true, reason: 'sync already running' };
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const authorization = getAuthorizationHeader();

    if (!guildId || !authorization) {
        console.log('DISCORD SYNC: Missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN, skipping role sync.');
        return { skipped: true, reason: 'missing configuration' };
    }

    syncRunning = true;

    try {
        const [knownRanks, guildRoles, guildMembers] = await Promise.all([
            db.getRanks(true),
            fetchGuildRoles(),
            fetchGuildMembers()
        ]);

        const rankLookup = new Map();
        for (const rank of knownRanks || []) {
            rankLookup.set(normalizeName(rank.rankName), rank);
        }

        const roleLookup = new Map();
        for (const role of guildRoles || []) {
            roleLookup.set(role.id, role);
        }

        const configuredRankRoleNames = getConfiguredRankRoleNames();

        const reserveRank = rankLookup.get('reserve') || null;

        const summary = {
            checked: 0,
            created: 0,
            promoted: 0,
            transferred: 0,
            discharged: 0,
            statusUpdates: 0,
            skipped: 0
        };

        for (const guildMember of guildMembers) {
            summary.checked += 1;

                        debugLog(`DISCORD SYNC: Processing member ${guildMember.user.username} (${guildMember.user.id}).`);

                        const roleEntries = getGuildMemberRoles(guildMember, roleLookup);

            const roleNames = roleEntries.map((role) => role.name);
            // // Only sync users who are actually part of the guild's member roster.
            // if (!hasGuildMemberRole(roleNames)) {
            //     summary.skipped += 1;
            //     debugLog(`DISCORD SYNC: Skipping member ${guildMember.user.username} (${guildMember.user.id}). Missing 'Member' role.`);
            //     continue;
            // }

            // If the retrieved user has a role of Bot, it means they are not actually a member of the guild and should be skipped
            if (roleNames.some((name) => normalizeName(name) === 'bot')) {
                summary.skipped += 1;
                debugLog(`DISCORD SYNC: Skipping user ${guildMember.user.username} (${guildMember.user.id}). Has 'Bot' role, indicating they are not a guild member.`);
                continue;
            }

            const liveStatus = resolveStatus(roleNames);
            const liveRank = getHighestMatchingRank(roleEntries, configuredRankRoleNames);
            const targetRank = liveRank || (normalizeName(liveStatus) === 'reserve' ? reserveRank : null);
                        const displayName = getMemberDisplayName(guildMember);
            const discordId = guildMember.user.id;
            const existingMember = await db.getMemberByDiscordId(discordId);

            if (!hasGuildMemberRole(roleNames)) {
                if (existingMember && normalizeName(existingMember.playerStatus) !== 'discharged') {
                    const dischargeResult = await db.updateDiscordMember(discordId, { status: 'Discharged' });
                    const dischargeAffectedRows = dischargeResult && typeof dischargeResult.affectedRows === 'number'
                        ? dischargeResult.affectedRows
                        : dischargeResult && dischargeResult[0] && typeof dischargeResult[0].affectedRows === 'number'
                            ? dischargeResult[0].affectedRows
                            : 0;

                    if (dischargeAffectedRows > 0) {
                        summary.discharged += 1;
                        debugLog(`DISCORD SYNC: Marked ${displayName} (${discordId}) as Discharged because they no longer have the Member role.`);
                    }
                } else {
                    summary.skipped += 1;
                    debugLog(`DISCORD SYNC: Skipping member ${guildMember.user.username} (${guildMember.user.id}). Missing 'Member' role.`);
                }

                continue;
            }

            if (!liveRank && !reserveRank) {
                summary.skipped += 1;
                                debugLog(`DISCORD SYNC: Skipping member ${guildMember.user.username} (${guildMember.user.id}). No matching rank found.`);
                continue;
            }

            if (!existingMember) {
                if (targetRank && normalizeName(targetRank.rankName) === 'recruit' && liveStatus === 'Active' && resolveNewMemberRole(roleNames)) {
                    const createdMemberId = await db.createMember(
                        displayName,
                        discordId,
                        targetRank.rankName,
                        'Unknown',
                        'None',
                        new Date().toISOString().slice(0, 19).replace('T', ' ')
                    );

                    if (createdMemberId) {
                        summary.created += 1;
                        debugLog(`DISCORD SYNC: Created member ${displayName} (${discordId}) as Recruit.`);
                    }
                } else {
                    summary.skipped += 1;
                    debugLog(`DISCORD SYNC: Skipping member ${displayName} (${discordId}). Not a new recruit.`);
                }

                continue;
            }

            const currentRank = await db.getRankByID(existingMember.playerRank);
            const currentRankName = currentRank ? currentRank.rankName : null;
            const currentStatus = existingMember.playerStatus;
            const currentStatusKey = normalizeName(currentStatus);
            const liveStatusKey = normalizeName(liveStatus);
            const isReserveTransfer = liveStatusKey === 'reserve' && currentStatusKey !== 'reserve';
            const isActiveTransfer = liveStatusKey === 'active' && currentStatusKey === 'reserve';
            const isTransferDetected = (isReserveTransfer || isActiveTransfer) && currentStatusKey !== liveStatusKey;
            const shouldPromote = Boolean(liveRank && currentRank && liveRank.rankID < currentRank.rankID);
            const updates = {};

            if (shouldPromote) {
                updates.rank = targetRank.rankName;
                updates.dateOfPromo = new Date().toISOString().slice(0, 19).replace('T', ' ');
            } else if (isReserveTransfer && targetRank) {
                updates.rank = targetRank.rankName;
            }

            if (liveStatus && liveStatusKey !== currentStatusKey) {
                updates.status = liveStatus;
            }

            if (isTransferDetected) {
                const nextParentNodeId = await db.getDiscordSyncParentNodeId(targetRank && targetRank.rankName, liveStatus);
                if (nextParentNodeId && nextParentNodeId !== existingMember.parentNodeId) {
                    updates.parentNodeId = nextParentNodeId;
                }
            }

            if (Object.keys(updates).length === 0) {
                                debugLog(`DISCORD SYNC: No updates needed for member ${displayName} (${discordId}).`);
                continue;
            }

            const updateResult = await db.updateDiscordMember(discordId, updates);
            const affectedRows = updateResult && typeof updateResult.affectedRows === 'number'
                ? updateResult.affectedRows
                : updateResult && updateResult[0] && typeof updateResult[0].affectedRows === 'number'
                    ? updateResult[0].affectedRows
                    : 0;

            if (affectedRows > 0) {
                if (shouldPromote) {
                    summary.promoted += 1;
                    console.log(`DISCORD SYNC: Promoted ${displayName} from ${currentRankName} to ${targetRank.rankName}.`);
                }

                if (isReserveTransfer) {
                    summary.transferred += 1;
                    console.log(`DISCORD SYNC: Transferred ${displayName} to Reserve.`);
                }

                if (liveStatus && liveStatusKey !== currentStatusKey) {
                    summary.statusUpdates += 1;
                }

                if (DEBUG && !shouldPromote && !isReserveTransfer) {
                    console.log(`DISCORD SYNC: Updated ${displayName} (${discordId}). Rank=${updates.rank || 'unchanged'}, Status=${updates.status || 'unchanged'}, Parent=${updates.parentNodeId || 'unchanged'}.`);
                }
            }
        }

        console.log(`DISCORD SYNC: Completed. Checked ${summary.checked}, created ${summary.created}, promoted ${summary.promoted}, transferred ${summary.transferred}, status updates ${summary.statusUpdates}, dicharged ${summary.discharged}, skipped ${summary.skipped}.`);
        return summary;
    } catch (error) {
        console.error('DISCORD SYNC: Failed to sync Discord roles:', error);
        return { skipped: true, error: error.message };
    } finally {
        syncRunning = false;
    }
}

function startDiscordRoleSync() {
    if (syncTimer) {
        return;
    }

    const intervalMs = Number.parseInt(process.env.DISCORD_ROLE_SYNC_INTERVAL_MS || '', 10) || DEFAULT_INTERVAL_MS;

    runDiscordRoleSync().catch((error) => {
        console.error('DISCORD SYNC: Initial run failed:', error);
    });

    syncTimer = setInterval(() => {
        runDiscordRoleSync().catch((error) => {
            console.error('DISCORD SYNC: Scheduled run failed:', error);
        });
    }, intervalMs);

    if (typeof syncTimer.unref === 'function') {
        syncTimer.unref();
    }

    console.log(`DISCORD SYNC: Scheduled role checks every ${intervalMs}ms.`);
}

function stopDiscordRoleSync() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }

    console.log('DISCORD SYNC: Stopped scheduled role checks.');
}

module.exports = {
    runDiscordRoleSync,
    startDiscordRoleSync,
    stopDiscordRoleSync
};