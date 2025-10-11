var imgEl = document.getElementById("badgeImagePreview");
var badgeImageInput;
var form;
const editCheckbox = document.getElementById("uploadimage");
const badgeImageSelect = document.getElementById("existingimage");

async function openCreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('createBadgeModal'), {
        backdrop: 'static'
    });
    modal.show();
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        if (modal._element.id === "createBadgeModal") {
            badgeImageInput = document.getElementById("newimage");
            imgEl = document.getElementById("badgeImagePreview");
        } else if (modal._element.id === "editBadgeModal") {
            badgeImageInput = document.getElementById("image");
            imgEl = document.getElementById("editBadgeImagePreview");
        } else if (modal._element.id === "assignBadgeModal") {
            imgEl = document.getElementById("assignBadgeImagePreview");
            badgeImageInput = "";
            document.getElementById("chosenBadge").value = ""; // Clear the badge selection
        }
        if (!badgeImageInput === "") {
            badgeImageInput.value = ""; // Clear the input
        }
        imgEl.src = ""; // Clear the image preview
        modal.hide();
    }
}

function isImage(filename) {
    return /\.(png)$/i.test(filename);
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

async function editBadge(badgeID) {
    const modal = new bootstrap.Modal(document.getElementById('editBadgeModal'), {
        backdrop: 'static'
    });
    const res = await fetch(`/data/getBadge?badgeID=${badgeID}`);
    const badgeData = await res.json();
    const badgeNameInput = document.getElementById("name");
    const badgeDescriptionInput = document.getElementById("desc");
    const badgePreview = document.getElementById("editBadgeImagePreview");
    const isQualificationInput = document.getElementById("qual");
    const badgeIDInput = document.getElementById("badgeid");

    var response = await fetch('/data/getAllBadgePaths');
    var allBadges = await response.json();
    for (var badge of allBadges) {
        var filename = badge.split('/').pop();
        var option = document.createElement("option");
        option.value = badge;
        option.textContent = filename;
        option.className = "badge-option";
        badgeImageSelect.appendChild(option);
        if (badge === `/${badgeData.badgePath}`) {
            badgeImageSelect.value = badge;
        }
    }

    badgeNameInput.value = badgeData.badgeName;
    badgeDescriptionInput.value = badgeData.badgeDescription;
    isQualificationInput.checked = badgeData.isQualification;
    badgeIDInput.value = badgeData.badgeID;
    badgePreview.src = badgeData.badgePath ? `/${badgeData.badgePath}` : '/img/badge/Placeholder_Badge.png';

    modal.show();
}

async function getMembersAssignedToBadge(badgeID) {
    const res = await fetch(`/data/assignedToBadge?badgeID=${badgeID}`);
    const members = await res.json();
    return members[0];
}

async function addMemberToBadge() {
    const memberSelect = document.getElementById("memberlist");
    const memberAssigned = document.getElementById("assignedMembers");

    var selectedOptions = Array.from(memberSelect.selectedOptions);
    if (selectedOptions.length > 0) {
        for (var selected of selectedOptions) {
            console.log("Selected member:", selected);
            // Check if the member is already assigned
            for (var i = 0; i < memberAssigned.options.length; i++) {
                if (memberAssigned.options[i].value === selected.value) {
                    createAlert("Member already assigned to this badge.", "warning", "assignBadgeForm", 3000);
                    return;
                }
            }

            // Create a new option for the assigned members list
            var option = document.createElement("option");
            option.value = selected.value;
            option.textContent = selected.textContent;
            memberAssigned.appendChild(option);

            // Remove the selected member from the available list
            memberSelect.remove(selected.index);
        }
    } else {
        createAlert("Please select a member to assign.", "warning", "assignBadgeForm", 3000);
    }
}

// This function will remove a member from the assigned members list
// It will also add the member back to the available members list
function removeMemberFromBadge() {
    const memberSelect = document.getElementById("memberlist");
    const memberAssigned = document.getElementById("assignedMembers");

    var selectedOptions = Array.from(memberAssigned.selectedOptions);
    console.log("Selected members to remove:", selectedOptions);

    if (selectedOptions.length > 0) {
        for (var selected of selectedOptions) {
            // Create a new option for the available members list
            var option = document.createElement("option");
            option.value = selected.value;
            option.textContent = selected.textContent;
            memberSelect.appendChild(option);

            // Remove the selected member from the assigned members list
            memberAssigned.remove(selected.index);
        }
    } else {
        createAlert("Please select a member to remove.", "warning", "assignBadgeForm", 3000);
    }
}

// This function will fire when the Assign Modal is opened
async function assignBadge(badgeID, badgePath) {
    const modal = new bootstrap.Modal(document.getElementById('assignBadgeModal'), {
        backdrop: 'static'
    });

    const badgeImagePreview = document.getElementById("assignBadgeImagePreview");
    const badgeIDInput = document.getElementById("chosenBadge");
    const memberAssigned = document.getElementById("assignedMembers");
    const memberSelect = document.getElementById("memberlist");
    const dateAcquiredInput = document.getElementById("dateAcquired");

    dateAcquiredInput.value = new Date().toISOString().split('T')[0]; // Set to today's date
    badgeIDInput.value = badgeID;
    badgeImagePreview.src = badgePath ? `/${badgePath}` : '/img/badge/Placeholder_Badge.png';
    memberAssigned.innerHTML = ""; // Clear existing options
    memberSelect.innerHTML = ""; // Clear existing options

    // Populate the assigned members list with members already assigned to the badge
    var assignedMembers = await getMembersAssignedToBadge(document.getElementById("chosenBadge").value);
    console.log(`Assigned members for badge ${badgeID}:`, assignedMembers);
    memberAssigned.innerHTML = ""; // Clear existing options
    assignedMembers.forEach(member => {
        var option = document.createElement("option");
        option.value = member.MemberID;
        option.textContent = member.UName;
        memberAssigned.appendChild(option);
    });

    // Populate the Members select dropdown
    const badgeRes = await fetch("/data/getMembers");
    const members = await badgeRes.json();
    // Populate the select options with member names
    members.forEach(member => {
        var c = 0;
        // Check if the member is already assigned to the badge
        var alreadyAssigned = assignedMembers.some(assigned => {
            return assigned.MemberID === member.MemberID;
        });
        console.log(`Result: ${alreadyAssigned}`);
        if (alreadyAssigned) {
            console.log(`Member ${member.UName} is already assigned to badge ${badgeID}, skipping.`);
            return; // Skip adding this member to the select
        }
        var option = document.createElement("option");
        option.value = member.MemberID;
        option.textContent = member.UName;
        memberSelect.appendChild(option);
    });

    modal.show();
}

async function populateBadges() {
    const res = await fetch("/data/getBadges");
    const badges = await res.json();

    const tableBody = document.getElementById("badgeTableBody");
    tableBody.innerHTML = ""; // Clear existing rows
    const badgeSelect = document.getElementById("chosenBadge");
    badgeSelect.innerHTML = ""; // Clear existing options

    badges.forEach(badge => {

        // Create a new option for the badge select dropdown
        var option = document.createElement("option");
        option.value = badge.badgeID;
        option.textContent = badge.badgeName;
        badgeSelect.appendChild(option);
        console.log(`Badge added to select: ${badge.badgeName} (${badge.badgeID})`);

        const row = document.createElement("tr");

        // Check if badgePath is null or empty and set a default image
        if (badge.badgePath === null || badge.badgePath === '') {
            badge.badgePath = 'img/badge/Placeholder_Badge.png';
        }

        // Create table cells and populate them with badge data
        row.innerHTML = `
            <th scope="row">${badge.badgeID}</th>
            <td>${badge.badgeName}</td>
            <td>${badge.isQualification ? "Qualification" : "Ribbon/Badge"}</td>
            <td>${badge.badgeDescription}</td>
            <td style="text-align: center;"><img src="/${badge.badgePath}" alt="${badge.badgeName}" class="badge-dash-image" /></td>
            <td style="vertical-align: middle;">
                <button class="btn btn-warning" onclick="assignBadge('${badge.badgeID}','${badge.badgePath}')">Assignment</button>
                <button class="btn btn-primary" onclick="editBadge('${badge.badgeID}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteBadge('${badge.badgeID}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if ($.fn.DataTable.isDataTable('#badgesTable')) {
        $('#badgesTable').DataTable();
    } else {
        new DataTable('#badgesTable', {
            paging: true,
            searching: true,
            info: false,
            order: [[0, 'asc']],
            columnDefs: [{ orderable: false, targets: [5, 4, 3] }, { width: "25%", targets: 4 }],
            lengthMenu: [5, 10, 25, 50]
        });
    }
}

async function handleBadgeImage() {
    var file = this.files[0];
    var eleId = this.id;

    if (eleId === "newimage") {
        imgEl = document.getElementById("badgeImagePreview");
        badgeImageInput = document.getElementById("newimage");
    } else if (eleId === "image") {
        imgEl = document.getElementById("editBadgeImagePreview");
        badgeImageInput = document.getElementById("image");
    } else {
        console.error("Unexpected element ID:", eleId);
        return;
    }

    if (eleId === "newimage") {
        form = document.getElementById("createBadgeForm");
    } else {
        form = document.getElementById("updateBadgeForm");
    }
    if (file && isImage(file.name)) {

        // Create an Image object to check dimensions
        var img = new Image();

        img.src = URL.createObjectURL(file);

        img.onload = function () {
            var existingAlert = document.getElementById("imageAlertMessage");

            // Check if the image is less than 6MB
            if (file.size > 6 * 1024 * 1024) {
                console.log("Image size exceeds 6MB.");
                imgEl.src = ""; // Clear the image preview
                badgeImageInput.value = ""; // Clear the input
                if (!existingAlert) {
                    createAlert("Please upload an image smaller than 6MB.", "danger", form.id, 5000);
                }
                return;
            }

            // Check if the image is square or has a 1:4 aspect ratio
            if (img.width === img.height || img.width / img.height === 0.25) {
                imgEl.src = ""; // Clear the image preview
                // Create and assign a new object URL for the image
                imgEl.src = img.src;
                imgEl.onload = function () {
                    // Revoke the object URL after the image has loaded
                    URL.revokeObjectURL(img.src);
                };

                if (document.getElementById("imageAlertMessage") !== null) {
                    document.getElementById("imageAlertMessage").remove();
                }

            } else {
                imgEl.src = ""; // Clear the image preview
                badgeImageInput.value = ""; // Clear the input
                if (!existingAlert) {
                    createAlert("Please upload a square image or an image with a 1:4 aspect ratio.", "danger", form.id, 5000);
                }
                return;
            }
        }
    } else {
        var existingAlert = document.getElementById("imageAlertMessage");
        if (!existingAlert) {
            createAlert("Please upload a .PNG image", "danger", form.id, 5000);
            if (eleId === "newimage") {
                imgEl.src = ""; // Clear the image preview
                badgeImageInputNew.value = ""; // Clear the input
            } else if (eleId === "image") {
                imgElEdit.src = ""; // Clear the image preview
                badgeImageInputExisting.value = ""; // Clear the input
            }
        }
    }
}

async function init() {
    // Assign event listeners for the badge image inputs
    document.getElementById("newimage").addEventListener("change", handleBadgeImage);
    document.getElementById("image").addEventListener("change", handleBadgeImage);

    // Populate the badges table on page load
    // No need to call await, it will run asynchronously
    populateBadges();

    editCheckbox.addEventListener("click", function (event) {
        // If the checkbox is checked, enable the file upload group
        if (this.checked) {
            // console.log("Checkbox is checked");
            document.getElementById("editBadgeImageGroupNew").classList = "form-group";
            document.getElementById("editBadgeImagePreview").setAttribute("src", "");
            document.getElementById("editBadgeImageGroupExisting").classList = "form-group d-none";
        } else {
            // console.log("Checkbox is unchecked");
            document.getElementById("editBadgeImageGroupNew").classList = "form-group d-none";
            var currentSrc = document.getElementById("existingimage").value;
            document.getElementById("editBadgeImagePreview").setAttribute("src", currentSrc);
            document.getElementById("image").value = "";
            document.getElementById("editBadgeImageGroupExisting").classList = "form-group";
        }
    });

    // Touchscreen compatibility for the checkbox
    editCheckbox.addEventListener("touchend", function (event) {
        // If the checkbox is checked, enable the file upload group
        if (this.checked) {
            // console.log("Checkbox is checked");
            document.getElementById("editBadgeImageGroupNew").classList = "form-group";
            document.getElementById("editBadgeImageGroupExisting").classList = "form-group d-none";
            document.getElementById("editBadgeImagePreview").setAttribute("src", "");
        } else {
            // console.log("Checkbox is unchecked");
            document.getElementById("editBadgeImageGroupNew").classList = "form-group d-none";
            var currentSrc = document.getElementById("existingimage").value;
            document.getElementById("editBadgeImagePreview").setAttribute("src", currentSrc);
            document.getElementById("image").value = "";
            document.getElementById("editBadgeImageGroupExisting").classList = "form-group";
        }
    });

    badgeImageSelect.addEventListener("change", function (event) {
        var selectedImage = event.target.value;
        if (typeof selectedImage !== 'undefined') {
            // Set the image preview to the selected badge image
            console.log("Selected image:", selectedImage);
            // imageElement.src = selectedImage;
            document.getElementById("editBadgeImagePreview").setAttribute("src", selectedImage);
        }
    });

    document.getElementById("assignBadgeSubmit").addEventListener("click", function (event) {
        event.preventDefault();
        handleSubmitAssignmentBadgeForm(event);
    });
}


async function handleSubmitAssignmentBadgeForm(event) {
    event.preventDefault();
    const badgeID = document.getElementById("chosenBadge").value;
    const memberAssigned = document.getElementById("assignedMembers");
    const dateAcquired = document.getElementById("dateAcquired").value;

    // Prepare the data to be sent
    const assignedMembers = Array.from(memberAssigned.options).map(option => option.value);
    const data = {
        badgeID: badgeID,
        members: assignedMembers,
        dateAcquired: dateAcquired
    };


    var res;
    var result;
    // Send the data to the server
    try {
        res = await fetch('/data/assignBadge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        result = await res.json();
    } catch (error) {
        console.error('Error:', error);
        createAlert("An error occurred while assigning the badge.", "danger", "assignBadgeForm", 5000);
    }
    if (result.status === 200) {
        createAlert("Badge assigned successfully!", "success", "assignBadgeForm", 1500);

        // Set a timeout to close the modal after 1 second
        setTimeout(() => {
            closeModal('assignBadgeModal');
        }, 1000);

        // Refresh the page after 2 seconds
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        createAlert("Error assigning badge: " + result.result, "danger", "assignBadgeForm", 5000);
    }
}

init();