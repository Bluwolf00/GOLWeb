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

async function populateDash() {
    // Iniitialize the variables

    var response = await fetch("/data/getDashData");
    var data = await response.json();

    // Not implemented yet
    // var nextPaymentDate = data.nextPaymentDate;
    // var numberOfReplays = data.numberOfReplays;
    
    var promotions = data.promotions;
    var nextPromotion = data.nextPromotion;
    var activeMembers = data.activeMembers;
    var leaveMembers = data.leaveMembers;
    var recruits = data.recruits;
    var nextTraining = data.nextTraining;
    var nextMission = data.nextMission;
    var leaders = data.leaders;
    var memberPromotions = data.memberPromotions;
    var memberLOAs = data.memberLOAs;
    var nextServerPayment = data.nextPaymentDue;

    // Initialise the elements

    var promotionsElement = document.getElementById("promotions");
    var nextPromotionElement = document.getElementById("next-promotion");
    var activeMembersElement = document.getElementById("active-members");
    var leaveMembersElement = document.getElementById("loas");
    var recruitsElement = document.getElementById("recruits");
    var nextTrainingElement = document.getElementById("nextTraining");
    var nextMissionElement = document.getElementById("nextMission");
    var leadersElement = document.getElementById("leaders");
    var nextServerPaymentElement = document.getElementById("nextServerPayment");

    // Populate the dashboard

    promotionsElement.innerHTML = promotions;
    nextPromotionElement.innerHTML = nextPromotion;
    if (nextPromotion.length > 14) {
        nextPromotionElement.classList.add("fs-24");
    }

    activeMembersElement.innerHTML = activeMembers;
    leaveMembersElement.innerHTML = leaveMembers;
    recruitsElement.innerHTML = recruits;
    nextTrainingElement.innerHTML = nextTraining.name;
    nextMissionElement.innerHTML = nextMission.name;
    leadersElement.innerHTML = leaders;
    nextServerPaymentElement.innerHTML = `${nextServerPayment} Days`;
    if (nextServerPayment < 2) {
        nextServerPaymentElement.innerHTML = `${nextServerPayment} Day`;
    }

    // Promotion Table
    // Populate the promotion table including the number of events each member has to go through before being promoted
    
    var promoTableBody = document.getElementById("promotions-list");
    promoTableBody.innerHTML = ""; // Clear existing rows

    // Sort the member promotions by the number of events to go in ascending order
    memberPromotions.sort((a, b) => a.eventsToGo - b.eventsToGo);

    memberPromotions.forEach(member => {
        var row = document.createElement("tr");
        row.classList.add("member-row");

        // If this is the first member, add a special class for styling
        if (member === memberPromotions[0]) {
            row.style.borderBottomWidth = "4px";
        }

        // Member is inactive or on leave of absence
        if (member.memberStatus === "LOA" || member.memberStatus === "Inactive") {
            row.classList.add("table-warning");
            row.style.color = "black";
        }

        // Member is active and has achieved the required number of events for promotion
        if (member.eventsToGo === 0) {
            row.classList.add("table-success");
            row.style.color = "black";
        }

        row.innerHTML = `
            <th><a href="/profile?name=${member.UName}" class="nav-link">${member.UName}</a></th>
            <td>${member.memberStatus}</td>
            <td>${member.rankName}</td>
            <td>${member.nextRank}</td>
            <th style="text-align: center;">${member.eventsToGo}</th>
        `;
        promoTableBody.appendChild(row);
    });


    // Member LOA Table

    var loaTableBody = document.getElementById("loa-list");
    loaTableBody.innerHTML = ""; // Clear existing rows

    memberLOAs.forEach(member => {
        var row = document.createElement("tr");
        row.classList.add("member-row");

        var startDate = new Date(member.startDate).toLocaleDateString("en-GB", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        var endDate = new Date(member.endDate).toLocaleDateString("en-GB", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        row.innerHTML = `
            <th><a href="/profile?name=${member.UName}" class="nav-link">${member.UName}</a></th>
            <td>${member.playerStatus}</td>
            <td>${member.rankName}</td>
            <td style="text-align: center;">${startDate}</td>
            <td style="text-align: center;">${endDate}</td>
        `;
        loaTableBody.appendChild(row);
    });

}

async function resetPassword() {
    var newPassword = document.getElementById("newPassword").value;
    var confirmPassword = document.getElementById("confirmPassword").value;
    var response;
    var result;

    if (newPassword === "" || confirmPassword === "") {
        createAlert("Please fill in all fields.", "danger", "resetPasswordForm", 5000);
        document.getElementById("resetPasswordSubmit").disabled = false; // Re-enable the button
        return;
    }

    response = await fetch("/data/resetPassword", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword: newPassword, confirmPassword: confirmPassword })
    });
    result = await response.json();

    if (response.ok) {
        createAlert("Password reset successfully!", "success", "resetPasswordForm", 5000);
        setTimeout(() => {
            closeModal("resetPasswordModal");
        }, 2000);
        setTimeout(() => {
            window.location.reload();
        }, 2500);
    } else {
        createAlert(result.statusMessage, "danger", "resetPasswordForm", 5000);
        document.getElementById("resetPasswordSubmit").disabled = false; // Re-enable the button
        console.error("Error resetting password:", result.statusMessage);
    }
}

function openModal(modalId) {
    var modal = new bootstrap.Modal(document.getElementById(modalId));

    modal.show();
}

async function closeModal(elementId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(elementId));
    if (modal) {
        modal.hide();
    }
}

function init() {
    populateDash();
    document.getElementById("resetPasswordSubmit").addEventListener("click", async (e) => {
        e.preventDefault();
        document.getElementById("resetPasswordSubmit").disabled = true; // Disable the button to prevent multiple clicks
        resetPassword();
    });

    document.getElementById('togglePassword').addEventListener('click', function () {
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            this.classList.remove('bi-eye-slash');
            this.classList.add('bi-eye');
        } else {
            passwordInput.type = 'password';
            this.classList.remove('bi-eye');
            this.classList.add('bi-eye-slash');
        }
    });

    document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
        const passwordInput = document.getElementById('confirmPassword');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            this.classList.remove('bi-eye-slash');
            this.classList.add('bi-eye');
        } else {
            passwordInput.type = 'password';
            this.classList.remove('bi-eye');
            this.classList.add('bi-eye-slash');
        }
    });
}

init();