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

async function populateComps() {
    // This function fetches the available compositions from the server and returns them as an array.
    try {
        var response = await fetch('/data/getMissionCompositions');
        if (!response.ok) {
            console.error('Failed to fetch compositions:', response.statusText);
            return [];
        }
        var compositions = await response.json();
        return compositions;
    } catch (err) {
        console.error('Error fetching compositions:', err);
        createAlert('Failed to load compositions. Please try again later.', 'danger', 'main', 5000);
        return [];
    }
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        modal.hide();
    }
}

async function openCreateModal() {

    const modal = new bootstrap.Modal(document.getElementById('createMissionModal'), {
        backdrop: 'static'
    });

    // Populate the composition select field
    document.getElementById('missionCompNew').innerHTML = ""; // Clear existing options
    var compArray = await populateComps();
    for (let comp of compArray) {
        var option = document.createElement("option");
        option.value = comp.templateID;
        option.textContent = comp.composition;
        document.getElementById('missionCompNew').appendChild(option);
    }

    modal.show();
}

async function openEditModal(missionId) {

    const modal = new bootstrap.Modal(document.getElementById('editMissionModal'), {
        backdrop: 'static'
    });

    // Get the mission info
    var response = await fetch(`/data/getMission?missionId=${missionId}`);
    if (!response.ok) {
        console.error('Failed to fetch mission:', response.statusText);
        return;
    }

    var mission = await response.json();

    // Populate the form fields
    var missionComposition = mission[0].composition;
    document.getElementById('missionID').value = missionId;

    // Surely there must be a more efficient way to do this, but this works for now
    // The process is this:
    // MySQL will display the date in Local format when viewing it, but store it in UTC format.
    // Once retrieved, it is in UTC format
    // When converting the date to a date object. The constructor will interpret it as UTC.
    // Therefore, we need to convert it to a string that includes the UTC timezone.
    // Then we have to manually format the date to the desired format (YYYY-MM-DD HH:MM)
    // As the .toISOString() method will return the date in UTC format, which is not what we want.
    // I have spent too much time on this already, I may revisit this later.

    var missionDate = mission[0].dateOfMission.replace("T", " ").replace("Z", "");
    var missionDateString = missionDate + " UTC";
    var formattedDate = new Date(missionDateString);

    var year = formattedDate.getFullYear();
    var month = String(formattedDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    var day = String(formattedDate.getDate()).padStart(2, '0');
    var hours = String(formattedDate.getHours()).padStart(2, '0');
    var minutes = String(formattedDate.getMinutes()).padStart(2, '0');

    var formattedDateString = `${year}-${month}-${day} ${hours}:${minutes}`;

    document.getElementById('missionDatetime').value = formattedDateString;

    // Populate the composition select field
    document.getElementById('missionComp').innerHTML = ""; // Clear existing options
    var compArray = await populateComps();
    for (let comp of compArray) {
        var option = document.createElement("option");
        option.value = comp.templateID;
        option.textContent = comp.composition;
        if (comp.composition === missionComposition) {
            option.selected = true; // Set the current composition as selected
        }
        document.getElementById('missionComp').appendChild(option);
    }

    modal.show();
}

async function populateTable() {
    try {
        var response = await fetch('/data/getMission');
        if (!response.ok) {
            console.error('Failed to fetch missions:', response.statusText);
            return;
        }
        var missions = await response.json();

        // Check if there are any missions
        if (missions.length === 0) {
            createAlert('No missions found.', 'info', 'main', 5000);
            return;
        }

        var tableBody = document.getElementById("missionsTableBody");
        tableBody.innerHTML = ""; // Clear existing rows

        missions.forEach(mission => {

            // Convert the dateOfMission stored as UTC to local time
            var missionDate = new Date(mission.dateOfMission).toLocaleString('en-GB', {
                timeStyle: 'long',
                dateStyle: 'long'
            });

            var row = document.createElement("tr");
            row.innerHTML = `
                <th scope="row">${mission.missionID}</th>
                <td>${mission.templateID}</td>
                <td>${mission.composition}</td>
                <td>${mission.filledSlots}</td>
                <td>${mission.size}</td>
                <td data-order="${mission.dateOfMission}">${missionDate}</td>
                <td>
                    <button class="btn btn-primary" onclick="openEditModal(${mission.missionID})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteMission(${mission.missionID})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error populating table:', error);
        createAlert('Failed to load missions. Please try again later.', 'danger', 'main', 5000);
    }

    if ($.fn.DataTable.isDataTable('#missionsTable')) {
        $('#missionsTable').DataTable();
    } else {
        new DataTable('#missionsTable', {
            paging: true,
            searching: true,
            info: false,
            order: [[0, 'asc']],
            columnDefs: [{ orderable: false, targets: 6 }]
        });
    }
}

async function deleteMission(missionId) {
    if (confirm("Are you sure you want to delete this mission? This action cannot be undone.")) {
        try {
            const response = await fetch(`/data/deleteMission?missionId=${missionId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                createAlert('Mission deleted successfully!', 'success', 'main', 3000);
                populateTable();
            } else {
                createAlert('Failed to delete mission. Please try again.', 'danger', 'main', 3000);
            }
        } catch (error) {
            console.error('Error deleting mission:', error);
            createAlert('Error deleting mission. Please try again later.', 'danger', 'main', 5000);
        }
    }
}

async function sendFormData(formId) {
    try {

        const formData = new FormData(document.getElementById(formId));
        const data = {};
        formData.forEach((value, key) => {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });
        
        const response = await fetch('/data/missionorbatSubmission', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            if (formId === "editMissionForm") {
                createAlert('Mission updated successfully!', 'success', 'editMissionModal', 3000);
                setTimeout(() => {
                    closeModal('editMissionModal');
                }, 3000);
            } else {
                createAlert('Mission created successfully!', 'success', 'createMissionModal', 3000);
                setTimeout(() => {
                    closeModal('createMissionModal');
                }, 3000);
            }
            populateTable();
        } else {
            if (formId === "editMissionForm") {
                createAlert('Failed to update mission. Please try again.', 'danger', 'editMissionModal', 3000);
                setTimeout(() => {
                    closeModal('editMissionModal');
                }, 3000);
            } else {
                createAlert('Failed to create mission. Please try again.', 'danger', 'createMissionModal', 3000);
                setTimeout(() => {
                    closeModal('createMissionModal');
                }, 3000);
            }
        }
    } catch (error) {
        console.error('Error creating mission:', error);
        createAlert('Error creating mission. Please try again later.', 'danger', 'createMissionModal', 5000);
    }
}

function init() {
    // Populate the table when the page loads
    populateTable();

    // Add event listeners for the create and edit forms
    document.getElementById("createMissionForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        await sendFormData("createMissionForm");
    });

    document.getElementById("editMissionForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        
        await sendFormData("editMissionForm");       
    });
}

init();