import express from "express";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 80);

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "web")));

const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER || "contact@karmaops.online",
    pass: process.env.SMTP_PASS || "",
  },
};

const leadToEmail = process.env.LEAD_TO_EMAIL || "contact@karmaops.online";
const leadFromEmail = process.env.LEAD_FROM_EMAIL || smtpConfig.auth.user;

function clean(value, maxLength = 1200) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function isConfigured() {
  return Boolean(smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass && leadToEmail);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildLeadEmail(lead) {
  const submittedAt = new Date().toLocaleString("es-MX", {
    timeZone: "America/Tijuana",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines = [
    "Nuevo lead desde home.karmaops.online",
    "",
    `Nombre: ${lead.name}`,
    `Contacto: ${lead.contact}`,
    `Interes: ${lead.interest}`,
    `Mensaje: ${lead.message || "Sin mensaje"}`,
    `Fecha: ${submittedAt}`,
    `Fuente: ${lead.source}`,
    `Pagina: ${lead.tracking.page || "Sin pagina"}`,
    `URL: ${lead.tracking.fullUrl || "Sin URL"}`,
    `Referrer: ${lead.tracking.referrer || "Sin referrer"}`,
    `UTM: ${Object.keys(lead.tracking.utm || {}).length ? JSON.stringify(lead.tracking.utm) : "Sin UTM"}`,
  ];

  return {
    text: lines.join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>Nuevo lead desde home.karmaops.online</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(lead.name)}</p>
        <p><strong>Contacto:</strong> ${escapeHtml(lead.contact)}</p>
        <p><strong>Interes:</strong> ${escapeHtml(lead.interest)}</p>
        <p><strong>Mensaje:</strong><br>${escapeHtml(lead.message || "Sin mensaje")}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(submittedAt)}</p>
        <p><strong>Fuente:</strong> ${escapeHtml(lead.source)}</p>
        <hr>
        <p><strong>Pagina:</strong> ${escapeHtml(lead.tracking.page || "Sin pagina")}</p>
        <p><strong>URL:</strong> ${escapeHtml(lead.tracking.fullUrl || "Sin URL")}</p>
        <p><strong>Referrer:</strong> ${escapeHtml(lead.tracking.referrer || "Sin referrer")}</p>
        <p><strong>UTM:</strong> ${escapeHtml(Object.keys(lead.tracking.utm || {}).length ? JSON.stringify(lead.tracking.utm) : "Sin UTM")}</p>
      </div>
    `,
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, mailConfigured: isConfigured() });
});

app.get("/negocios-locales", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "negocios-locales.html"));
});

app.get("/creadores-agencias", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "creadores-agencias.html"));
});

app.post("/api/leads", async (req, res) => {
  const lead = {
    name: clean(req.body.name, 120),
    contact: clean(req.body.contact, 160),
    interest: clean(req.body.interest, 160),
    message: clean(req.body.message, 1400),
    source: clean(req.body.source, 160) || "karmaops-business-web",
    tracking: {
      page: clean(cleanObject(req.body.tracking).page, 220),
      fullUrl: clean(cleanObject(req.body.tracking).fullUrl, 600),
      referrer: clean(cleanObject(req.body.tracking).referrer, 600),
      utm: cleanObject(cleanObject(req.body.tracking).utm),
    },
  };

  if (!lead.name || !lead.contact || !lead.interest) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }

  if (!isConfigured()) {
    return res.status(503).json({ ok: false, error: "mail_not_configured" });
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const email = buildLeadEmail(lead);

  try {
    await transporter.sendMail({
      from: `"KarmaOps Leads" <${leadFromEmail}>`,
      to: leadToEmail,
      replyTo: lead.contact.includes("@") ? lead.contact : undefined,
      subject: `Nuevo lead KarmaOps: ${lead.name}`,
      text: email.text,
      html: email.html,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("lead_email_failed", {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    res.status(502).json({ ok: false, error: "mail_send_failed" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

app.listen(port, () => {
  console.log(`karmaops-business-web listening on ${port}`);
});
