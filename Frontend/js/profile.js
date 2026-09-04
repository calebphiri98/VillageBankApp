document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userName').textContent = user.full_name || user.username || 'User';

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    let currentMemberId = null;
    let currentTotalSavings = 0;

    async function loadProfile() {
        try {
            const data = await apiRequest('/profile/me');
            currentMemberId = data.member.id;
            currentTotalSavings = parseFloat(data.total_savings || 0);
            const maxLoan = currentTotalSavings * 3;

            document.getElementById('summaryCards').innerHTML = `
                <div class="profile-card">
                    <h3>Total Savings</h3>
                    <div class="value">MWK ${Number(data.total_savings).toLocaleString()}</div>
                </div>
                <div class="profile-card gold">
                    <h3>Active Loans</h3>
                    <div class="value">${data.loans.filter(l => l.status === 'approved').length}</div>
                </div>
                <div class="profile-card">
                    <h3>Total Fines</h3>
                    <div class="value">MWK ${Number(data.total_fines).toLocaleString()}</div>
                </div>
                <div class="profile-card gold">
                    <h3>Documents</h3>
                    <div class="value">${data.documents.length}</div>
                </div>
            `;

            document.getElementById('loanLimitBox').innerHTML = `
                <strong>Your Savings:</strong> MWK ${currentTotalSavings.toLocaleString()}<br>
                <strong>Maximum Loan Allowed:</strong> <span style="color:#c9a227;">MWK ${maxLoan.toLocaleString()}</span>
            `;

            const m = data.member;
            document.getElementById('personalInfo').innerHTML = `
                <div class="info-row"><span>Full Name</span><span>${m.full_name || '-'}</span></div>
                <div class="info-row"><span>Username</span><span>${m.username || '-'}</span></div>
                <div class="info-row"><span>Membership No.</span><span>${m.membership_number || '-'}</span></div>
                <div class="info-row"><span>Phone</span><span>${m.phone || '-'}</span></div>
                <div class="info-row"><span>Gender</span><span>${m.gender || '-'}</span></div>
                <div class="info-row"><span>Marital Status</span><span>${m.marital_status || '-'}</span></div>
                <div class="info-row"><span>Date of Birth</span><span>${m.date_of_birth ? new Date(m.date_of_birth).toLocaleDateString() : '-'}</span></div>
                <div class="info-row"><span>Village</span><span>${m.village || '-'}</span></div>
                <div class="info-row"><span>Address</span><span>${m.address || '-'}</span></div>
                <div class="info-row"><span>Role</span><span>${m.role || '-'}</span></div>
                <div class="info-row"><span>Status</span><span>${m.status || '-'}</span></div>
                <div class="info-row"><span>Date Joined</span><span>${m.date_joined ? new Date(m.date_joined).toLocaleDateString() : '-'}</span></div>
            `;

            document.getElementById('full_name').value = m.full_name || '';
            document.getElementById('phone').value = m.phone || '';
            document.getElementById('gender').value = m.gender || '';
            document.getElementById('marital_status').value = m.marital_status || '';
            document.getElementById('date_of_birth').value = m.date_of_birth ? m.date_of_birth.substring(0, 10) : '';
            document.getElementById('village').value = m.village || '';
            document.getElementById('address').value = m.address || '';

            document.getElementById('savingsBody').innerHTML = data.savings.length
                ? data.savings.map(s => `
                    <tr>
                        <td>${s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                        <td>MWK ${Number(s.amount).toLocaleString()}</td>
                    </tr>
                `).join('')
                : `<tr><td colspan="2">No savings records</td></tr>`;

            document.getElementById('loansBody').innerHTML = data.loans.length
                ? data.loans.map(l => `
                    <tr>
                        <td>MWK ${Number(l.amount).toLocaleString()}</td>
                        <td>${l.interest_rate}%</td>
                        <td>MWK ${Number(l.total_due).toLocaleString()}</td>
                        <td>MWK ${Number(l.outstanding_balance).toLocaleString()}</td>
                        <td><strong>${l.status}</strong></td>
                        <td>${l.due_date ? new Date(l.due_date).toLocaleDateString() : '-'}</td>
                        <td><button class="btn-sm btn-edit" onclick="viewStatement(${l.id})">Statement</button></td>
                    </tr>
                `).join('')
                : `<tr><td colspan="7">No loans</td></tr>`;

            document.getElementById('finesBody').innerHTML = data.fines.length
                ? data.fines.map(f => `
                    <tr>
                        <td>${f.date ? new Date(f.date).toLocaleDateString() : '-'}</td>
                        <td>MWK ${Number(f.amount).toLocaleString()}</td>
                        <td>${f.reason || '-'}</td>
                    </tr>
                `).join('')
                : `<tr><td colspan="3">No fines</td></tr>`;

            renderDocuments(data.documents);

        } catch (error) {
            document.getElementById('summaryCards').innerHTML = `
                <p style="color:red;">Error: ${error.message}</p>
            `;
        }
    }

    function renderDocuments(documents) {
        const box = document.getElementById('documentsList');
        if (!documents.length) {
            box.innerHTML = `<p style="color:#666;">No documents uploaded yet.</p>`;
            return;
        }

        box.innerHTML = documents.map(d => `
            <div class="doc-item">
                <div>
                    <strong>${d.document_type}</strong><br>
                    <small>${d.original_name} • ${new Date(d.uploaded_at).toLocaleDateString()}</small>
                </div>
                <div>
                    <a href="http://localhost:5000/uploads/documents/${d.file_name}" target="_blank" class="btn-sm btn-edit">View</a>
                    <button class="btn-sm btn-delete" onclick="deleteDoc(${d.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Update profile
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profileMessage');
        msg.textContent = '';

        const body = {
            full_name: document.getElementById('full_name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            gender: document.getElementById('gender').value,
            marital_status: document.getElementById('marital_status').value,
            date_of_birth: document.getElementById('date_of_birth').value || null,
            village: document.getElementById('village').value.trim(),
            address: document.getElementById('address').value.trim()
        };

        try {
            const result = await apiRequest('/profile/me', 'PUT', body);
            msg.style.color = 'green';
            msg.textContent = result.message;
            loadProfile();
        } catch (error) {
            msg.style.color = 'red';
            msg.textContent = error.message;
        }
    });

    // Change Password
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('passwordMessage');
        msg.textContent = '';

        const current_password = document.getElementById('current_password').value;
        const new_password = document.getElementById('new_password').value;
        const confirm_new_password = document.getElementById('confirm_new_password').value;

        if (new_password !== confirm_new_password) {
            msg.style.color = 'red';
            msg.textContent = 'New passwords do not match';
            return;
        }

        try {
            const result = await apiRequest('/auth/change-password', 'PUT', {
                current_password,
                new_password
            });
            msg.style.color = 'green';
            msg.textContent = result.message;
            document.getElementById('changePasswordForm').reset();
        } catch (error) {
            msg.style.color = 'red';
            msg.textContent = error.message;
        }
    });

    // Show / hide password
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Request Loan
    document.getElementById('loanRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('loanRequestMessage');
        msg.textContent = '';

        const amount = parseFloat(document.getElementById('loan_amount').value);
        const due_date = document.getElementById('loan_due_date').value;
        const maxLoan = currentTotalSavings * 3;

        if (!currentMemberId) {
            msg.style.color = 'red';
            msg.textContent = 'Member profile not loaded';
            return;
        }

        if (amount > maxLoan) {
            msg.style.color = 'red';
            msg.textContent = `Amount exceeds maximum allowed loan of MWK ${maxLoan.toLocaleString()}`;
            return;
        }

        try {
            const result = await apiRequest('/loans/apply', 'POST', {
                member_id: currentMemberId,
                amount,
                interest_rate: 10,
                due_date
            });

            msg.style.color = 'green';
            msg.textContent = result.message || 'Loan request submitted successfully';
            document.getElementById('loanRequestForm').reset();
            loadProfile();
        } catch (error) {
            msg.style.color = 'red';
            msg.textContent = error.message;
        }
    });

    // Loan Statement
    window.viewStatement = async function(loanId) {
        try {
            const data = await apiRequest(`/loans/${loanId}/statement`);
            const content = document.getElementById('statementContent');

            const loan = data.loan || data;
            const repayments = data.repayments || loan.repayments || [];

            const amount = loan.amount ?? loan.principal ?? 0;
            const interestRate = loan.interest_rate ?? loan.interestRate ?? 0;
            const totalDue = loan.total_due ?? loan.totalDue ?? 0;
            const totalRepaid = loan.total_repaid ?? loan.totalRepaid ?? 0;
            const outstanding = loan.outstanding_balance ?? loan.outstanding ?? 0;
            const status = loan.status ?? '-';
            const dueDate = loan.due_date ?? loan.dueDate ?? null;
            const fullName = loan.full_name ?? data.full_name ?? '-';
            const membershipNo = loan.membership_number ?? data.membership_number ?? '-';

            content.innerHTML = `
                <p><strong>Member:</strong> ${fullName}</p>
                <p><strong>Membership No:</strong> ${membershipNo}</p>
                <p><strong>Loan Amount:</strong> MWK ${Number(amount).toLocaleString()}</p>
                <p><strong>Interest Rate:</strong> ${interestRate}%</p>
                <p><strong>Total Due:</strong> MWK ${Number(totalDue).toLocaleString()}</p>
                <p><strong>Total Repaid:</strong> MWK ${Number(totalRepaid).toLocaleString()}</p>
                <p><strong>Outstanding:</strong> MWK ${Number(outstanding).toLocaleString()}</p>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : '-'}</p>
                <hr>
                <h3 style="margin:12px 0;">Repayments</h3>
                ${
                    repayments.length
                    ? `<table style="width:100%; font-size:14px;">
                        <tr><th style="text-align:left;">Date</th><th style="text-align:left;">Amount</th></tr>
                        ${repayments.map(r => `
                            <tr>
                                <td>${r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                                <td>MWK ${Number(r.amount).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                       </table>`
                    : '<p>No repayments yet.</p>'
                }
            `;

            document.getElementById('statementModal').style.display = 'block';
        } catch (error) {
            alert('Error loading statement: ' + error.message);
        }
    };

    document.getElementById('closeStatementModal').addEventListener('click', () => {
        document.getElementById('statementModal').style.display = 'none';
    });

    document.getElementById('printStatementBtn').addEventListener('click', () => {
        window.print();
    });

    // Upload document
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('uploadMessage');
        msg.textContent = '';

        const fileInput = document.getElementById('document_file');
        const document_type = document.getElementById('document_type').value;

        if (!fileInput.files[0]) {
            msg.style.color = 'red';
            msg.textContent = 'Please select a file';
            return;
        }

        const formData = new FormData();
        formData.append('document', fileInput.files[0]);
        formData.append('document_type', document_type);

        try {
            const response = await fetch('http://localhost:5000/api/profile/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Upload failed');

            msg.style.color = 'green';
            msg.textContent = result.message;
            document.getElementById('uploadForm').reset();
            loadProfile();
        } catch (error) {
            msg.style.color = 'red';
            msg.textContent = error.message;
        }
    });

    window.deleteDoc = async function(id) {
        if (!confirm('Delete this document?')) return;
        try {
            await apiRequest(`/profile/documents/${id}`, 'DELETE');
            loadProfile();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    loadProfile();
});