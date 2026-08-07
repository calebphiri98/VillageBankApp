document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Show user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.full_name || user.username || 'User';
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Load previous share-outs
    async function loadHistory() {
        try {
            const records = await apiRequest('/shareout');
            const tbody = document.getElementById('historyTableBody');

            if (records.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4">No previous share-outs found</td></tr>`;
                return;
            }

            tbody.innerHTML = records.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td>MWK ${Number(r.total_fund).toLocaleString()}</td>
                    <td>${r.total_members}</td>
                    <td>${r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : '-'}</td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('historyTableBody').innerHTML = `
                <tr><td colspan="4" style="color: red;">Error: ${error.message}</td></tr>
            `;
        }
    }

    // Perform Share-Out
    document.getElementById('performShareOutBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to calculate the Share-Out? This will use current savings, interest, fines and (if enabled) welfare fund.')) {
            return;
        }

        try {
            const result = await apiRequest('/shareout', 'POST', { cycle_id: null });

            // Show breakdown cards
            const breakdown = result.breakdown;
            const cardsContainer = document.getElementById('breakdownCards');
            cardsContainer.style.display = 'grid';
            cardsContainer.innerHTML = `
                <div class="card">
                    <h3>Total Savings</h3>
                    <div class="value">MWK ${Number(breakdown.total_savings).toLocaleString()}</div>
                </div>
                <div class="card">
                    <h3>Total Interest</h3>
                    <div class="value">MWK ${Number(breakdown.total_interest).toLocaleString()}</div>
                </div>
                <div class="card">
                    <h3>Total Fines</h3>
                    <div class="value">MWK ${Number(breakdown.total_fines).toLocaleString()}</div>
                </div>
                <div class="card">
                    <h3>Welfare Included</h3>
                    <div class="value" style="font-size: 18px;">${result.welfare_included ? 'Yes' : 'No'}</div>
                </div>
                <div class="card">
                    <h3>Total Fund</h3>
                    <div class="value">MWK ${Number(breakdown.total_fund).toLocaleString()}</div>
                </div>
                <div class="card">
                    <h3>Members</h3>
                    <div class="value">${result.total_members}</div>
                </div>
            `;

            // Show member shares
            const sharesContainer = document.getElementById('sharesContainer');
            const sharesBody = document.getElementById('sharesTableBody');
            sharesContainer.style.display = 'block';

            sharesBody.innerHTML = result.shares.map(s => `
                <tr>
                    <td>${s.membership_number}</td>
                    <td>${s.full_name}</td>
                    <td>MWK ${Number(s.member_savings).toLocaleString()}</td>
                    <td><strong>MWK ${Number(s.share_amount).toLocaleString()}</strong></td>
                </tr>
            `).join('');

            // Refresh history
            loadHistory();

            alert('Share-Out calculated successfully!');

        } catch (error) {
            alert('Error calculating Share-Out: ' + error.message);
        }
    });

    // Load history on page load
    loadHistory();
});