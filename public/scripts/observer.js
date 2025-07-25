const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('showContent');
    //   observer.unobserve(entry.target);
    } else {
        entry.target.classList.remove('showContent');
    }
  });
}, { threshold: 0.1});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => {
  observer.observe(el);
});