var imgEl = document.getElementById("badgeImagePreview");
var badgeImageInput = document.getElementById("newimage");
var form = document.getElementById("createBadgeForm");

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
            badgeImageInput.value = ""; // Clear the input
            imgEl.src = ""; // Clear the image preview
        }
        modal.hide();
    }
}

function isImage(filename) {
    return /\.(png)$/i.test(filename);
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

    
    badgeNameInput.value = badgeData.badgeName;
    badgeDescriptionInput.value = badgeData.badgeDescription; 
    isQualificationInput.checked = badgeData.isQualification;
    badgeIDInput.value = badgeData.badgeID;
    badgePreview.src = badgeData.badgePath ? `/${badgeData.badgePath}` : 'img/badge/Placeholder_Badge.png';

    modal.show();
}

async function populateBadges() {
    const res = await fetch("/data/getBadges");
    const badges = await res.json();

    const tableBody = document.getElementById("badgeTableBody");
    tableBody.innerHTML = ""; // Clear existing rows

    badges.forEach(badge => {
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
                <button class="btn btn-primary" onclick="editBadge('${badge.badgeID}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteBadge('${badge.badgeID}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function init() {
    badgeImageInput.addEventListener("change", function (event) {
        var file = event?.target?.files[0];
        if (file && isImage(file.name)) {

            // Create an Image object to check dimensions
            var img = new Image();

            img.src = URL.createObjectURL(file);

            img.onload = function () {
                
                // Check if the image is less than 6MB
                if (file.size > 6 * 1024 * 1024) {
                    console.log("Image size exceeds 6MB.");
                    imgEl.src = ""; // Clear the image preview
                    badgeImageInput.value = ""; // Clear the input
                    var existingAlert = document.getElementById("imageAlertMessage");
                    if (!existingAlert) {
                        createAlert("Please upload an image smaller than 6MB.", "danger", form.id);
                    }
                    return;
                }
                
                // Check if the image is square or has a 1:4 aspect ratio
                if (img.width === img.height || img.width / img.height === 0.25) {
                    // Clear previous image
                    imgEl.src = "";
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
                    // alert("Please upload a square image or an image with a 1:4 aspect ratio.");
                    badgeImageInput.value = ""; // Clear the input
                    var existingAlert = document.getElementById("imageAlertMessage");
                    if (!existingAlert) {
                        createAlert("Please upload a square image or an image with a 1:4 aspect ratio.", "danger", form.id);
                    }
                    return;
                }
            }
        } else {
            var existingAlert = document.getElementById("imageAlertMessage");
            if (!existingAlert) {
                createAlert("Please upload a .PNG image", "danger", form.id);
                imgEl.src = ""; // Clear the image preview
                badgeImageInput.value = ""; // Clear the input
            }
        }
    });

    // Populate the badges table on page load
    // No need to call await, it will run asynchronously
    populateBadges();
}

init();