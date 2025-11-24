// LOADER
window.addEventListener("load", () => {
  document.getElementById("loading").style.display = "none";
});

// Smooth scrolling
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    document.querySelector(e.target.getAttribute("href")).scrollIntoView({behavior:"smooth"});
    document.getElementById("nav-menu").classList.remove("show");
  });
});

// Mobile hamburger toggle
document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("nav-menu").classList.toggle("show");
});

// Form success alert
document.addEventListener("submit", () => {
  alert("Thank you! Your message has been sent successfully.");
});

// FADE-IN SECTIONS ON SCROLL
const faders = document.querySelectorAll(".fade-section");

const appearOptions = {
  threshold:0.2,
  rootMargin:"0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function(entries, observer){
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
}, appearOptions);

faders.forEach(fader => {
  appearOnScroll.observe(fader);
});
