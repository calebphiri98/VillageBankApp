document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Show logged-in user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    } else if (userNameElement && user.username) {
        userNameElement.textContent = user.username;
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Load Dashboard Summary
    try {
        const data = await apiRequest('/reports/dashboard');

        const cardsContainer = document.getElementById('dashboardCards');
        cardsContainer.innerHTML = `
            <div class="card">
                <h3>Active Members</h3>
                <div class="value">${data.total_active_members}</div>
            </div>
            <div class="card">
                <h3>Total Savings</h3>
                <div class="value">MWK ${Number(data.total_savings).toLocaleString()}</div>
            </div>
            <div class="card">
                <h3>Active Loans</h3>
                <div class="value">${data.active_loans}</div>
            </div>
            <div class="card">
                <h3>Outstanding Loans</h3>
                <div class="value">MWK ${Number(data.total_outstanding_loans).toLocaleString()}</div>
            </div>
            <div class="card">
                <h3>Welfare Balance</h3>
                <div class="value">MWK ${Number(data.welfare_balance).toLocaleString()}</div>
            </div>
            <div class="card">
                <h3>Total Fines</h3>
                <div class="value">MWK ${Number(data.total_fines).toLocaleString()}</div>
            </div>
            <div class="card">
                <h3>Active Cycle</h3>
                <div class="value" style="font-size: 18px;">${data.active_cycle}</div>
            </div>
        `;
    } catch (error) {
        document.getElementById('dashboardCards').innerHTML = `
            <p style="color: red;">Failed to load dashboard data: ${error.message}</p>
        `;
    }

        // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});