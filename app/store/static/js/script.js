// --- Глобальний стан для Degraded Mode ---
let failureCount = 0;
const FAILURE_THRESHOLD = 3;
const DEGRADED_COOLDOWN = 10000;
let isDegraded = false;

// --- Функції UI ---

function setDegradedMode(active) {
    isDegraded = active;
    const banner = document.getElementById('degraded-banner');
    const buttons = document.querySelectorAll('.api-btn');

    if (active) {
        banner.style.display = 'block';
        buttons.forEach(btn => btn.disabled = true);
        console.warn('!!! DEGRADED MODE ACTIVATED !!!');
        
        setTimeout(() => {
            setDegradedMode(false);
            failureCount = 0;
            console.log('Degraded mode deactivated. System recovering.');
        }, DEGRADED_COOLDOWN);
    } else {
        banner.style.display = 'none';
        buttons.forEach(btn => btn.disabled = false);
    }
}

function logStatus(message, isError = false) {
    const area = document.getElementById('status-area');
    const displayMsg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    area.innerHTML = `<pre class="${isError ? 'error-msg' : 'success-msg'}">${displayMsg}</pre>`;
    
    if (isError) console.error(message);
    else console.log(message);
}

// Єдиний формат помилки
// { error, code?, details?, requestId }
async function normalizeError(error, response = null) {
    let errorObj = {
        error: error.message || "Unknown Error",
        code: response ? response.status : (error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'),
        requestId: null,
        details: null
    };

    if (response) {
        errorObj.requestId = response.headers.get('X-Request-Id');
        try {
            const data = await response.json();
            if (data.error) errorObj.details = data.error;
        } catch (e) {}
    }

    return errorObj;
}

// Функція для отримання CSRF токена з cookies (стандарт Django)
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

// Оновлена функція fetchWithRetry
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
    // Додаємо CSRF токен до заголовків, якщо це не GET запит
    if (options.method && options.method !== 'GET') {
        const csrftoken = getCookie('csrftoken');
        if (csrftoken) {
            options.headers = {
                ...options.headers,
                'X-CSRFToken': csrftoken
            };
        }
        // Також важливо передати credentials, щоб сервер бачив сесію
        options.credentials = 'same-origin'; 
    }

    try {
        const response = await fetch(url, options);

        // Обробка 429 (Too Many Requests)
        if (response.status === 429) {
            if (retries > 0) {
                logStatus(`⚠️ Rate limit hit. Retrying in ${backoff}ms...`, true);
                await new Promise(r => setTimeout(r, backoff));
                return fetchWithRetry(url, options, retries - 1, backoff * 2); 
            } else {
                enterDegradedMode(); 
                throw { error: "Rate limit exceeded. System degraded." };
            }
        }
        
        // Обробка 401 (Unauthorized) - якщо сесія закінчилась
        if (response.status === 401) {
             window.location.href = '/login/'; // Перекидаємо на логін
             throw { error: "Unauthorized" };
        }

        if (response.status === 500) {
             // ... логіка для 500 помилки (залиште як було) ...
             throw { error: "Server Error" };
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { error: errorData.error || `HTTP Error ${response.status}` };
        }

        return response;

    } catch (err) {
        throw err;
    }
}

// 1. Health Check (Вимога: Таймаут 1c)
document.getElementById("btn_health").addEventListener("click", async () => {
    try {
        logStatus("Checking health (Timeout limit: 1s)...");
        // Передаємо timeout: 1000 (1 секунда)
        const res = await fetchWithRetry("http://127.0.0.1:8000/health/", {}, 1, 1000);
        const data = await res.json();
        logStatus(data);
    } catch (err) {
        logStatus(err, true);
    }
});

// 2. Load Items (Стандартний запит)
document.getElementById("btn_load").addEventListener("click", async () => {
    try {
        logStatus("Loading items...");
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/");
        const data = await res.json();
        
        // Рендер списку
        const list = document.getElementById("list");
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.name;
            list.appendChild(li);
        });
        logStatus({ msg: "Items loaded", count: data.length });
    } catch (err) {
        logStatus(err, true);
    }
});

// 3. Test Timeout (Симулюємо "повільний" сервер)
document.getElementById("btn_timeout").addEventListener("click", async () => {
    try {
        logStatus("Testing Timeout logic (Requesting 2s sleep, Timeout set to 1s)...");
        await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=sleep&duration=2", {}, 1, 1000);
        logStatus("Success (Unexpected - Timeout should have fired)", true);
    } catch (err) {
        logStatus(err, true);
    }
});

// 4. Test 500 (Для перевірки Degraded Mode)
document.getElementById("btn_500").addEventListener("click", async () => {
    try {
        logStatus(`Sending request to trigger 500... (Current Failures: ${failureCount})`);
        // Це викличе помилку. Натисніть кілька разів, щоб побачити банер Degraded Mode
        await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=500", {}, 2, 2000); 
        logStatus("Success (Recovered from 500)");
    } catch (err) {
        logStatus(err, true);
    }
});

// 5. Test 429
document.getElementById("btn_429").addEventListener("click", async () => {
    try {
        logStatus("Testing 429 Rate Limit...");
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=429", {}, 3, 5000);
        const data = await res.json();
        logStatus(data);
    } catch (err) {
        logStatus(err, true);
    }
});