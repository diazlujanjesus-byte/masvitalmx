const API_URL = "https://script.google.com/macros/s/AKfycbzxn_wB6Ruoo-qdk8aiOmCiHhD6EQNG0FO0hVqmheF5zXQh7yWUehV33hrgsBQi6yarIA/exec";

/**
 * ⚠️ Pega aquí la MISMA llave que pusiste en Apps Script (Script Properties: AUTH_SHARED_SECRET)
 * Por lo pronto “así” está OK, pero recuerda que en frontend se puede ver.
 */
const AUTH_SHARED_SECRET = "Kw9SDEZmMeqAhk4uekJa0zlaNJgv2Pe6zoD3HI0OC42DpbSJKxw8JInL2U6Xqt7f";

// ======================
// Sesión
// ======================
function getActiveSession() {
  const raw = localStorage.getItem("session");
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (!session?.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem("session");
      return null;
    }
    return session;
  } catch (e) {
    localStorage.removeItem("session");
    return null;
  }
}

function requireAuth(redirectTo = "index.html") {
  const session = getActiveSession();
  if (!session) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

// ======================
// UI helpers
// ======================
function setLoginStatus(message = "", type = "") {
  const status = document.getElementById("loginStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("is-success", "is-error");
  if (type === "success") status.classList.add("is-success");
  if (type === "error") status.classList.add("is-error");
}

function setLoginButtonLoading(isLoading) {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;
  btn.classList.toggle("is-loading", !!isLoading);
  btn.disabled = !!isLoading;
}

function updateLoginViewForSession() {
  const session = getActiveSession();
  const usernameField = document.getElementById("usernameField");
  const passwordField = document.getElementById("passwordField");
  const welcomeBox = document.getElementById("welcomeBackBox");
  const welcomeName = document.getElementById("welcomeUserName");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const buttonLabel = document.querySelector("#loginBtn .btn-label");

  if (session?.user) {
    if (usernameField) usernameField.classList.add("hidden");
    if (passwordField) passwordField.classList.add("hidden");
    if (welcomeBox) welcomeBox.classList.remove("hidden");
    //if (welcomeName) welcomeName.textContent = session.user.name || session.user.username || "Socio";
    if (title) title.textContent = "Bienvenid@ de nuevo";
	if (subtitle) subtitle.textContent = session.user.name || session.user.username || "Socio"; //"Tu sesión sigue activa. Puedes continuar al menú.";
    if (buttonLabel) buttonLabel.textContent = "Continuar";
    setLoginStatus("", "");
    return;
  }

  if (usernameField) usernameField.classList.remove("hidden");
  if (passwordField) passwordField.classList.remove("hidden");
  if (welcomeBox) welcomeBox.classList.add("hidden");
  if (title) title.textContent = "Iniciar sesión";
  if (subtitle) subtitle.textContent = "Ingresa tu usuario y tu ID de socio";
  if (buttonLabel) buttonLabel.textContent = "Entrar";
}

// ======================
// Crypto helpers
// ======================
function ensureCryptoJS_() {
  if (typeof CryptoJS === "undefined") {
    throw new Error("CryptoJS no está cargado. Agrega el script de CryptoJS en esta página.");
  }
}

function encryptPayload_(obj) {
  ensureCryptoJS_();
  if (!AUTH_SHARED_SECRET || AUTH_SHARED_SECRET.includes("PEGA_AQUI")) {
    throw new Error("AUTH_SHARED_SECRET no está configurada en app.js");
  }
  return CryptoJS.AES.encrypt(JSON.stringify(obj), AUTH_SHARED_SECRET).toString();
}

// ======================
// LOGIN (nuevo: user + memberId cifrados)
// ======================
async function login() {
  const activeSession = getActiveSession();

  try {
    setLoginButtonLoading(true);
    setLoginStatus("Procesando...", "");

    if (activeSession?.user) {
      window.location.href = "menu.html";
      return;
    }

    const username = (document.getElementById("username")?.value || "").trim().toLowerCase();
    const memberId = (document.getElementById("password")?.value || "").trim();

    if (!username) {
      setLoginStatus("Ingresa tu usuario.", "error");
      alert("Ingresa tu usuario.");
      return;
    }
    if (!memberId) {
      setLoginStatus("Ingresa tu ID de socio.", "error");
      alert("Ingresa tu ID de socio.");
      return;
    }

    const payload = encryptPayload_({
      username,
      memberId,
      ts: Date.now()
    });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "auth", payload })
    });

    const data = await res.json().catch(() => null);

    if (!data?.ok || !data?.user) {
      setLoginStatus(data?.message || "Credenciales incorrectas.", "error");
      alert(data?.message || "Credenciales incorrectas.");
      return;
    }

    const session = {
      user: data.user,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    localStorage.setItem("session", JSON.stringify(session));
    setLoginStatus("Acceso correcto. Redirigiendo...", "success");
    window.location.href = "menu.html";
  } catch (err) {
    console.error(err);
    setLoginStatus(err?.message || "Error en login.", "error");
    alert(err?.message || "Error en login.");
  } finally {
    setLoginButtonLoading(false);
    updateLoginViewForSession();
  }
}

// ======================
// DASHBOARD (sin cambios)
// ======================
function loadDashboard() {
  const session = requireAuth();
  if (!session) return;

  const user = session.user;

  const nameEl = document.getElementById("userName");
  const phoneEl = document.getElementById("userWhatsApp");

  if (nameEl) nameEl.innerText = user.name || "Socio";
  if (phoneEl) phoneEl.value = user.phone || "";
}

// ======================
// UPDATE (cifrado)
// Tu UI actual pide confirmación con ID.
// ======================

let pendingPhoneUpdate = null;

function showConfirmSection(show) {
  const section = document.getElementById("confirmSection");
  const err = document.getElementById("confirmError");
  const input = document.getElementById("confirmId");

  if (!section) return;

  section.classList.toggle("hidden", !show);
  if (err) err.classList.add("hidden");
  if (input) {
    input.value = "";
    if (show) input.focus();
  }
}

function updatePhone() {
  const session = requireAuth();
  if (!session) return;

  const user = session.user;
  const phone = (document.getElementById("userWhatsApp")?.value || "").trim();

  if (!phone) return alert("Ingresa tu número de WhatsApp.");

  pendingPhoneUpdate = { user, phone };
  showConfirmSection(true);
}

async function confirmUpdatePhone() {
  const pending = pendingPhoneUpdate;
  if (!pending) return;

  const { user, phone } = pending;
  const idConfirm = (document.getElementById("confirmId")?.value || "").trim();

  const err = document.getElementById("confirmError");
  if (idConfirm !== String(user.id)) {
    if (err) err.classList.remove("hidden");
    return;
  }

  try {
    const payload = encryptPayload_({
      id: String(user.id),
      phone
    });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "update",
        payload
      })
    });

    const out = await res.json().catch(() => null);
    if (!out?.ok) {
      alert(out?.message || "No se pudo actualizar (backend).");
      return;
    }

    const raw = localStorage.getItem("session");
    const session = JSON.parse(raw);
    session.user.phone = phone;
    localStorage.setItem("session", JSON.stringify(session));

    pendingPhoneUpdate = null;
    showConfirmSection(false);
    alert("Número actualizado ✅");
  } catch (err2) {
    console.error(err2);
    alert(err2?.message || "Error actualizando.");
  }
}

function cancelUpdatePhone() {
  pendingPhoneUpdate = null;
  showConfirmSection(false);
}

// ======================
// LANDING (sin cambios)
// ======================
async function fetchLandingData(slug) {
  return loadLanding(slug);
}

async function loadLanding(slug) {
  const s = (slug || "").trim();
  if (!s) return;

  const res = await fetch(`${API_URL}?action=landing&user=${encodeURIComponent(s)}`);
  const data = await res.json();

  const btn = document.getElementById("waLink");
  if (!btn) return;

  if (!data?.phone) {
    btn.style.display = "none";
    return;
  }

  btn.href = `https://wa.me/${data.phone}`;
  btn.style.display = "flex";
}

// ======================
// Logout
// ======================
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
});

function logout() {
  localStorage.removeItem("session");
  window.location.href = "index.html";
}

// ===== Patch para pagina/app/app.js =====
function initIndexPage() {
  const u = document.getElementById("username");
  const p = document.getElementById("password");
  const btn = document.getElementById("loginBtn");

  try {
    const params = new URLSearchParams(window.location.search);
    const qUser = params.get("username");
    const qId = params.get("memberId");
    if (u && qUser) u.value = qUser;
    if (p && qId) p.value = qId;
  } catch {}

  updateLoginViewForSession();

  if (btn) {
    btn.addEventListener("click", () => login());
  }

  [u, p].forEach((el) => {
    if (!el) return;
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        login();
      }
    });
  });

  document.querySelectorAll(".toggle-visibility").forEach((eye) => {
    eye.addEventListener("click", () => {
      const sel = eye.getAttribute("data-target");
      const input = sel ? document.querySelector(sel) : null;
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      eye.setAttribute("aria-pressed", isPassword ? "true" : "false");
      eye.textContent = isPassword ? "🙈" : "👁";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loginBtn") && typeof login === "function") {
    initIndexPage();
  }
});
