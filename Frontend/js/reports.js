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

    // Load Dashboard Summary Cards
    async function loadSummary() {
        try {
            const data = await apiRequest('/reports/dashboard');
            const container = document.getElementById('reportCards');

            container.innerHTML = `
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
                    <div class="value" style="font-size: 16px;">${data.active_cycle}</div>
                </div>
            `;
        } catch (error) {
            document.getElementById('reportCards').innerHTML = `
                <p style="color: red;">Failed to load summary: ${error.message}</p>
            `;
        }
    }

    // Load members into dropdown
    async function loadMembersDropdown() {
        try {
            const members = await apiRequest('/members');
            const select = document.getElementById('memberSelect');
            select.innerHTML = '<option value="">Select a member</option>';

            members.forEach(member => {
                select.innerHTML += `<option value="${member.id}">${member.full_name} (${member.membership_number})</option>`;
            });
        } catch (error) {
            console.error('Failed to load members', error);
        }
    }

    // Load member financial summary
    document.getElementById('memberSelect').addEventListener('change', async (e) => {
        const memberId = e.target.value;
        const container = document.getElementById('memberSummary');

        if (!memberId) {
            container.innerHTML = `<p style="color: #666;">Select a member to view their financial summary.</p>`;
            return;
        }

        try {
            const data = await apiRequest(`/reports/member/${memberId}`);

            let loansHtml = '';
            if (data.loans.length === 0) {
                loansHtml = `<p style="color: #666;">No loans</p>`;
            } else {
                loansHtml = data.loans.map(loan => `
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                        <strong>Loan #${loan.loan_id}</strong> — 
                        Principal: MWK ${Number(loan.principal).toLocaleString()} | 
                        Outstanding: <span style="color: ${loan.outstanding > 0 ? '#d93025' : '#0d904f'}; font-weight: 600;">
                            MWK ${Number(loan.outstanding).toLocaleString()}
                        </span> | 
                        Status: ${loan.status}
                    </div>
                `).join('');
            }

            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div class="card">
                        <h3>Total Savings</h3>
                        <div class="value" style="font-size: 22px;">MWK ${Number(data.total_savings).toLocaleString()}</div>
                    </div>
                    <div class="card">
                        <h3>Total Fines</h3>
                        <div class="value" style="font-size: 22px;">MWK ${Number(data.total_fines).toLocaleString()}</div>
                    </div>
                </div>
                <h3 style="margin-bottom: 10px; font-size: 16px;">Loans</h3>
                ${loansHtml}
            `;
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    });

    // Load recent activity
    async function loadActivity() {
        try {
            const logs = await apiRequest('/audit/recent');
            const tbody = document.getElementById('activityTableBody');

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4">No recent activity</td></tr>`;
                return;
            }

            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td><strong>${log.action}</strong></td>
                    <td>${log.details || '-'}</td>
                    <td>${log.performed_by || '-'}</td>
                    <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('activityTableBody').innerHTML = `
                <tr><td colspan="4" style="color: red;">Error loading activity: ${error.message}</td></tr>
            `;
        }
    }

    // Load everything
    loadSummary();
    loadMembersDropdown();
    loadActivity();
});