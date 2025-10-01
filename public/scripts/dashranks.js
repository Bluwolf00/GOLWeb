async function populate() {
    const response = await fetch('/data/getCompRanks');
    if (!response.ok) {
        console.error('Failed to fetch ranks:', response.statusText);
        return;
    }
    
    const ranks = await response.json();
    const tableBody = document.getElementById('ranksTableBody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    ranks.forEach(rank => {
        const row = document.createElement('tr');

        if (rank.prefix === 'Rsv') {
            rank.rankPath = 'img/rank/Rsv.png';
        }

        if (rank.rankDescription === null || rank.rankDescription === '') {
            rank.rankDescription = 'No description available';
        }
        
        row.innerHTML = `
            <th><span>${rank.rankID}</span></th>
            <td><span>${rank.rankName}</span></td>
            <td><span>${rank.prefix}</span></td>
            <td><span class="text-body-secondary rankDescription">${rank.rankDescription}</span></td>
            <td><img src="/${rank.rankPath}" alt="${rank.prefix}" class="rank-image"></td>
            <td>
              <button class="btn btn-primary" onclick="openEditModal(${rank.rankID})">Edit</button>
            </td>
        `;
        // <button class="btn btn-danger" onclick="deleteMember(${rank.ID})">Delete</button>
        tableBody.appendChild(row);
    });

    new DataTable('#ranksTable', {
        paging: true,
        searching: true,
        info: false,
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: 5 }]
    });
}

// Function that will hold all functions that will be called when the file is called
function init() {
    populate();

    document.getElementById('submitRankEditBtn').addEventListener('click', async (event) => {
        event.preventDefault();
        createAlert('This feature is not yet implemented.', 'warning', 'editRankModal', 3000);
    });

    document.getElementById('editRankForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        createAlert('This feature is not yet implemented.', 'warning', 'editRankModal', 3000);
    });
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        modal.hide();
    }
}

async function openEditModal(rankID) {
    const modal = new bootstrap.Modal(document.getElementById('editRankModal'));
    const response = await fetch(`/data/getRankByID?rankID=${rankID}`);
    
    if (!response.ok) {
        console.error('Failed to fetch rank:', response.statusText);
        return;
    }
    
    const rank = await response.json();
    
    // Allow the user to edit the description only, this will be changed in the future

    var rankName = document.getElementById('rankname');
    rankName.value = rank.rankName;
    rankName.ariaDisabled = true;
    rankName.disabled = true;
    var prefix = document.getElementById('prefix');
    prefix.value = rank.prefix;
    prefix.ariaDisabled = true;
    prefix.disabled = true;

    var description = document.getElementById('description');
    description.value = rank.rankDescription;

    var insignia = document.getElementById('insignia');
    insignia.value = `/${rank.rankPath}`;
    insignia.ariaDisabled = true;
    insignia.disabled = true;
    
    modal.show();
    return modal;
}

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
    var formEl = document.getElementById(form)
    formEl.prepend(alert);

    if (timeout > 0) {
        setTimeout(function () {
            if (document.getElementById("imageAlertMessage") !== null) {
                $('#imageAlertMessage').alert('close');
            }
        }, timeout);
    }
}

init();