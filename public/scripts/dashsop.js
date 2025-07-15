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

        if (sop.sopDescription === null || sop.sopDescription === '' || sop.sopDescription === undefined) {
            sop.sopDescription = 'No description available';
        }

        if (sop.isAAC === 1 || sop.isAAC === '1') {
            sop.isAAC = 'Yes';
        } else if (sop.isAAC === 0 || sop.isAAC === '0') {
            sop.isAAC = 'No';
        }

        if (sop.isRestricted === 1 || sop.isRestricted === '1') {
            sop.isRestricted = 'Yes';
        } else if (sop.isRestricted === 0 || sop.isRestricted === '0') {
            sop.isRestricted = 'No';
        }
        
        row.innerHTML = `
            <th><span>${sop.sopID}</span></th>
            <td><span>${sop.sopTitle}</span></td>
            <td><span>${sop.authors}</span></td>
            <td><span class="text-body-secondary sopDescription">${sop.sopDescription}</span></td>
            <td><span>${sop.sopType}</span></td>
            <td><span>${sop.sopDocID}</span></td>
            <td><span>${sop.isAAC}</span></td>
            <td><span>${sop.isRestricted}</span></td>
            <td>
              <button class="btn btn-primary" onclick="openEditModal(${sop.sopID})">Edit</button>
              <button class="btn btn-danger" onclick="deleteSOP(${sop.sopID})">Delete</button>
            </td>
        `;
        // <button class="btn btn-danger" onclick="deleteMember(${rank.ID})">Delete</button>
        tableBody.appendChild(row);
    });
}

async function handleCreateSOP() {
    const formData = new FormData(document.getElementById('createSopForm'));
        const response = await fetch('/data/createSop', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            createAlert('SOP created successfully!', 'success', 'createSopModal', 3000);
            closeModal('createSopModal');
            populate();
        } else {
            createAlert('Failed to create SOP. Please try again.', 'danger', 'createSopModal', 3000);
        }
}

async function handleEditSOP() {
    const formData = new FormData(document.getElementById('editSopForm'));
    const response = await fetch('/data/editSop', {
        method: 'POST',
        body: formData
    });

    if (response.ok) {
        createAlert('SOP updated successfully!', 'success', 'editSopModal', 3000);
        closeModal('editSopModal');
        populate();
    } else {
        createAlert('Failed to update SOP. Please try again.', 'danger', 'editSopModal', 3000);
    }
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

    document.getElementById('submitSopCreateBtn').addEventListener('click', async (event) => {
        event.preventDefault();
        await handleCreateSOP();
    });

    document.getElementById('createSopForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleCreateSOP();
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

    // console.log(sop);

    var sopTitle = document.getElementById('sopTitle');
    sopTitle.value = sop.sopTitle;
    var authors = document.getElementById('authors');
    authors.value = sop.authors;

    var description = document.getElementById('description');
    description.value = sop.sopDescription;

    var docid = document.getElementById('documentType');
    docid.value = sop.sopType;

    var docid = document.getElementById('documentID');
    docid.value = sop.sopDocID;

    var isAAC = document.getElementById('aacSOP');
    if (sop.isAAC === 'Yes' || sop.isAAC === 1)
        isAAC.checked = true;
    else
        isAAC.checked = false;

    var isRestricted = document.getElementById('restrictedDoc');
    if (sop.isRestricted === 'Yes' || sop.isRestricted === 1)
        isRestricted.checked = true;
    else
        isRestricted.checked = false;


    
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

async function openCreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('createSopModal'), {
        backdrop: 'static'
    });
    modal.show();
}

init();