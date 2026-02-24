const API_URL = "https://script.google.com/macros/s/AKfycbyvV7H1pQijy7BtzsR12CCTjIXsy2IyKUYenq5NKizL-1yzNNUUtey475jQEqYZxwYXaA/exec";

/* ====== LOGIN ====== */

async function searchUsers(query, container) {
  container.innerHTML = "";

  if (query.length < 3) return;

  const res = await fetch(`${API_URL}?action=search&q=${encodeURIComponent(query)}`);
  const users = await res.json();

  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    li.onclick = () => {
      localStorage.setItem("temp_id", u.id);
      document.getElementById("idSection").style.display = "block";
    };
    container.appendChild(li);
  });
}

async function login() {
  const id = document.getElementById("userId").value;
  const selectedId = localStorage.getItem("temp_id");

  if (id !== selectedId) {
    alert("ID incorrecto");
    return;
  }

  const res = await fetch(`${API_URL}?action=login&id=${id}`);
  const data = await res.json();

  if (!data.ok) {
    alert("Login inválido");
    return;
  }

  localStorage.setItem("user", JSON.stringify(data.user));
  window.location.href = "dashboard.html";
}

/* ====== DASHBOARD ====== */

function loadDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return (window.location.href = "index.html");

  document.getElementById("name").textContent = user.name;
  document.getElementById("phone").value = user.phone || "";
}

async function updatePhone() {
  const user = JSON.parse(localStorage.getItem("user"));
  const phone = document.getElementById("phone").value;

  const idConfirm = prompt("Confirma tu ID");
  if (idConfirm !== user.id.toString()) {
    alert("ID incorrecto");
    return;
  }

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id: user.id,
      phone
    })
  });

  alert("Número actualizado");
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ====== LANDING ====== */

async function loadLanding(slug) {
  const res = await fetch(`${API_URL}?action=landing&user=${slug}`);
  const data = await res.json();

  if (!data.phone) return;

  const btn = document.getElementById("whatsappBtn");
  btn.href = `https://wa.me/${data.phone}`;
  btn.style.display = "inline-block";
}