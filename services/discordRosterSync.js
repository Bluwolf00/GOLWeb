const {
    Client,
    GatewayIntentBits
} = require('discord.js');
const db = require('../database.js');

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const previews = new Map();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let loginPromise = null;

function isAutomaticSyncEnabled() {
    return String(process.env.DISCORD_AUTO_ROLE_SYNC_ENABLED || '').toLowerCase() === 'true';
}

async function getGuild() {
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
        throw new Error('Discord bot configuration is incomplete.');
    }
    if (!loginPromise) {
        loginPromise = client.login(process.env.DISCORD_BOT_TOKEN);
    }
    await loginPromise;
    return client.guilds.fetch(process.env.DISCORD_GUILD_ID);
}

function managedStatusRoles() {
    return {
        member: process.env.DISCORD_MEMBER_ROLE_ID,
        reserve: process.env.DISCORD_RESERVE_ROLE_ID
    };
}

function memberStatus(member) {
    const roles = member.roles.cache;
    const statusRoles = managedStatusRoles();
    if (statusRoles.reserve && roles.has(statusRoles.reserve)) {
        return 'Reserve';
    }
    if (statusRoles.member && roles.has(statusRoles.member)) {
        return 'Active';
    }
    return 'Inactive';
}

function roleIds(member) {
    return [...member.roles.cache.keys()];
}

function cleanPreview(previewId) {
    const preview = previews.get(previewId);
    if (preview && preview.expiresAt <= Date.now()) {
        previews.delete(previewId);
        return null;
    }
    return preview;
}

async function createImportPreview() {
    const guild = await getGuild();
    const [discordMembers, mappings, websiteMembers] = await Promise.all([
        guild.members.fetch(),
        db.getDiscordRankMappings(),
        db.getDiscordRosterMembers()
    ]);

    const mappingsByRole = new Map(mappings.map(rank => [String(rank.DiscordRoleId), rank]));
    const mappingsByName = new Map(mappings.map(rank => [rank.rankName, rank]));
    const websiteByDiscordId = new Map(
        websiteMembers.map(member => [String(member.MemberDiscordID), member])
    );
    const changes = [];
    const newMembers = [];
    const conflicts = [];
    const unmatchedDiscordMembers = [];

    for (const discordMember of discordMembers.values()) {
        const websiteMember = websiteByDiscordId.get(String(discordMember.id));
        if (!websiteMember) {
            const statusRoles = managedStatusRoles();
            const recruitRank = mappingsByName.get('Recruit');
            const hasMemberRole = statusRoles.member &&
                discordMember.roles.cache.has(statusRoles.member);
            const hasReserveRole = statusRoles.reserve &&
                discordMember.roles.cache.has(statusRoles.reserve);
            const hasRecruitRole = recruitRank &&
                discordMember.roles.cache.has(recruitRank.DiscordRoleId);

            if (hasMemberRole && !hasReserveRole && hasRecruitRole) {
                const recruitParent = await db.getRecruitParent();
                if (recruitParent) {
                    newMembers.push({
                        discordID: discordMember.id,
                        memberName: discordMember.displayName || discordMember.user.username,
                        proposedRank: 'Recruit',
                        proposedStatus: 'Active',
                        proposedParentNodeId: recruitParent.nodeId,
                        proposedParentName: recruitParent.UName,
                        defaultCountry: 'Unknown'
                    });
                } else {
                    conflicts.push({
                        discordID: discordMember.id,
                        memberName: discordMember.displayName || discordMember.user.username,
                        reason: 'No active member has more than one child and no grandchildren.'
                    });
                }
            } else {
                unmatchedDiscordMembers.push({
                    discordID: discordMember.id,
                    memberName: discordMember.displayName || discordMember.user.username,
                    reason: 'Discord member is not linked to the website and does not have both Member and Recruit roles.'
                });
            }
            continue;
        }

        const status = memberStatus(discordMember);
        const managedRanks = roleIds(discordMember)
            .map(roleId => mappingsByRole.get(String(roleId)))
            .filter(Boolean);

        if (managedRanks.length > 1) {
            conflicts.push({
                memberID: websiteMember.MemberID,
                memberName: websiteMember.UName,
                reason: 'Member has multiple mapped Discord rank roles.'
            });
            continue;
        }

        const reserveRank = mappingsByName.get('Reserve');
        if (status === 'Reserve' && websiteMember.playerStatus === 'Reserve' && reserveRank &&
            websiteMember.playerRank === reserveRank.rankID) {
            continue;
        }

        let rank = managedRanks[0] || null;
        let parentNodeId = websiteMember.parentNodeId;
        let nodeId = websiteMember.nodeId;
        let previousPlayerRank = websiteMember.previousPlayerRank;
        let previousParentNodeId = websiteMember.previousParentNodeId;
        let previousNodeId = websiteMember.previousNodeId;

        if (status === 'Reserve') {
            rank = mappingsByName.get('Reserve') || rank;
            if (!rank) {
                conflicts.push({
                    memberID: websiteMember.MemberID,
                    memberName: websiteMember.UName,
                    reason: 'Reserve rank has no DiscordRoleId mapping.'
                });
                continue;
            }

            if (websiteMember.playerStatus !== 'Reserve') {
                previousPlayerRank = websiteMember.playerRank;
                previousParentNodeId = websiteMember.parentNodeId;
                previousNodeId = websiteMember.nodeId;
            }

            const leader = await db.getReservistLeader(websiteMember.MemberID);
            if (!leader) {
                conflicts.push({
                    memberID: websiteMember.MemberID,
                    memberName: websiteMember.UName,
                    reason: 'No eligible Reservist leader is available.'
                });
                continue;
            }
            parentNodeId = leader.nodeId;
        } else if (status === 'Active') {
            if (websiteMember.playerStatus === 'Reserve' && websiteMember.previousPlayerRank) {
                rank = mappings.find(item => item.rankID === websiteMember.previousPlayerRank) || rank;
                parentNodeId = websiteMember.previousParentNodeId || websiteMember.parentNodeId;
                nodeId = websiteMember.previousNodeId || websiteMember.nodeId;
                previousPlayerRank = null;
                previousParentNodeId = null;
                previousNodeId = null;
            }
            if (!rank) {
                conflicts.push({
                    memberID: websiteMember.MemberID,
                    memberName: websiteMember.UName,
                    reason: 'Active member has no mapped Discord rank role.'
                });
                continue;
            }
        } else {
            rank = mappingsByName.get('Buddy');
            if (!rank) {
                conflicts.push({
                    memberID: websiteMember.MemberID,
                    memberName: websiteMember.UName,
                    reason: 'Buddy rank has no DiscordRoleId mapping.'
                });
                continue;
            }
            if (websiteMember.playerStatus !== 'Inactive' || websiteMember.nodeId !== null) {
                previousPlayerRank = websiteMember.playerRank;
                previousParentNodeId = websiteMember.parentNodeId;
                previousNodeId = websiteMember.nodeId;
            }
            nodeId = null;
            parentNodeId = null;
        }

        if (
            websiteMember.playerRank !== rank.rankID ||
            websiteMember.playerStatus !== status ||
            websiteMember.parentNodeId !== parentNodeId ||
            websiteMember.nodeId !== nodeId ||
            websiteMember.previousPlayerRank !== previousPlayerRank ||
            websiteMember.previousParentNodeId !== previousParentNodeId ||
            websiteMember.previousNodeId !== previousNodeId
        ) {
            const proposedParent = parentNodeId && parentNodeId !== 'root'
                ? await db.getMemberByNodeId(parentNodeId)
                : null;
            changes.push({
                memberID: websiteMember.MemberID,
                memberName: websiteMember.UName,
                discordID: discordMember.id,
                currentRankID: websiteMember.playerRank,
                currentRank: websiteMember.rankName,
                proposedRank: rank.rankName,
                currentStatus: websiteMember.playerStatus,
                proposedStatus: status,
                currentParentNodeId: websiteMember.parentNodeId,
                proposedParentNodeId: parentNodeId,
                proposedParentName: proposedParent
                    ? proposedParent.UName
                    : parentNodeId === 'root' ? 'Root' : null,
                currentNodeId: websiteMember.nodeId,
                proposedNodeId: nodeId,
                expectedRoleIds: roleIds(discordMember),
                playerRank: rank.rankID,
                playerStatus: status,
                parentNodeId,
                nodeId,
                previousPlayerRank,
                previousParentNodeId,
                previousNodeId
            });
        }
    }

    const previewId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const preview = {
        previewId,
        createdAt: Date.now(),
        expiresAt: Date.now() + PREVIEW_TTL_MS,
        changes,
        conflicts,
        newMembers,
        unmatchedDiscordMembers
    };
    previews.set(previewId, preview);
    return preview;
}

async function applyImportPreview(previewId) {
    const preview = cleanPreview(previewId);
    if (!preview) {
        throw new Error('The Discord import preview is missing or expired.');
    }

    const guild = await getGuild();
    const currentMembers = await db.getDiscordRosterMembers();
    const currentById = new Map(currentMembers.map(member => [member.MemberID, member]));
    for (const change of preview.changes) {
        const current = currentById.get(change.memberID);
        const discordMember = await guild.members.fetch(change.discordID);
        if (!current || current.playerRank !== change.currentRankID ||
            current.playerStatus !== change.currentStatus ||
            JSON.stringify(roleIds(discordMember).sort()) !== JSON.stringify(change.expectedRoleIds.sort())) {
            throw new Error(`Preview is stale for ${change.memberName}; generate a new preview.`);
        }
    }

    const results = await db.applyDiscordRosterChanges(preview.changes);
    const createdMembers = [];
    for (const newMember of preview.newMembers) {
        const current = await db.getDiscordRosterMemberByDiscordId(newMember.discordID);
        if (current) {
            throw new Error(`Discord recruit ${newMember.memberName} already exists; generate a new preview.`);
        }
        const discordMember = await guild.members.fetch(newMember.discordID);
        const recruitRank = (await db.getDiscordRankMappings())
            .find(rank => rank.rankName === 'Recruit');
        const statusRole = managedStatusRoles().member;
        if (!recruitRank || !statusRole ||
            !discordMember.roles.cache.has(recruitRank.DiscordRoleId) ||
            !discordMember.roles.cache.has(statusRole) ||
            (managedStatusRoles().reserve &&
                discordMember.roles.cache.has(managedStatusRoles().reserve))) {
            throw new Error(`Discord recruit ${newMember.memberName} no longer matches the preview.`);
        }
        const recruitParent = await db.getRecruitParent();
        if (!recruitParent || recruitParent.nodeId !== newMember.proposedParentNodeId) {
            throw new Error(`The proposed parent for ${newMember.memberName} is no longer eligible.`);
        }
        createdMembers.push(await db.createDiscordRecruitMember(
            newMember.memberName,
            newMember.discordID,
            newMember.proposedParentNodeId
        ));
    }
    previews.delete(previewId);
    return { previewId, results, createdMembers };
}

async function syncWebsiteMember(memberID) {
    if (!isAutomaticSyncEnabled()) {
        return { skipped: true, reason: 'Automatic Discord role synchronisation is disabled.' };
    }

    const websiteMember = await db.getDiscordRosterMember(memberID);
    if (!websiteMember || !websiteMember.MemberDiscordID) {
        return { skipped: true, reason: 'Member has no Discord ID.' };
    }

    const guild = await getGuild();
    const discordMember = await guild.members.fetch(websiteMember.MemberDiscordID);
    const mappings = await db.getDiscordRankMappings();
    const managedRankIds = mappings.map(rank => String(rank.DiscordRoleId));
    const desiredRankRole = mappings.find(rank => rank.rankID === websiteMember.playerRank);
    const statusRoles = managedStatusRoles();
    const desiredStatusRole = websiteMember.playerStatus === 'Reserve'
        ? statusRoles.reserve
        : websiteMember.playerStatus === 'Active'
            ? statusRoles.member
            : null;

    for (const roleId of managedRankIds) {
        if (roleId !== String(desiredRankRole && desiredRankRole.DiscordRoleId) &&
            discordMember.roles.cache.has(roleId)) {
            await discordMember.roles.remove(roleId, 'Website roster synchronisation');
        }
    }
    for (const roleId of [statusRoles.member, statusRoles.reserve]) {
        if (roleId && roleId !== desiredStatusRole && discordMember.roles.cache.has(roleId)) {
            await discordMember.roles.remove(roleId, 'Website roster synchronisation');
        }
    }
    if (desiredRankRole && !discordMember.roles.cache.has(desiredRankRole.DiscordRoleId)) {
        await discordMember.roles.add(desiredRankRole.DiscordRoleId, 'Website roster synchronisation');
    }
    if (desiredStatusRole && !discordMember.roles.cache.has(desiredStatusRole)) {
        await discordMember.roles.add(desiredStatusRole, 'Website roster synchronisation');
    }
    return { skipped: false, memberID };
}

module.exports = {
    createImportPreview,
    applyImportPreview,
    syncWebsiteMember
};
