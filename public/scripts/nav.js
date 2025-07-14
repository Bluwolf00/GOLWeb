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

        case "Ranks":
            document.getElementById("ranksEntry").classList.add("active");
            break;

        case "Orbat":
            document.getElementById("orbatEntry").classList.add("active");
            break;

        case "Badges":
            document.getElementById("badgeEntry").classList.add("active");
            break;

        case "Log In":
            document.getElementById("loginEntry").classList.add("active");
            break;

        case "Dashboard":
            document.getElementById("dashEntry").classList.add("active");
            break;

        case "Register":
            document.getElementById("registerEntry").classList.add("active");
            break;

        default:
            break;
            // By default the active element won't be on any of the buttons, this includes for any pages that do not appear in the above conditions (error page etc.)
    };
});

function toggleMobileNav(element) {
    element.classList.toggle("open");
}