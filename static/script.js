// static/script.js

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // 1. LOADING ANIMATION
  // ------------------------------
  const loading = document.getElementById("loading");
  window.addEventListener("load", () => {
    if (loading) loading.style.display = "none";
  });

  // ------------------------------
  // 2. SMOOTH SCROLLING (NAV)
  // ------------------------------
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        document.getElementById("nav-menu")?.classList.remove("show");
      }
    });
  });

  // ------------------------------
  // 3. MOBILE HAMBURGER TOGGLE
  // ------------------------------
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");

  hamburger?.addEventListener("click", () => {
    navMenu?.classList.toggle("show");
  });

  // ------------------------------
  // 4. FADE-IN SECTIONS ON SCROLL
  // ------------------------------
  const faders = document.querySelectorAll(".fade-section");
  const appearOptions = { threshold: 0.2, rootMargin: "0px 0px -50px 0px" };

  const appearOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, appearOptions);

  faders.forEach((fader) => appearOnScroll.observe(fader));

  // ------------------------------
  // 5. TOAST NOTIFICATIONS
  // ------------------------------
  const createToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show animation
    setTimeout(() => toast.classList.add("show"), 50);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // ------------------------------
  // 6. CONTACT FORM SUBMISSION
  // ------------------------------
  const contactForm = document.getElementById("contactForm");

  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    // Disable button to prevent multiple submissions
    const submitButton = contactForm.querySelector("button[type=submit]");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        createToast(result.message, "success");
        contactForm.reset();
      } else {
        createToast(result.detail || "Something went wrong.", "error");
      }
    } catch (err) {
      createToast("Failed to submit. Try again later.", "error");
      console.error(err);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  });

  // ------------------------------
  // 7. PROJECT SLIDER (FIXED)
  // ------------------------------
  const slider = document.getElementById("projectsSlider");
  const slideLeft = document.getElementById("slideLeft");
  const slideRight = document.getElementById("slideRight");

  if (slider && slideLeft && slideRight) {
    // Function to scroll the slider left or right
    const scrollSlider = (direction) => {
      // We scroll by the width of the visible slider container
      const scrollAmount = slider.clientWidth;
      
      slider.scrollBy({
        left: direction * scrollAmount,
        behavior: "smooth",
      });
    };

    // Event Listeners for Buttons
    slideLeft.addEventListener("click", (e) => {
      e.preventDefault();
      scrollSlider(-1); // -1 moves left
    });

    slideRight.addEventListener("click", (e) => {
      e.preventDefault();
      scrollSlider(1); // 1 moves right
    });

    // Optional: Auto-hide buttons based on scroll position
    const updateButtonState = () => {
      // Hide Left button if at start
      if (slider.scrollLeft <= 10) {
        slideLeft.classList.add("inactive");
      } else {
        slideLeft.classList.remove("inactive");
      }

      // Hide Right button if at end
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      if (slider.scrollLeft >= maxScroll - 10) {
        slideRight.classList.add("inactive");
      } else {
        slideRight.classList.remove("inactive");
      }
    };

    // Listen for scroll events to update buttons
    slider.addEventListener("scroll", updateButtonState);
    
    // Initial check
    updateButtonState();
  }
});