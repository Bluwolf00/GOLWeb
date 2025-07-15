const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // console.log('Element is intersecting:', entry.target, entry.intersectionRatio, entry.boundingClientRect, entry.rootBounds);
      entry.target.classList.add('show');
    //   observer.unobserve(entry.target);
    } else {
        entry.target.classList.remove('show');
    }
  });
}, { threshold: 0.1});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => {
  observer.observe(el);
});