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

    // Initialise the elements

    var promotionsElement = document.getElementById("promotions");
    var nextPromotionElement = document.getElementById("next-promotion");
    var activeMembersElement = document.getElementById("active-members");
    var leaveMembersElement = document.getElementById("loas");
    var recruitsElement = document.getElementById("recruits");
    var nextTrainingElement = document.getElementById("nextTraining");
    var nextMissionElement = document.getElementById("nextMission");
    var leadersElement = document.getElementById("leaders");

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