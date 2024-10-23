$(document).ready(function () {

    // Switch on the page's title
    switch (pageTitle) {
        case "Home":
            // document.getElementById("homeEntry").classList.add("active");
            document.getElementById("homeEntry").classList.add("active");
            break;

        case "Roster":
            document.getElementById("rosterEntry").classList.add("active");
            break;

        case "SOP":
            document.getElementById("sopEntry").classList.add("active");
            break;

        case "About":
            document.getElementById("aboutEntry").classList.add("active");
            break;

        default:
            break;
            // By default the active element won't be on any of the buttons, this includes for any pages that do not appear in the above conditions (error page etc.)
    };
});