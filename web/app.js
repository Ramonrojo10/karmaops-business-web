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

function getTrackingContext() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};

  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
    const value = params.get(key);
    if (value) {
      utm[key] = value;
    }
  });

  return {
    page: window.location.pathname,
    fullUrl: window.location.href,
    referrer: document.referrer || "",
    utm,
  };
}

function saveLeadLocally(lead) {
  const currentLeads = JSON.parse(localStorage.getItem("karmaops_leads") || "[]");
  localStorage.setItem("karmaops_leads", JSON.stringify([lead, ...currentLeads]));
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Enviando señal...";

  const formData = new FormData(form);
  const lead = {
    id: crypto.randomUUID(),
    name: formData.get("name"),
    contact: formData.get("contact"),
    interest: formData.get("interest"),
    message: formData.get("message"),
    source: "karmaops-business-web",
    tracking: getTrackingContext(),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      throw new Error(`Lead API failed with ${response.status}`);
    }

    form.reset();
    statusEl.textContent = "Señal recibida. Te responderemos con el siguiente paso.";
  } catch (_error) {
    saveLeadLocally(lead);
    statusEl.textContent = "Señal guardada. Si el envio falla, tambien queda registrada localmente.";
  }
});
