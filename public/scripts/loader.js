var ele = document.querySelector('.spinner-wrapper');

// This script is used to create a loading spinner that appears when the page is loading
// and disappears when the page is fully loaded. It uses the window's load event to trigger the spinner's disappearance.
// It isn't fully functional yet, as the spinner doesn't appear when the page is still fetching data from the server.
window.addEventListener('load', () => {
    ele.style.opacity = 0;

    setTimeout(() => {
        ele.style.display = 'none';
    }, 800);
});