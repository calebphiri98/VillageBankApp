document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.full_name || user.username || 'User';
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    const colors = {
        blue: '#1a73e8',
        green: '#0d904f',
        red: '#d93025',
        orange: '#f9a825'
    };

    try {
        const [summary, loans, members, savings, activity] = await Promise.all([
            apiRequest('/reports/dashboard'),
            apiRequest('/loans'),
            apiRequest('/members'),
            apiRequest('/savings'),
            apiRequest('/audit')
        ]);

        // Summary cards
        document.getElementById('dashboardCards').innerHTML = `
            <div class="card"><h3>Active Members</h3><div class="value">${summary.total_active_members}</div></div>
            <div class="card"><h3>Total Savings</h3><div class="value">MWK ${Number(summary.total_savings).toLocaleString()}</div></div>
            <div class="card"><h3>Active Loans</h3><div class="value">${summary.active_loans}</div></div>
            <div class="card"><h3>Outstanding Loans</h3><div class="value">MWK ${Number(summary.total_outstanding_loans).toLocaleString()}</div></div>
            <div class="card"><h3>Welfare Balance</h3><div class="value">MWK ${Number(summary.welfare_balance).toLocaleString()}</div></div>
            <div class="card"><h3>Total Fines</h3><div class="value">MWK ${Number(summary.total_fines).toLocaleString()}</div></div>
            <div class="card"><h3>Active Cycle</h3><div class="value" style="font-size:16px;">${summary.active_cycle || '-'}</div></div>
        `;

        // Charts
        new Chart(document.getElementById('financialChart'), {
            type: 'bar',
            data: {
                labels: ['Savings', 'Outstanding', 'Welfare', 'Fines'],
                datasets: [{
                    data: [summary.total_savings, summary.total_outstanding_loans, summary.welfare_balance, summary.total_fines],
                    backgroundColor: [colors.blue, colors.red, colors.green, colors.orange]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        const statusCount = { pending: 0, approved: 0, repaid: 0, rejected: 0 };
        loans.forEach(l => { if (statusCount[l.status] !== undefined) statusCount[l.status]++; });

        new Chart(document.getElementById('loanStatusChart'), {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved', 'Repaid', 'Rejected'],
                datasets: [{
                    data: [statusCount.pending, statusCount.approved, statusCount.repaid, statusCount.rejected],
                    backgroundColor: [colors.orange, colors.blue, colors.green, colors.red]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        new Chart(document.getElementById('savingsLoansChart'), {
            type: 'pie',
            data: {
                labels: ['Total Savings', 'Outstanding Loans'],
                datasets: [{
                    data: [summary.total_savings, summary.total_outstanding_loans],
                    backgroundColor: [colors.green, colors.red]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        let activeCount = 0, inactiveCount = 0;
        members.forEach(m => { if (m.status === 'active') activeCount++; else inactiveCount++; });

        new Chart(document.getElementById('memberStatusChart'), {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive'],
                datasets: [{
                    data: [activeCount, inactiveCount],
                    backgroundColor: [colors.blue, '#bdbdbd']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Performance
        const totalLoans = loans.length;
        const repaidLoans = loans.filter(l => l.status === 'repaid').length;
        const recoveryRate = totalLoans > 0 ? ((repaidLoans / totalLoans) * 100).toFixed(1) : 0;
        const avgSavings = activeCount > 0 ? (summary.total_savings / activeCount).toFixed(0) : 0;
        const activeLoansCount = loans.filter(l => l.status === 'approved').length;

        let health = 'Good', healthColor = '#0d904f';
        if (summary.total_outstanding_loans > summary.total_savings) {
            health = 'Attention Needed'; healthColor = '#d93025';
        } else if (summary.total_outstanding_loans > summary.total_savings * 0.7) {
            health = 'Moderate'; healthColor = '#f9a825';
        }

        document.getElementById('performanceCards').innerHTML = `
            <div class="card"><h3>Group Health</h3><div class="value" style="font-size:20px;color:${healthColor};">${health}</div></div>
            <div class="card"><h3>Loan Recovery Rate</h3><div class="value">${recoveryRate}%</div></div>
            <div class="card"><h3>Avg Savings / Member</h3><div class="value">MWK ${Number(avgSavings).toLocaleString()}</div></div>
            <div class="card"><h3>Active Loans</h3><div class="value">${activeLoansCount}</div></div>
        `;

        // Top Savers
        const savingsByMember = {};
        savings.forEach(s => {
            const key = s.membership_number || s.full_name || 'Unknown';
            if (!savingsByMember[key]) savingsByMember[key] = { name: s.full_name || key, total: 0 };
            savingsByMember[key].total += parseFloat(s.amount || 0);
        });
        const topSavers = Object.values(savingsByMember).sort((a, b) => b.total - a.total).slice(0, 5);

        document.getElementById('topSaversBody').innerHTML = topSavers.length
            ? topSavers.map((s, i) => `<tr><td><strong>${i + 1}</strong></td><td>${s.name}</td><td>MWK ${Number(s.total).toLocaleString()}</td></tr>`).join('')
            : `<tr><td colspan="3">No savings data</td></tr>`;

        // Outstanding loans
        const outstandingList = loans.filter(l => l.status === 'approved' && parseFloat(l.outstanding_balance || 0) > 0);
        document.getElementById('outstandingLoansBody').innerHTML = outstandingList.length
            ? outstandingList.map(l => `<tr><td>${l.full_name || '-'}</td><td>MWK ${Number(l.outstanding_balance || 0).toLocaleString()}</td><td><strong style="color:#d93025;">${l.status}</strong></td></tr>`).join('')
            : `<tr><td colspan="3">No outstanding loans</td></tr>`;

        // Member dropdown
        const memberSelect = document.getElementById('memberSelect');
        memberSelect.innerHTML = '<option value="">Select a member</option>';
        members.forEach(m => {
            memberSelect.innerHTML += `<option value="${m.id}">${m.full_name} (${m.membership_number || '-'})</option>`;
        });

        memberSelect.addEventListener('change', async (e) => {
            const memberId = e.target.value;
            const container = document.getElementById('memberSummary');
            if (!memberId) {
                container.innerHTML = `<p style="color:#666;">Select a member to view their financial summary.</p>`;
                return;
            }
            try {
                const data = await apiRequest(`/reports/member/${memberId}`);
                let loansHtml = data.loans.length === 0
                    ? `<p style="color:#666;">No loans</p>`
                    : data.loans.map(loan => `
                        <div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:8px;">
                            <strong>Loan #${loan.loan_id}</strong> —
                            Principal: MWK ${Number(loan.principal).toLocaleString()} |
                            Outstanding: <span style="color:${loan.outstanding > 0 ? '#d93025' : '#0d904f'};font-weight:600;">
                                MWK ${Number(loan.outstanding).toLocaleString()}
                            </span> |
                            Status: ${loan.status}
                        </div>
                    `).join('');

                container.innerHTML = `
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin-bottom:20px;">
                        <div class="card"><h3>Total Savings</h3><div class="value" style="font-size:22px;">MWK ${Number(data.total_savings).toLocaleString()}</div></div>
                        <div class="card"><h3>Total Fines</h3><div class="value" style="font-size:22px;">MWK ${Number(data.total_fines).toLocaleString()}</div></div>
                    </div>
                    <h3 style="margin-bottom:10px;font-size:16px;">Loans</h3>
                    ${loansHtml}
                `;
            } catch (err) {
                container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
            }
        });

        // Recent Activity
        document.getElementById('activityTableBody').innerHTML = activity.length
            ? activity.map(log => `
                <tr>
                    <td><strong>${log.action}</strong></td>
                    <td>${log.details || '-'}</td>
                    <td>${log.performed_by || '-'}</td>
                    <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4">No recent activity</td></tr>`;

    } catch (error) {
        document.getElementById('dashboardCards').innerHTML = `
            <p style="color:red;">Failed to load dashboard: ${error.message}</p>
        `;
    }
});