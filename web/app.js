const revealItems = document.querySelectorAll("[data-reveal]");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 42, 240)}ms`;
  observer.observe(item);
});

const form = document.querySelector(".lead-form");
const statusEl = document.querySelector(".form-status");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const lead = {
    id: crypto.randomUUID(),
    name: formData.get("name"),
    contact: formData.get("contact"),
    interest: formData.get("interest"),
    message: formData.get("message"),
    source: "karmaops-business-web",
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const currentLeads = JSON.parse(localStorage.getItem("karmaops_leads") || "[]");
  localStorage.setItem("karmaops_leads", JSON.stringify([lead, ...currentLeads]));

  form.reset();
  statusEl.textContent = "Señal recibida. El siguiente paso sera conectar este flujo al CRM.";
});
