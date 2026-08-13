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

    // Modal elements
    const addModal = document.getElementById('addMemberModal');
    const editModal = document.getElementById('editMemberModal');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const closeModal = document.getElementById('closeModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const addMemberForm = document.getElementById('addMemberForm');
    const editMemberForm = document.getElementById('editMemberForm');
    const formMessage = document.getElementById('formMessage');
    const editFormMessage = document.getElementById('editFormMessage');

    // Open Add Modal
    addMemberBtn.addEventListener('click', () => {
        addModal.style.display = 'block';
        formMessage.textContent = '';
        addMemberForm.reset();
    });

    // Close modals
    closeModal.addEventListener('click', () => addModal.style.display = 'none');
    closeEditModal.addEventListener('click', () => editModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.style.display = 'none';
        if (e.target === editModal) editModal.style.display = 'none';
    });

    // Load members
    async function loadMembers() {
        try {
            const members = await apiRequest('/members');
            const tbody = document.getElementById('membersTableBody');

            if (members.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7">No members found</td></tr>`;
                return;
            }

            tbody.innerHTML = members.map(member => `
                <tr>
                    <td>${member.membership_number || '-'}</td>
                    <td>${member.full_name || '-'}</td>
                    <td>${member.phone || '-'}</td>
                    <td>${member.role || '-'}</td>
                    <td class="${member.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${member.status || '-'}
                    </td>
                    <td>${member.date_joined ? new Date(member.date_joined).toLocaleDateString() : '-'}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editMember(${member.id}, '${member.full_name}', '${member.phone}', '${member.role}', '${member.status}', '${member.date_joined ? member.date_joined.split('T')[0] : ''}')">Edit</button>
                        <button class="btn-sm btn-delete" onclick="deactivateMember(${member.id})">Deactivate</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('membersTableBody').innerHTML = `
                <tr><td colspan="7" style="color: red;">Error loading members: ${error.message}</td></tr>
            `;
        }
    }

    // Handle Add Member form
    addMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';

        const memberData = {
            membership_number: document.getElementById('membership_number').value.trim(),
            full_name: document.getElementById('full_name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            role: document.getElementById('role').value,
            date_joined: document.getElementById('date_joined').value
        };

        try {
            await apiRequest('/members', 'POST', memberData);
            formMessage.style.color = 'green';
            formMessage.textContent = 'Member added successfully!';
            
            setTimeout(() => {
                addModal.style.display = 'none';
                loadMembers();
            }, 800);
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = error.message || 'Failed to add member';
        }
    });

    // Open Edit Modal
    window.editMember = function(id, fullName, phone, role, status, dateJoined) {
        document.getElementById('edit_member_id').value = id;
        document.getElementById('edit_full_name').value = fullName;
        document.getElementById('edit_phone').value = phone;
        document.getElementById('edit_role').value = role || 'member';
        document.getElementById('edit_status').value = status;
        document.getElementById('edit_date_joined').value = dateJoined;
        editFormMessage.textContent = '';
        editModal.style.display = 'block';
    };

    // Handle Edit Member form
    editMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editFormMessage.textContent = '';

        const id = document.getElementById('edit_member_id').value;
        const memberData = {
            full_name: document.getElementById('edit_full_name').value.trim(),
            phone: document.getElementById('edit_phone').value.trim(),
            role: document.getElementById('edit_role').value,
            status: document.getElementById('edit_status').value,
            date_joined: document.getElementById('edit_date_joined').value
        };

        try {
            await apiRequest(`/members/${id}`, 'PUT', memberData);
            editFormMessage.style.color = 'green';
            editFormMessage.textContent = 'Member updated successfully!';

            setTimeout(() => {
                editModal.style.display = 'none';
                loadMembers();
            }, 800);
        } catch (error) {
            editFormMessage.style.color = 'red';
            editFormMessage.textContent = error.message || 'Failed to update member';
        }
    });

    // Deactivate member
    window.deactivateMember = async function(id) {
        if (!confirm('Are you sure you want to deactivate this member?')) return;

        try {
            await apiRequest(`/members/${id}`, 'DELETE');
            alert('Member deactivated successfully');
            loadMembers();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };
        // If coming from an approved join request, open Add Member form pre-filled
    const pendingMember = localStorage.getItem('pendingNewMember');
    if (pendingMember) {
        try {
            const data = JSON.parse(pendingMember);
            localStorage.removeItem('pendingNewMember');

            // Open the Add Member modal
            addModal.style.display = 'block';
            formMessage.textContent = '';
            addMemberForm.reset();

            // Pre-fill name and phone
            document.getElementById('full_name').value = data.full_name || '';
            document.getElementById('phone').value = data.phone || '';

            // Focus on membership number so committee can type it
            document.getElementById('membership_number').focus();
        } catch (e) {
            localStorage.removeItem('pendingNewMember');
        }
    }
    

    // Load data
    loadMembers();

        // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});