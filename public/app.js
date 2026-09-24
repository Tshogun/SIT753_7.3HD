async function checkHealth() {
    const status = document.getElementById("status");
    const health = document.getElementById("health");
    const response = document.getElementById("response");
    const service = document.getElementById("service");
    const backendStatus = document.getElementById("backend-status");

    status.textContent = "Checking...";
    status.className = "status checking";

    try {
        const res = await fetch("/api/v1/health/live", {
            cache: "no-store"
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`Backend returned HTTP ${res.status}`);
        }

        status.textContent = "● Healthy";
        status.className = "status healthy";

        health.textContent = "Operational";
        backendStatus.textContent = data.code;
        service.textContent = "Express API";
        response.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        status.textContent = "● Offline";
        status.className = "status error";

        health.textContent = "Unavailable";
        backendStatus.textContent = "Error";
        response.textContent = error.message;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("check-health");

    button.addEventListener("click", function () {
        checkHealth();
    });

    checkHealth();
});