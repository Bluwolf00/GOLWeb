async function performLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        try {
            const response = await fetch('/data/performLogin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 200) {
                    createAlert("Login successful! Redirecting...", "success", "mainContent", 3000);
                    setTimeout(() => {
                        // Redirect to the dashboard after a successful login
                        window.location.href = '/dashboard';
                    }, 3000);
                } else {
                    createAlert(data.message, "danger", "mainContent", 5000);
                }
            } else {
                const errorData = await response.json();
                createAlert(errorData.message || "Login failed. Please try again.", "danger", "mainContent", 5000);
            }
        } catch (error) {
            console.error("Error during login:", error);
            createAlert("An error occurred while trying to log in. Please try again later.", "danger", "mainContent", 5000);
        }
    } else {
        createAlert("Please fill in both fields.", "danger", "mainContent", 5000);
    }
}

function createAlert(message, type, form, timeout = -1) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show loginAlert`;
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

function init() {
    const loginButton = document.getElementById('loginButton');
    const loginForm = document.getElementById('loginForm');
    if (loginButton) {
        loginButton.addEventListener('click', async function(event) {
            event.preventDefault(); // Prevent the default form submission
            performLogin(); // Call the login function
        });

        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent the default form submission
            performLogin(); // Call the login function
        });
    } else {
        console.error("Login button not found.");
    }
}

init(); // Initialize the script when the DOM is fully loaded