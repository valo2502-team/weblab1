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

async function fetchWithRetry(url, options = {}, maxRetries = 3, timeout = 5000) {
    // 1. Перевірка Degraded Mode: якщо активний, не шлемо запити
    if (isDegraded) {
        throw { error: "System overloaded (Client-side protection)", code: "DEGRADED_MODE" };
    }

    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // 2. Таймаут клієнта через AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const fetchOptions = { ...options, signal: controller.signal };

        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // 3. Обробка 429 (Rate Limit)
            if (response.status === 429) {
                const retryAfterHeader = response.headers.get('Retry-After');
                const waitTime = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 5000;
                
                console.warn(`[429] Rate Limit. Waiting ${waitTime}ms (Retry-After)`);
                await new Promise(r => setTimeout(r, waitTime));
                continue; 
            }

            // 4. Успіх або клієнтська помилка (4xx окрім 429 не ретраїмо)
            if (response.ok || response.status < 500) {
                if (response.ok) failureCount = 0; // Скидаємо лічильник збоїв при успіху
                return response;
            }

            // Помилка 5xx -> викликати catch для запуску логіки ретраю
            throw new Error(`Server Error ${response.status}`);

        } catch (error) {
            clearTimeout(timeoutId); 

            const isLastAttempt = attempt === maxRetries - 1;
            
            const errorData = await normalizeError(error, null);

            if (error.name === 'AbortError') {
                console.error(`[TIMEOUT] Request aborted after ${timeout}ms`);
            } else {
                console.error(`[Attempt ${attempt + 1}] Failed: ${errorData.error}`);
            }

            if (isLastAttempt) {
                failureCount++;
                if (failureCount >= FAILURE_THRESHOLD) {
                    setDegradedMode(true);
                }
                throw errorData;
            }

            // Експоненційний Backoff з Джитером перед наступною спробою
            const base = delay * Math.pow(2, attempt);
            const jitter = Math.random() * base; 
            const waitTime = Math.min(base + jitter, 10000);
            
            console.log(`Waiting ${Math.round(waitTime)}ms before next retry...`);
            await new Promise(r => setTimeout(r, waitTime));
        }
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