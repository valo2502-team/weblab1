/* =========================================
   GLOBAL STATE & UTILS
   ========================================= */
window.isDegradedMode = false;
const DEGRADED_COOLDOWN = 10000; // 10 секунд на відновлення

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function logStatus(message, isError = false) {
    if (isError) console.error(message);
    else console.log(message);

    // Логіка для нормального відображення помилок JS (виправляє баг з {})
    let text = message;
    if (typeof message === 'object') {
        if (message instanceof Error) {
            text = `${message.name}: ${message.message}`;
        } else {
            text = JSON.stringify(message, null, 2);
        }
    }

    const statusArea = document.getElementById('status-area');
    if (statusArea) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "status-msg";
        msgDiv.style.borderLeft = isError ? "5px solid #ff6b6b" : "5px solid #51cf66";
        msgDiv.innerText = text;
        statusArea.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 4000);
    }
    
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        const timestamp = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.style.borderBottom = "1px solid #333";
        line.style.padding = "5px 10px";
        line.style.fontFamily = "monospace";
        line.style.fontSize = "0.9rem";
        line.style.color = isError ? "#ff6b6b" : "#51cf66";
        line.innerHTML = `<span style="opacity:0.5">[${timestamp}]</span> <pre style="display:inline; margin:0;">${text}</pre>`;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

/* =========================================
   DEGRADED MODE LOGIC
   ========================================= */
function enterDegradedMode() {
    if (window.isDegradedMode) return;
    window.isDegradedMode = true;

    console.warn('!!! DEGRADED MODE ACTIVATED !!!');
    logStatus("⚠️ System overloaded. Switching to Degraded Mode.", true);

    let banner = document.getElementById('degraded-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'degraded-banner';
        banner.style.cssText = "background-color: #ffc107; color: #856404; text-align: center; padding: 12px; font-weight: 700; display: none; position: sticky; top: 0; z-index: 9999;";
        banner.innerText = "⚠️ System overloaded. Switching to Degraded Mode.";
        document.body.prepend(banner);
    }
    banner.style.display = 'block';

    const buttons = document.querySelectorAll("button");
    buttons.forEach(btn => {
        if (!btn.classList.contains('nav-link-btn') && !btn.id.includes('btn_health')) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        }
    });

    setTimeout(() => {
        window.isDegradedMode = false;
        logStatus("♻️ System recovering. Degraded Mode OFF.");
        if (banner) banner.style.display = 'none';
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        });
    }, DEGRADED_COOLDOWN);
}

/* =========================================
   API CLIENT
   ========================================= */
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500, timeout = 10000) {
    
    if (window.isDegradedMode && !url.includes("health")) {
        return Promise.reject({ error: "System in degraded mode. Request blocked." });
    }

    if (options.method && options.method !== 'GET') {
        const csrftoken = getCookie('csrftoken');
        if (csrftoken) options.headers = { ...options.headers, 'X-CSRFToken': csrftoken };
        options.credentials = 'same-origin'; 
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;

    try {
        const response = await fetch(url, options);
        clearTimeout(id);

        if (response.status === 429) {
            if (retries > 0) {
                logStatus(`⚠️ Rate limit hit. Retrying in ${backoff}ms...`, true);
                await new Promise(r => setTimeout(r, backoff));
                return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout); 
            } else {
                enterDegradedMode(); 
                throw { error: "Rate limit exceeded. System degraded." };
            }
        }
        
        if (response.status === 500) {
            if (retries > 0) {
                logStatus(`Server Error 500. Retrying...`, true);
                await new Promise(r => setTimeout(r, backoff));
                return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
            } else {
                throw { error: "Server Error 500." };
            }
        }

        if (response.status === 401) {
             window.location.href = '/login/'; 
             throw { error: "Unauthorized" };
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { error: errorData.error || `HTTP Error ${response.status}` };
        }

        return response;

    } catch (err) {
        clearTimeout(id);
        
        if (err.name === 'AbortError') {
            logStatus(`⏱️ Request Timed Out (after ${timeout}ms)`, true);
            throw { error: "Request Timeout" };
        }

        if (retries > 0 && !window.isDegradedMode) {
            console.warn(`Network error. Retrying...`);
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
        }

        throw err;
    }
}

/* =========================================
   EVENT LISTENERS (Виправлені)
   ========================================= */

function safeAddListener(id, func) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", func);
}

safeAddListener("btn_health", async () => {
    try {
        logStatus("Checking health...");
        // ТУТ БУЛА ПОМИЛКА: забув 'const res ='
        const res = await fetchWithRetry("http://127.0.0.1:8000/health/", {}, 1, 500, 1000);
        const data = await res.json();
        logStatus(data);
    } catch (err) { logStatus(err, true); }
});

safeAddListener("btn_load", async () => {
    try {
        logStatus("Loading items...");
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/");
        const data = await res.json();
        
        const list = document.getElementById("list");
        if (list) {
            list.innerHTML = "";
            if (data.length === 0) list.innerHTML = "<li>No items found</li>";
            data.forEach(item => {
                const li = document.createElement("li");
                li.textContent = `${item.name} ($${item.price || 0})`;
                list.appendChild(li);
            });
        }
        logStatus({ msg: "Items loaded", count: data.length });
    } catch (err) { logStatus(err, true); }
});

safeAddListener("btn_timeout", async () => {
    try {
        logStatus("Testing Timeout...");
        await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=sleep&duration=2", {}, 0, 500, 1000);
        logStatus("Unexpected Success", true);
    } catch (err) { logStatus(`Caught error: ${err.error || err.message}`); }
});

safeAddListener("btn_500", async () => {
    try {
        logStatus(`Triggering 500...`);
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=500", {}, 2, 1000); 
        logStatus("Recovered from 500 (Success)");
    } catch (err) { logStatus(err, true); }
});

// МОДИФІКОВАНИЙ ТЕСТ ДЛЯ 429
safeAddListener("btn_429", async () => {
    try {
        logStatus("Triggering 429 Rate Limit...");
        
        // ВАЖЛИВО: Ставлю retries = 0, щоб ВІДРАЗУ викликати Degraded Mode при першій помилці.
        // Це дозволить побачити банер, навіть якщо сервер повертає помилку тільки 1 раз.
        // Якщо хочете перевірити саме Retry логіку, змініть 0 на 3.
        
        await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=429", {}, 0, 500);
        
        // Якщо retries > 0 і сервер відновився, ми потрапимо сюди
        logStatus("Success (Recovered from 429)");
    } catch (err) { 
        // Сюди потрапимо, якщо спроби вичерпано -> Degraded Mode
        logStatus(err, true); 
    }
});