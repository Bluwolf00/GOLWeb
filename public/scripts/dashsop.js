async function populate() {
    const response = await fetch('/data/getSops');
    if (!response.ok) {
        console.error('Failed to fetch SOPs:', response.statusText);
        return;
    }
    
    const sops = await response.json();
    const tableBody = document.getElementById('sopsTableBody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    sops.forEach(sop => {
        const row = document.createElement('tr');

        if (sop.rankDescription === null || sop.rankDescription === '') {
            sop.rankDescription = 'No description available';
        }

        if (sop.isAAC === 1 || sop.isAAC === '1') {
            sop.isAAC = 'Yes';
        } else if (sop.isAAC === 0 || sop.isAAC === '0') {
            sop.isAAC = 'No';
        }
        
        row.innerHTML = `
            <th><span>${sop.sopID}</span></th>
            <td><span>${sop.sopTitle}</span></td>
            <td><span>${sop.authors}</span></td>
            <td><span class="text-body-secondary sopDescription">${sop.sopDescription}</span></td>
            <td><span>${sop.sopType}</span></td>
            <td><span>${sop.sopDocID}</span></td>
            <td><span>${sop.isAAC}</span></td>
            <td>
              <button class="btn btn-primary" onclick="openEditModal(${sop.sopID})">Edit</button>
              <button class="btn btn-danger" onclick="deleteSOP(${sop.sopID})">Delete</button>
            </td>
        `;
        // <button class="btn btn-danger" onclick="deleteMember(${rank.ID})">Delete</button>
        tableBody.appendChild(row);
    });
}

// Function that will hold all functions that will be called when the file is called
function init() {
    populate();

    document.getElementById('submitSopEditBtn').addEventListener('click', async (event) => {
        event.preventDefault();
        createAlert('This feature is not yet implemented.', 'warning', 'editSopModal', 3000);
    });

    document.getElementById('editSopForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        createAlert('This feature is not yet implemented.', 'warning', 'editSopModal', 3000);
    });
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        modal.hide();
    }
}

async function openEditModal(sopID) {
    const modal = new bootstrap.Modal(document.getElementById('editSopModal'));
    const response = await fetch(`/data/getSOPbyID?sopID=${sopID}`);
    
    if (!response.ok) {
        console.error('Failed to fetch SOP:', response.statusText);
        return;
    }
    
    const sop = await response.json();

    console.log(sop);

    var sopTitle = document.getElementById('sopTitle');
    sopTitle.value = sop.sopTitle;
    sopTitle.ariaDisabled = true;
    sopTitle.disabled = true;
    var authors = document.getElementById('authors');
    authors.value = sop.prefix;
    authors.ariaDisabled = true;
    authors.disabled = true;

    var description = document.getElementById('description');
    description.value = sop.rankDescription;

    var docid = document.getElementById('documentType');
    docid.value = sop.sopType;
    docid.ariaDisabled = true;
    docid.disabled = true;

    var docid = document.getElementById('documentID');
    docid.value = sop.sopDocID;
    docid.ariaDisabled = true;
    docid.disabled = true;
    
    modal.show();
}

function createAlert(message, type, form, timeout = -1) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
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