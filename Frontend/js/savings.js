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

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Modal elements
    const addModal = document.getElementById('addSavingModal');
    const editModal = document.getElementById('editSavingModal');
    const addSavingBtn = document.getElementById('addSavingBtn');
    const closeAddModal = document.getElementById('closeSavingModal');
    const closeEditModal = document.getElementById('closeEditSavingModal');
    const addSavingForm = document.getElementById('addSavingForm');
    const editSavingForm = document.getElementById('editSavingForm');
    const formMessage = document.getElementById('savingFormMessage');
    const editFormMessage = document.getElementById('editSavingMessage');
    const memberSelect = document.getElementById('saving_member_id');

    // Open Add Modal
    addSavingBtn.addEventListener('click', async () => {
        addModal.style.display = 'block';
        formMessage.textContent = '';
        addSavingForm.reset();
        document.getElementById('saving_date').value = new Date().toISOString().split('T')[0];

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

    // Close modals
    closeAddModal.addEventListener('click', () => addModal.style.display = 'none');
    closeEditModal.addEventListener('click', () => editModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.style.display = 'none';
        if (e.target === editModal) editModal.style.display = 'none';
    });

    // Load savings
    async function loadSavings() {
        try {
            const savings = await apiRequest('/savings');
            const tbody = document.getElementById('savingsTableBody');

            if (savings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No savings records found</td></tr>`;
            } else {
                tbody.innerHTML = savings.map(saving => `
                    <tr>
                        <td>${saving.date ? new Date(saving.date).toLocaleDateString() : '-'}</td>
                        <td>${saving.full_name || '-'}</td>
                        <td>${saving.membership_number || '-'}</td>
                        <td>MWK ${Number(saving.amount).toLocaleString()}</td>
                        <td>
                            <button class="btn-sm btn-edit" onclick="editSaving(${saving.id}, ${saving.amount}, '${saving.date ? saving.date.split('T')[0] : ''}')">Edit</button>
                            <button class="btn-sm btn-delete" onclick="deleteSaving(${saving.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Load total savings
            const totalData = await apiRequest('/savings/total');
            document.getElementById('totalSavings').textContent = 
                `MWK ${Number(totalData.total_savings || 0).toLocaleString()}`;

        } catch (error) {
            document.getElementById('savingsTableBody').innerHTML = `
                <tr><td colspan="5" style="color: red;">Error loading savings: ${error.message}</td></tr>
            `;
        }
    }

    // Handle Add Saving form
    addSavingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';

        const savingData = {
            member_id: document.getElementById('saving_member_id').value,
            amount: document.getElementById('saving_amount').value,
            date: document.getElementById('saving_date').value
        };

        try {
            await apiRequest('/savings', 'POST', savingData);
            formMessage.style.color = 'green';
            formMessage.textContent = 'Saving recorded successfully!';

            setTimeout(() => {
                addModal.style.display = 'none';
                loadSavings();
            }, 800);
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = error.message || 'Failed to record saving';
        }
    });

    // Open Edit Modal
    window.editSaving = function(id, amount, date) {
        document.getElementById('edit_saving_id').value = id;
        document.getElementById('edit_saving_amount').value = amount;
        document.getElementById('edit_saving_date').value = date;
        editFormMessage.textContent = '';
        editModal.style.display = 'block';
    };

    // Handle Edit Saving form
    editSavingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editFormMessage.textContent = '';

        const id = document.getElementById('edit_saving_id').value;
        const savingData = {
            amount: document.getElementById('edit_saving_amount').value,
            date: document.getElementById('edit_saving_date').value
        };

        try {
            await apiRequest(`/savings/${id}`, 'PUT', savingData);
            editFormMessage.style.color = 'green';
            editFormMessage.textContent = 'Saving updated successfully!';

            setTimeout(() => {
                editModal.style.display = 'none';
                loadSavings();
            }, 800);
        } catch (error) {
            editFormMessage.style.color = 'red';
            editFormMessage.textContent = error.message || 'Failed to update saving';
        }
    });

    // Delete saving
    window.deleteSaving = async function(id) {
        if (!confirm('Are you sure you want to delete this saving record?')) return;

        try {
            await apiRequest(`/savings/${id}`, 'DELETE');
            alert('Saving deleted successfully');
            loadSavings();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // Load data
    loadSavings();
});