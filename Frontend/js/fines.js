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
    const modal = document.getElementById('addFineModal');
    const addFineBtn = document.getElementById('addFineBtn');
    const closeModal = document.getElementById('closeFineModal');
    const addFineForm = document.getElementById('addFineForm');
    const formMessage = document.getElementById('fineFormMessage');
    const memberSelect = document.getElementById('fine_member_id');

    // Open modal
    addFineBtn.addEventListener('click', async () => {
        modal.style.display = 'block';
        formMessage.textContent = '';
        addFineForm.reset();
        document.getElementById('fine_date').value = new Date().toISOString().split('T')[0];

        try {
            const members = await apiRequest('/members');
            memberSelect.innerHTML = '<option value="">Select Member</option>';
            members.forEach(member => {
                if (member.status === 'active') {
                    memberSelect.innerHTML += `<option value="${member.id}">${member.full_name} (${member.membership_number})</option>`;
                }
            });
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Failed to load members';
        }
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Load fines
    async function loadFines() {
        try {
            const fines = await apiRequest('/fines');
            const tbody = document.getElementById('finesTableBody');

            if (fines.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6">No fines found</td></tr>`;
            } else {
                tbody.innerHTML = fines.map(fine => `
                    <tr>
                        <td>${fine.date ? new Date(fine.date).toLocaleDateString() : '-'}</td>
                        <td>${fine.full_name || '-'}</td>
                        <td>${fine.membership_number || '-'}</td>
                        <td>MWK ${Number(fine.amount).toLocaleString()}</td>
                        <td>${fine.reason || '-'}</td>
                        <td>
                            <button class="btn-sm btn-delete" onclick="deleteFine(${fine.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Load total fines
            const totalData = await apiRequest('/fines/total');
            document.getElementById('totalFines').textContent = 
                `MWK ${Number(totalData.total_fines || 0).toLocaleString()}`;

        } catch (error) {
            document.getElementById('finesTableBody').innerHTML = `
                <tr><td colspan="6" style="color: red;">Error loading fines: ${error.message}</td></tr>
            `;
        }
    }

    // Handle Add Fine form
    addFineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';

        const fineData = {
            member_id: document.getElementById('fine_member_id').value,
            amount: document.getElementById('fine_amount').value,
            reason: document.getElementById('fine_reason').value,
            date: document.getElementById('fine_date').value
        };

        try {
            await apiRequest('/fines', 'POST', fineData);
            formMessage.style.color = 'green';
            formMessage.textContent = 'Fine recorded successfully!';

            setTimeout(() => {
                modal.style.display = 'none';
                loadFines();
            }, 800);
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = error.message || 'Failed to record fine';
        }
    });

    // Delete fine
    window.deleteFine = async function(id) {
        if (!confirm('Are you sure you want to delete this fine?')) return;

        try {
            await apiRequest(`/fines/${id}`, 'DELETE');
            alert('Fine deleted successfully');
            loadFines();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // Load data
    loadFines();
});