async function populateTable() {
    const response = await fetch('/data/getmembers?withParents=true');
    const data = await response.json();
    const tableBody = document.querySelector('#membersTableBody');

    // Clear the table body
    tableBody.innerHTML = '';
    // Populate the table with new data
    data.forEach(member => {
        const row = document.createElement('tr');
        var date;
        var promo;
        if (member.DateOfJoin == null) {
            date = "N/A";
        } else {
            date = new Date(member.DateOfJoin).toDateString();
        }
        if (member.DateOfPromo == null) {
            promo = "N/A";
        } else {
            promo = new Date(member.DateOfPromo).toDateString();
        }
        row.innerHTML = `
            <td>${member.MemberID}</td>
            <td>${member.UName}</td>
            <td>${member.rankName}</td>
            <td>${member.Country}</td>
            <td>${member.parentUName}</td>
            <td>${member.playerStatus}</td>
            <td>${date}</td>
            <td>${promo}</td>
            <td>
              <button class="btn btn-primary" onclick="openEditModal(${member.MemberID})">Edit</button>
              <button class="btn btn-danger" onclick="deleteMember(${member.MemberID})">Delete</button>
              <button class="btn btn-success" onclick="tempModal(${member.MemberID}, '${member.UName}', '${member.rankName}', 'promote')">Promote</button>
              <button class="btn btn-danger" onclick="tempModal(${member.MemberID}, '${member.UName}', '${member.rankName}', 'demote')">Demote</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function tempModal(memberID, memberName, memberRank, action) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'), {
        backdrop: 'static'
    });

    console.log("Member ID: " + memberID);
    console.log("Member Name: " + memberName);
    console.log("Member Rank: " + memberRank);

    var prevent = false;
    var confirmButton = document.getElementById('confirmAction');

    const actionText = document.getElementById('confirmMessage');
    // actionText.textContent = action === 'promote' ? 'Promote' : 'Demote';
    if (action === 'promote') {
        var f = await fetch('/data/getRanks?aboveOrBelow=above&currentRank=' + memberRank);
        var rankData = await f.json();
        var newRank = rankData[0]?.rankName || null;
        if (rankData.length === 0) {
            createAlert('This member is already at the highest rank.', 'danger', 'confirmModal');
            prevent = true;
        }

        actionText.innerHTML = `Are you sure you want to promote <span class='highlight'>${memberName}</span><br>From <span class='highlight'>${memberRank}</span><br>To <span class='highlight'>${newRank}</span>?`;
        confirmButton.innerHTML = 'Promote';
        confirmButton.className = 'btn btn-success';
    } else {
        var f = await fetch('/data/getRanks?aboveOrBelow=demote&currentRank=' + memberRank);
        var rankData = await f.json();
        var newRank = rankData[0]?.rankName || null;
        if (rankData.length === 0) {
            createAlert('This member is already at the lowest rank.', 'danger', 'confirmModal');
            prevent = true;
        }

        actionText.innerHTML = `Are you sure you want to demote <span class='highlight'>${memberName}</span><br>From <span class='highlight'>${memberRank}</span><br>To <span class='highlight'>${newRank}</span>?`;
        confirmButton.innerHTML = 'Demote';
        confirmButton.className = 'btn btn-danger';
    }

    modal.show();

    confirmButton.onclick = async function () {
        if (memberID && !prevent) {
            await changeMemberRankByOne(memberID, action, newRank);
            closeModal('tempModal');
        } else {
            createAlert('Please select a valid member.', 'danger', 'confirmModal');
        }
    };
}

function createAlert(message, type, form) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = "alert";
    alert.innerHTML = message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    alert.id = "imageAlertMessage";
    var formEl = document.getElementById(form)
    formEl.prepend(alert);
    return alert;
}

async function changeMemberRankByOne(memberID, promoteOrDemote, newRank) {

    var response;
    var result;

    switch (promoteOrDemote) {
        case 'promote':
            response = await fetch('/data/changeRank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "memberID": memberID, "newRank": newRank })
            });
            result = await response.json();
            console.log("PROMOTION RESULT: " + result);
            break;

        case 'demote':
            response = await fetch('/data/changeRank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "memberID": memberID, "newRank": newRank })
            });
            result = await response.json();
            console.log("DEMOTION RESULT: " + result);
            break;

        default:
            break;
    }

    if (response.ok) {
        alert('Member promoted successfully');
        location.reload();
    } else {
        alert('Failed to promote member');
    }
}

async function deleteMember(memberID) {

    var confirmation = confirm("Are you sure you want to delete member #" + memberID + "?");

    if (confirmation) {
        const response = await fetch('/data/deleteMember', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "memberID": memberID })
        });

        var result = await response.json();
        console.log("DELETION RESULT: " + result);

        if (response.ok) {
            alert('Member deleted successfully');
            location.reload();
        } else {
            alert('Failed to delete member');
        }
    } else {
        alert('Deletion cancelled');
    }
};

async function openEditModal(memberID) {
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'), {
        backdrop: 'static'
    });

    const ranks = await fetch('/data/getRanks?all=true');
    const ranksData = await ranks.json();

    const rankSelect = document.getElementById('rank');

    // Clear existing options
    rankSelect.innerHTML = '';
    // Populate the select element with new options
    ranksData.forEach(rank => {
        var option = document.createElement('option');
        option.value = rank.rankName;
        option.text = rank.rankName;
        rankSelect.appendChild(option);
    });

    const response = await fetch(`/data/fullmemberinfo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberID })
    });
    const data = await response.json();

    const idelement = document.getElementById('memberid');
    const nameelement = document.getElementById('uname');
    const countryelement = document.getElementById('country');
    const parentSelect = document.getElementById('reporting');
    const statuselement = document.getElementById('status');
    const joineddateelement = document.getElementById('joined');
    const promoelement = document.getElementById('promoDate');

    idelement.value = data.MemberID;
    idelement.setAttribute("readonly", "true");
    nameelement.value = data.UName;
    rankSelect.value = data.rankName;
    countryelement.value = data.Country;

    if (data.playerStatus == null) {
        statuselement.value = "Inactive";
    }
    statuselement.value = data.playerStatus;
    if (data.DateOfJoin == null) {
        joineddateelement.value = "";
    } else {
        joineddateelement.value = new Date(data.DateOfJoin).toISOString().split('T')[0];
    }
    if (data.DateOfPromo == null) {
        promoelement.value = "";
    } else {
        promoelement.value = new Date(data.DateOfPromo).toISOString().split('T')[0];
    }

    // Get all available parents (Members with a higher rank, that are leaders)

    const parentResponse = await fetch('/data/seniorMembers');
    const parentData = await parentResponse.json();
    // Clear existing options
    parentSelect.innerHTML = '';
    // Populate the select element with new options
    var option = document.createElement('option');
    option.value = "None";
    option.text = "None";
    parentSelect.appendChild(option);
    for (var p of parentData) {
        var option = document.createElement('option');
        option.value = p.UName;
        option.text = p.UName;
        parentSelect.appendChild(option);
        if (p.MemberID == data.MemberID) {
            option.selected = true; // Select the current member's parent
        }
    }

    if (data.parentUName == null) {
        parentSelect.value = "None";
        parentSelect.setAttribute("readonly", "true");
    } else {
        parentSelect.value = data.parentUName;
        parentSelect.removeAttribute("readonly");
    }

    modal.show();
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        modal.hide();
    }
}

async function openCreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('createUserModal'), {
        backdrop: 'static'
    });

    const ranks = await fetch('/data/getRanks?all=true');
    const ranksData = await ranks.json();

    const rankSelect = document.getElementById('new-rank');

    // Clear existing options
    rankSelect.innerHTML = '';
    // Populate the select element with new options
    ranksData.forEach(rank => {
        var option = document.createElement('option');
        option.value = rank.rankName;
        option.text = rank.rankName;
        rankSelect.appendChild(option);
    });

    rankSelect.value = 'Recruit';
    rankSelect.setAttribute("readonly", "true");

    const joinedElement = document.getElementById('new-joined');

    joinedElement.value = new Date().toISOString().split('T')[0];

    modal.show();
}

populateTable();