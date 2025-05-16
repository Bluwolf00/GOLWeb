async function populateTable() {
    const response = await fetch('/data/getfullmembers');
    const data = await response.json();
    const tableBody = document.querySelector('#membersTableBody');
    console.log(data);

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
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function deleteMember(memberID) {

    var confirmation = confirm("Are you sure you want to delete member #" + memberID + "?");

    if (confirmation) {
        const response = await fetch('/data/deleteMember', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memberID })
        });
    
        if (response.ok) {
            alert('Member deleted successfully');
            populateTable();
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
    })

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
    const parentelement = document.getElementById('reporting');
    const statuselement = document.getElementById('status');
    const joineddateelement = document.getElementById('joined');
    const promoelement = document.getElementById('promoDate');

    idelement.value = data.MemberID;
    idelement.setAttribute("readonly", "true");
    nameelement.value = data.UName;
    rankSelect.value = data.rankName;
    countryelement.value = data.Country;
    if (data.parentUName == null) {
        parentelement.value = "None";
        parentelement.setAttribute("readonly", "true");
    } else {
        parentelement.value = data.parentUName;
        parentelement.removeAttribute("readonly");
    }
    statuselement.value = data.status;
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
    
    modal.show();
}

async function closeEditModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    if (modal) {
        modal.hide();
    }
}

populateTable();