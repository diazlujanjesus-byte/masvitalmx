const API_URL = "https://script.google.com/macros/s/AKfycbyCzb0Lgl-itCW7Rgy40jGekHmFnHZkaagji-p9V4IAKKMtPkt6tg4UJk2Qk_YGFMTIUA/exec"; // Reemplazar con el Web App URL

// --- Lógica de Búsqueda y Autocompletado ---
const nameSearch = document.getElementById('nameSearch');
const resultsDiv = document.getElementById('results');
const idSection = document.getElementById('idSection');

if (nameSearch) {
    nameSearch.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length < 3) { resultsDiv.classList.add('hidden'); return; }

        const response = await fetch(`${API_URL}`);
        const data = await response.json();

        resultsDiv.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerText = item.nombre;
            div.onclick = () => selectUser(item);
            resultsDiv.appendChild(div);
        });
        resultsDiv.classList.remove('hidden');
    });
}

function selectUser(user) {
    nameSearch.value = user.nombre;
    localStorage.setItem('temp_id', user.id);
    resultsDiv.classList.add('hidden');
    idSection.classList.remove('hidden');
}

// --- Acciones ---
async function login() {
    const id = document.getElementById('userId').value;
    const response = await fetch(`${API_URL}`);
    const user = await response.json();

    if (user.success) {
        localStorage.setItem('name', user.nombre);
        localStorage.setItem('whatsapp', user.whatsapp);
        window.location.href = 'dashboard.html';
    } else {
        alert('ID incorrecto');
    }
}

async function updateData() {
    const id = prompt("Por seguridad, ingresa tu ID nuevamente:");
    const wa = document.getElementById('userWhatsApp').value;    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'update', id, whatsapp: wa })
    });

    if (response.ok) {
        alert('Datos actualizados');
        localStorage.setItem('whatsapp', wa);
    }
}

async function fetchLandingData(slug) {
    const response = await fetch(`${API_URL}`);
    const data = await response.json();

    document.title = data.nombre;
    document.getElementById('landingTitle').innerText = data.nombre;
    document.getElementById('waLink').href = `https://wa.me/${data.whatsapp}?text=Hola%20${data.nombre},%20deseo%20más%20información`;
    document.getElementById('regLink').href = `https://my.vitalhealthglobal.com/${data.usuario}`;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

if(document.getElementById('loginBtn')) {
    document.getElementById('loginBtn').onclick = login;
}