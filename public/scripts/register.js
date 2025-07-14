async function performRegister() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (username && password && confirmPassword) {
        try {
            const response = await fetch('/data/performRegister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, confirmPassword })
            });

            if (response.ok) {
                const data = await response.json();
                if (response.status === 201) {
                    createAlert("Registration successful! Redirecting...", "success", "alertHolder", 3000);
                    setTimeout(() => {
                        // Redirect to the login page after a successful register
                        window.location.href = '/login';
                    }, 3000);
                } else {
                    createAlert(data.statusMessage, "danger", "alertHolder", 5000);
                }
            } else {
                const errorData = await response.json();
                createAlert(errorData.statusMessage || "Registration Failed. Please try again.", "danger", "alertHolder", 5000);
            }
        } catch (error) {
            console.error("Error during login:", error);
            createAlert("An error occurred while trying to log in. Please try again later.", "danger", "alertHolder", 5000);
        }
    } else {
        createAlert("Please fill in both fields.", "danger", "alertHolder", 5000);
    }
}

function createAlert(message, type, form, timeout = -1) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = "alert";
    alert.innerHTML = message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    alert.id = "imageAlertMessage";
    var formEl = document.getElementById(form)
    formEl.append(alert);

    if (timeout > 0) {
        setTimeout(function () {
            if (document.getElementById("imageAlertMessage") !== null) {
                $('#imageAlertMessage').alert('close');
            }
        }, timeout);
    }
}

function init() {
    const registerButton = document.getElementById('registerSubmitBtn');
    const registerForm = document.getElementById('registerForm');
    if (registerButton) {
        registerButton.addEventListener('click', async function(event) {
            event.preventDefault(); // Prevent the default form submission
            performRegister(); // Call the login function
        });

        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent the default form submission
            performRegister(); // Call the login function
        });
    } else {
        console.error("Register button not found.");
    }

    document.getElementById('togglePassword').addEventListener('click', function () {
        const passwordInput = document.getElementById('password');
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

init(); // Initialize the script when the DOM is fully loaded