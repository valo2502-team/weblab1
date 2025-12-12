async function fetchWithRetry(url, options = {}, maxRetries = 5) {
    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                if (retryAfter) {
                    const waitTime = parseInt(retryAfter, 10) * 1000;
                    console.warn(`[RETRY] Rate limit (429). Waiting for ${waitTime / 1000}s as per Retry-After header.`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }
         
            if (response.ok || response.status < 500) {
                return response;
            }
            
            if (response.status >= 500) {
                console.warn(`[RETRY] Server error ${response.status} on attempt ${attempt + 1}. Retrying...`);
            }

        } catch (error) {
            console.error(`[RETRY] Network error on attempt ${attempt + 1}: ${error.message}. Retrying...`);
        }
        
        if (attempt < maxRetries - 1) {
            const base = delay * Math.pow(2, attempt);
            const jitter = Math.random() * base;
            const finalDelay = Math.min(base + jitter, 30000);
            
            console.log(`[BACKOFF] Waiting for ${Math.round(finalDelay / 1000)}s before next attempt.`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
    }

    throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts.`);
}

document.getElementById("btn_load").addEventListener("click", async () => {
    try {
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/");
        
        const data = await res.json();
        const list = document.getElementById("list");
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.name;
            list.appendChild(li);
        });

    } catch (error) {
        alert(`Помилка завантаження товарів: ${error.message}`);
        console.error(error);
    }
});

document.getElementById("btn_500").addEventListener("click", async () => {
    try {
        console.log("--- TEST: 500 ERROR (BACKOFF/JITTER) START ---");
        await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=500", {}, 5);
        console.log("TEST 500: SUCCESSFUL (should not happen in this test)");
    } catch (e) {
        console.error("--- TEST: 500 ERROR (BACKOFF/JITTER) FAILED AS EXPECTED:", e.message, "---");
    }
});

document.getElementById("btn_429").addEventListener("click", async () => {
    try {
        console.log("--- TEST: 429 RATE LIMIT (RETRY-AFTER 5S) START ---");
        const res = await fetchWithRetry("http://127.0.0.1:8000/items/simulate/?status=429", {}, 3);
        const data = await res.json();
        console.log("--- TEST: 429 RATE LIMIT SUCCESS ---", data);
    } catch (e) {
        console.error("--- TEST: 429 RATE LIMIT FAILED ---", e.message);
    }
});

document.getElementById("btn_network").addEventListener("click", async () => {
    try {
        console.log("--- TEST: NETWORK ERROR START (CHECK BACKOFF) ---");
        await fetchWithRetry("http://localhost:9999/items/simulate/", {}, 3);
        console.log("TEST NETWORK: SUCCESSFUL (should not happen)");
    } catch (e) {
        console.error("--- TEST: NETWORK ERROR FAILED AS EXPECTED:", e.message, "---");
    }
});