let discordImportPreview = null;

function setDiscordImportMessage(message, type) {
    const element = document.getElementById('discordImportMessage');
    element.textContent = message;
    element.className = `alert alert-${type}`;
}

function renderDiscordImportPreview(preview) {
    const results = document.getElementById('discordImportResults');
    results.replaceChildren();

    const summary = document.createElement('p');
    summary.textContent = `${preview.changes.length} change(s) and ${preview.newMembers.length} new recruit(s) found. ${preview.conflicts.length} conflict(s) require attention.`;
    results.appendChild(summary);

    if (preview.newMembers.length > 0) {
        const heading = document.createElement('h6');
        heading.textContent = 'New website members to create';
        results.appendChild(heading);
        const list = document.createElement('ul');
        preview.newMembers.forEach(member => {
            const item = document.createElement('li');
            item.textContent = `${member.memberName} - Recruit, Active, reports to ${member.proposedParentName} (${member.proposedParentNodeId})`;
            list.appendChild(item);
        });
        results.appendChild(list);
    }

    if (preview.changes.length > 0) {
        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = '<thead><tr><th>Member</th><th>Website rank</th><th>Discord rank</th><th>Website status</th><th>New status</th><th>Reports to</th></tr></thead>';
        const body = document.createElement('tbody');
        preview.changes.forEach(change => {
            const row = document.createElement('tr');
            [
                change.memberName,
                change.currentRank,
                change.proposedRank,
                change.currentStatus,
                change.proposedStatus,
                change.proposedParentName
                    ? `${change.proposedParentName} (${change.proposedParentNodeId})`
                    : change.proposedParentNodeId || 'None'
            ].forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });
            body.appendChild(row);
        });
        table.appendChild(body);
        results.appendChild(table);
    }

    if (preview.conflicts.length > 0) {
        const heading = document.createElement('h6');
        heading.textContent = 'Conflicts not included';
        results.appendChild(heading);
        const list = document.createElement('ul');
        preview.conflicts.forEach(conflict => {
            const item = document.createElement('li');
            item.textContent = `${conflict.memberName}: ${conflict.reason}`;
            list.appendChild(item);
        });
        results.appendChild(list);
    }

    document.getElementById('applyDiscordImportBtn').disabled =
        preview.changes.length === 0 && preview.newMembers.length === 0;
}

async function previewDiscordRankImport() {
    const modal = new bootstrap.Modal(document.getElementById('discordImportModal'));
    modal.show();
    setDiscordImportMessage('Loading Discord members and calculating changes...', 'info');
    document.getElementById('applyDiscordImportBtn').disabled = true;
    try {
        const response = await fetch('/data/discord-rank-import/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Unable to create preview.');
        }
        discordImportPreview = result;
        renderDiscordImportPreview(result);
        setDiscordImportMessage('Review the proposed changes before applying them.', 'info');
    } catch (error) {
        discordImportPreview = null;
        setDiscordImportMessage(error.message, 'danger');
    }
}

async function applyDiscordRankImport() {
    if (!discordImportPreview ||
        (discordImportPreview.changes.length === 0 && discordImportPreview.newMembers.length === 0)) {
        return;
    }
    const totalActions = discordImportPreview.changes.length + discordImportPreview.newMembers.length;
    if (!window.confirm(`Apply ${totalActions} website roster action(s)?`)) {
        return;
    }

    const button = document.getElementById('applyDiscordImportBtn');
    button.disabled = true;
    try {
        const response = await fetch('/data/discord-rank-import/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewId: discordImportPreview.previewId })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Unable to apply import.');
        }
        setDiscordImportMessage('Import applied successfully. Refreshing the dashboard...', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        setDiscordImportMessage(error.message, 'danger');
        button.disabled = false;
    }
}
