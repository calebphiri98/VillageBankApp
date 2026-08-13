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

    // Load join requests
    async function loadRequests() {
        try {
            const requests = await apiRequest('/join-requests');
            const tbody = document.getElementById('requestsTableBody');

            if (requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7">No join requests found</td></tr>`;
                return;
            }

            tbody.innerHTML = requests.map(req => {
                let actions = '-';
                if (req.status === 'pending') {
                    actions = `
                        <button class="btn-sm btn-edit" onclick="updateRequest(${req.id}, 'approved')">Approve</button>
                        <button class="btn-sm btn-delete" onclick="updateRequest(${req.id}, 'rejected')">Reject</button>
                    `;
                }

                const statusColor = req.status === 'pending' ? '#f9a825' 
                    : req.status === 'approved' ? '#0d904f' : '#d93025';

                return `
                    <tr>
                        <td>${req.full_name || '-'}</td>
                        <td>${req.phone || '-'}</td>
                        <td>${req.village || '-'}</td>
                        <td>${req.reason || '-'}</td>
                        <td><strong style="color: ${statusColor};">${req.status}</strong></td>
                        <td>${req.created_at ? new Date(req.created_at).toLocaleDateString() : '-'}</td>
                        <td>${actions}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            document.getElementById('requestsTableBody').innerHTML = `
                <tr><td colspan="7" style="color: red;">Error: ${error.message}</td></tr>
            `;
        }
    }

    // Approve or Reject
        // Approve or Reject
    window.updateRequest = async function(id, status) {
        const action = status === 'approved' ? 'approve' : 'reject';
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;

        try {
            // Get request details first (for pre-filling)
            const requests = await apiRequest('/join-requests');
            const request = requests.find(r => r.id === id);

            await apiRequest(`/join-requests/${id}/status`, 'PUT', { status });

            if (status === 'approved' && request) {
                
                // Save details so Members page can pre-fill the form
                localStorage.setItem('pendingNewMember', JSON.stringify({
                    full_name: request.full_name,
                    phone: request.phone
                }));

                alert('Request approved! You will now be taken to add this person as a member.');
                window.location.href = 'members.html';
            } else {
                alert(`Request ${status} successfully`);
                loadRequests();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    loadRequests();
});