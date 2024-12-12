var ele = document.querySelector('.spinner-wrapper');

window.addEventListener('load', () => {
    ele.style.opacity = 0;

    setTimeout(() => {
        ele.style.display = 'none';
    }, 800);
});