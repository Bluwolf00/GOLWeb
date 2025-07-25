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
            window.location = "/";
        }, 2500);
    } else {
        createAlert(result.statusMessage, "danger", "resetPasswordForm", 5000);
        document.getElementById("resetPasswordSubmit").disabled = false; // Re-enable the button
        console.error("Error resetting password:", result.statusMessage);
    }
}


function init() {
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

    resetPassword();
}