function createAlert(message, type, form, timeout = -1) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.position = "sticky";
    alert.style.zIndex = "9999";
    alert.style.top = "0";
    alert.role = "alert";
    alert.innerHTML = message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    alert.id = "imageAlertMessage";
    if (form === "main") {
        var formEl = document.querySelector("main");
    } else {
        var formEl = document.getElementById(form)
    }
    formEl.prepend(alert);

    if (timeout > 0) {
        setTimeout(function () {
            if (document.getElementById("imageAlertMessage") !== null) {
                $('#imageAlertMessage').alert('close');
            }
        }, timeout);
    }
}

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
            <td><a style="text-decoration: none;" href="/profile?=${member.UName}">${member.UName}</a></td>
            <td data-order="${member.playerRank}">${member.rankName}</td>
            <td>${member.Country}</td>
            <td>${member.parentUName}</td>
            <td>${member.playerStatus}</td>
            <td data-order="${member.DateOfJoin}">${date}</td>
            <td data-order="${member.DateOfPromo}">${promo}</td>
            <td>
              <button class="btn btn-primary" onclick="openEditModal(${member.MemberID})">Edit</button>
              <button class="btn btn-danger" onclick="deleteMember(${member.MemberID})">Delete</button>
              <button class="btn btn-success" onclick="tempModal(${member.MemberID}, '${member.UName}', '${member.rankName}', 'promote')">Promote</button>
              <button class="btn btn-danger" onclick="tempModal(${member.MemberID}, '${member.UName}', '${member.rankName}', 'demote')">Demote</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if ($.fn.DataTable.isDataTable('#membersTable')) {
        $('#membersTable').DataTable();
    } else {
        new DataTable('#membersTable', {
            paging: true,
            searching: true,
            info: false,
            order: [[0, 'asc']],
            columnDefs: [{ orderable: false, targets: 8 }]
        });
    }
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
    var activeGroup = document.createElement('optgroup');
    activeGroup.label = "Active Leaders";
    activeGroup.id = "activeLeaders";
    for (var p of parentData) {
        var option = document.createElement('option');
        option.value = p.UName;
        option.text = p.UName;
        activeGroup.appendChild(option);
        if (p.MemberID == data.MemberID) {
            option.selected = true; // Select the current member's parent
        }
    }
    parentSelect.appendChild(activeGroup);

    // Append reservist parent options
    // These are hard coded for now, but could be fetched from the server if needed
    var reservistGroup = document.createElement('optgroup');
    reservistGroup.label = "Reservist Leaders";
    reservistGroup.id = "reservistLeaders";
    var reservistOptions = [
        { value: "Knight", text: "Knight" },
        { value: "Camel", text: "Camel" },
        { value: "WHYZE", text: "WHYZE" }
    ];

    reservistOptions.forEach(optionData => {
        var option = document.createElement('option');
        option.value = optionData.value;
        option.text = optionData.text;
        option.disabled = true; // Disable reservist options
        if (data.rankName !== "Reservist") {
            option.disabled = false; // Enable if the member is not a reservist
        }
        reservistGroup.appendChild(option);
        if (optionData.value == data.parentUName) {
            option.selected = true; // Select the current member's parent
        }
    });
    parentSelect.appendChild(reservistGroup);

    if (data.parentUName == null) {
        parentSelect.value = "None";
        parentSelect.setAttribute("readonly", "true");
    } else {
        parentSelect.value = data.parentUName;
        parentSelect.removeAttribute("readonly");
    }

    switchReporting('reporting');

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

    // Get all available parents (Members with a higher rank, that are leaders)

    const parentSelect = document.getElementById('new-reporting');
    const parentResponse = await fetch('/data/seniorMembers');
    const parentData = await parentResponse.json();
    // Clear existing options
    parentSelect.innerHTML = '';
    // Populate the select element with new options
    var option = document.createElement('option');
    option.value = "None";
    option.text = "None";
    parentSelect.appendChild(option);
    var activeGroup = document.createElement('optgroup');
    activeGroup.label = "Active Leaders";
    activeGroup.id = "activeLeaders";
    for (var p of parentData) {
        var option = document.createElement('option');
        option.value = p.UName;
        option.text = p.UName;
        activeGroup.appendChild(option);
    }
    parentSelect.appendChild(activeGroup);

    // Append reservist parent options
    // These are hard coded for now, but could be fetched from the server if needed
    var reservistGroup = document.createElement('optgroup');
    reservistGroup.label = "Reservist Leaders";
    reservistGroup.id = "reservistLeaders";
    var reservistOptions = [
        { value: "Knight", text: "Knight" },
        { value: "Camel", text: "Camel" },
        { value: "WHYZE", text: "WHYZE" }
    ];

    reservistOptions.forEach(optionData => {
        var option = document.createElement('option');
        option.value = optionData.value;
        option.text = optionData.text;
        option.disabled = true; // Disable reservist options
        reservistGroup.appendChild(option);
    });
    parentSelect.appendChild(reservistGroup);

    const joinedElement = document.getElementById('new-joined');

    joinedElement.value = new Date().toISOString().split('T')[0];

    modal.show();
}

function switchReporting(parentSelectId) {
    const parentSelect = document.getElementById(parentSelectId);

    if (parentSelectId === 'reporting') {
        var selectedRank = document.getElementById('rank').value;
        var memberStatus = document.getElementById('status');
    } else {
        var selectedRank = document.getElementById('new-rank').value;
        var memberStatus = document.getElementById('new-status');
    }

    // console.log("Selected Rank: " + selectedRank);

    if (selectedRank === 'Reserve') {
        // Disable all active leader options
        Array.from(parentSelect.options).forEach(option => {
            if (option.parentNode.label === "Active Leaders") {
                option.disabled = true;
            }
            if (option.parentNode.label === "Reservist Leaders") {
                option.disabled = false; // Enable reservist options
            }
        });
        if (parentSelectId === 'reporting') {
            memberStatus.value = "Reserve"; // Set status to Reservist
            memberStatus.setAttribute("readonly", "true");
            memberStatus.disabled = true; // Disable status selection
            memberStatus.classList.add("hover-blocked"); // Add a class to visually block the status option
        }
    } else {
        // Enable all active leader options
        Array.from(parentSelect.options).forEach(option => {
            if (option.parentNode.label === "Active Leaders") {
                option.disabled = false;
            }
            if (option.parentNode.label === "Reservist Leaders") {
                option.disabled = true; // Disable reservist options
            }
        });
        if (parentSelectId === 'reporting') {
            memberStatus.value = "Active"; // Set status to Reservist
            memberStatus.setAttribute("readonly", "false");
            memberStatus.disabled = false; // Disable status selection
            memberStatus.classList = "form-select"; // Add a class to visually block the status option
        }
    }

    // If the selected rank is not 'Reservist', ensure the parent select is not readonly
    if (selectedRank !== 'Reserve') {
        parentSelect.removeAttribute("readonly");
    } else {
        parentSelect.setAttribute("readonly", "true");
    }
}

async function onEditSubmit() {
    const memberid = document.getElementById('memberid').value;
    const uname = document.getElementById('uname').value;
    const rank = document.getElementById('rank').value;
    const country = document.getElementById('country').value;
    const reporting = document.getElementById('reporting').value;
    const status = document.getElementById('status').value;

    const joined = document.getElementById('joined').value;
    const promoDate = document.getElementById('promoDate').value;

    if (!memberid || !uname || !rank || !country || !reporting || !status) {
        createAlert('Please fill in all fields.', 'danger', 'editUserModal');
        return;
    }

    const response = await fetch('/data/updateMember', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            memberid,
            uname,
            rank,
            country,
            reporting,
            status,
            joined,
            promoDate
        })
    });

    if (response.ok) {
        createAlert('Member updated successfully', 'success', 'editUserModal', 3000);
        setTimeout(() => {
            closeModal('editUserModal');
        }, 3000);
        populateTable();
    } else {
        createAlert('Failed to update member', 'danger', 'editUserModal', 3000);
    }
}

// This function will force update the attendance of all members.
async function updateMemberAttendance() {

    document.getElementById('updateAttendanceButton').disabled = true;
    document.getElementById('updateAttendanceButton').innerText = "Updating...";

    const response = await fetch('/data/updateMemberAttendance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "forceRefresh": true
        })
    });

    if (response.ok) {
        createAlert('Member attendance updated successfully', 'success', 'main', 3000);
        setTimeout(() => {
            document.getElementById('updateAttendanceButton').disabled = false;
            document.getElementById('updateAttendanceButton').innerText = "Force Attendance Refresh";
            populateTable();
        }, 3000);
    } else {
        createAlert('Failed to update member attendance', 'danger', 'main', 3000);
        setTimeout(() => {
            document.getElementById('updateAttendanceButton').disabled = false;
            document.getElementById('updateAttendanceButton').innerText = "Force Attendance Refresh";
        }, 3000);
    }
}

function searchMemberTable() {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("searchMemberTableInput");
    filter = input.value.toUpperCase();
    table = document.getElementById("membersTable");
    tr = table.getElementsByTagName("tr");

    // Loop through all table rows, except the first (header row)
    for (i = 1; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[1]; // Assuming the second column contains the member name
        if (td) {
            txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

// TODO
function init() {
    var rankSelect = document.getElementById('rank');
    rankSelect.addEventListener('change', async function () {
        switchReporting('reporting');
        let selectedRank = rankSelect.value;
        let parentSelect = document.getElementById('reporting');
        if (selectedRank === 'Reserve') {
            let firstReservistOption = parentSelect.querySelector('optgroup[label="Reservist Leaders"] option');
            if (firstReservistOption) {
                parentSelect.value = firstReservistOption.value; // Set to the first reservist leader
            } else {
                parentSelect.value = "None"; // Fallback if no reservist leaders are available
            }
        } else {
            let firstActiveOption = parentSelect.querySelector('optgroup[label="Active Leaders"] option');
            if (firstActiveOption) {
                parentSelect.value = firstActiveOption.value; // Set to the first active leader
            } else {
                parentSelect.value = "None"; // Fallback if no active leaders are available
            }
        }
    });

    var rankSelect = document.getElementById('new-rank');
    rankSelect.addEventListener('change', async function () {
        switchReporting('new-reporting');
        let selectedRank = rankSelect.value;
        let parentSelect = document.getElementById('new-reporting');
        if (selectedRank === 'Reserve') {
            let firstReservistOption = parentSelect.querySelector('optgroup[label="Reservist Leaders"] option');
            if (firstReservistOption) {
                parentSelect.value = firstReservistOption.value; // Set to the first reservist leader
            } else {
                parentSelect.value = "None"; // Fallback if no reservist leaders are available
            }
        } else {
            let firstActiveOption = parentSelect.querySelector('optgroup[label="Active Leaders"] option');
            if (firstActiveOption) {
                parentSelect.value = firstActiveOption.value; // Set to the first active leader
            } else {
                parentSelect.value = "None"; // Fallback if no active leaders are available
            }
        }
    });

    const editModalSubmit = document.getElementById('editUserModalSubmit');
    editModalSubmit.addEventListener('click', async function (e) {
        e.preventDefault();
        await onEditSubmit();
    });
    const editUserForm = document.getElementById('editUserForm');
    editUserForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await onEditSubmit();
    });
}

populateTable();
init();