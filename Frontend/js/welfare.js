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

    // Modal elements
    const contributeModal = document.getElementById('contributeModal');
    const assistModal = document.getElementById('assistModal');
    const contributeBtn = document.getElementById('contributeBtn');
    const assistBtn = document.getElementById('assistBtn');
    const closeContributeModal = document.getElementById('closeContributeModal');
    const closeAssistModal = document.getElementById('closeAssistModal');
    const contributeForm = document.getElementById('contributeForm');
    const assistForm = document.getElementById('assistForm');
    const contributeMessage = document.getElementById('contributeMessage');
    const assistMessage = document.getElementById('assistMessage');

    // Load members into selects
    async function loadMembersIntoSelects() {
        try {
            const members = await apiRequest('/members');
            const contributeSelect = document.getElementById('contribute_member_id');
            const assistSelect = document.getElementById('assist_member_id');

            contributeSelect.innerHTML = '<option value="">Select Member (or leave blank)</option>';
            assistSelect.innerHTML = '<option value="">Select Member</option>';

            members.forEach(member => {
                if (member.status === 'active') {
                    const option = `<option value="${member.id}">${member.full_name} (${member.membership_number})</option>`;
                    contributeSelect.innerHTML += option;
                    assistSelect.innerHTML += option;
                }
            });
        } catch (error) {
            console.error('Failed to load members');
        }
    }

    // Open modals
    contributeBtn.addEventListener('click', () => {
        contributeModal.style.display = 'block';
        contributeMessage.textContent = '';
        contributeForm.reset();
        document.getElementById('contribute_date').value = new Date().toISOString().split('T')[0];
        loadMembersIntoSelects();
    });

    assistBtn.addEventListener('click', () => {
        assistModal.style.display = 'block';
        assistMessage.textContent = '';
        assistForm.reset();
        document.getElementById('assist_date').value = new Date().toISOString().split('T')[0];
        loadMembersIntoSelects();
    });

    // Close modals
    closeContributeModal.addEventListener('click', () => contributeModal.style.display = 'none');
    closeAssistModal.addEventListener('click', () => assistModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === contributeModal) contributeModal.style.display = 'none';
        if (e.target === assistModal) assistModal.style.display = 'none';
    });

    // Load welfare data
    async function loadWelfare() {
        try {
            // Balance & summary
            const balance = await apiRequest('/welfare/balance');
            document.getElementById('welfareBalance').textContent = 
                `MWK ${Number(balance.current_balance || 0).toLocaleString()}`;
            document.getElementById('totalContributions').textContent = 
                `MWK ${Number(balance.total_contributions || 0).toLocaleString()}`;
            document.getElementById('totalAssistance').textContent = 
                `MWK ${Number(balance.total_payouts || 0).toLocaleString()}`;

            // Transaction history
            const history = await apiRequest('/welfare/history');
            const tbody = document.getElementById('welfareTableBody');

            if (history.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No transactions found</td></tr>`;
                return;
            }

            tbody.innerHTML = history.map(t => `
                <tr>
                    <td>${t.date ? new Date(t.date).toLocaleDateString() : '-'}</td>
                    <td>${t.full_name || '-'}</td>
                    <td>
                        <span style="color: ${t.type === 'contribution' ? '#0d904f' : '#d93025'}; font-weight: 600;">
                            ${t.type}
                        </span>
                    </td>
                    <td>MWK ${Number(t.amount).toLocaleString()}</td>
                    <td>${t.notes || '-'}</td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('welfareTableBody').innerHTML = `
                <tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>
            `;
        }
    }

    // Handle Contribution form
    contributeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        contributeMessage.textContent = '';

        const data = {
            member_id: document.getElementById('contribute_member_id').value || null,
            amount: document.getElementById('contribute_amount').value,
            date: document.getElementById('contribute_date').value,
            notes: document.getElementById('contribute_notes').value
        };

        try {
            await apiRequest('/welfare/contribute', 'POST', data);
            contributeMessage.style.color = 'green';
            contributeMessage.textContent = 'Contribution recorded successfully!';

            setTimeout(() => {
                contributeModal.style.display = 'none';
                loadWelfare();
            }, 800);
        } catch (error) {
            contributeMessage.style.color = 'red';
            contributeMessage.textContent = error.message || 'Failed to record contribution';
        }
    });

    // Handle Assistance form
    assistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        assistMessage.textContent = '';

        const data = {
            member_id: document.getElementById('assist_member_id').value,
            amount: document.getElementById('assist_amount').value,
            reason: document.getElementById('assist_reason').value,
            date: document.getElementById('assist_date').value
        };

        try {
            const result = await apiRequest('/welfare/assist', 'POST', data);
            assistMessage.style.color = 'green';
            assistMessage.textContent = `Assistance recorded! Remaining balance: MWK ${Number(result.remaining_balance).toLocaleString()}`;

            setTimeout(() => {
                assistModal.style.display = 'none';
                loadWelfare();
            }, 1000);
        } catch (error) {
            assistMessage.style.color = 'red';
            assistMessage.textContent = error.message || 'Failed to record assistance';
        }
    });

    // Load data
    loadWelfare();
});