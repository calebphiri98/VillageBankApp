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
    const applyModal = document.getElementById('applyLoanModal');
    const repayModal = document.getElementById('repayModal');
    const statementModal = document.getElementById('statementModal');
    const applyLoanBtn = document.getElementById('applyLoanBtn');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const closeRepayModal = document.getElementById('closeRepayModal');
    const closeStatementModal = document.getElementById('closeStatementModal');
    const applyLoanForm = document.getElementById('applyLoanForm');
    const repayForm = document.getElementById('repayForm');
    const applyFormMessage = document.getElementById('applyFormMessage');
    const repayFormMessage = document.getElementById('repayFormMessage');
    const memberSelect = document.getElementById('loan_member_id');
    const loanLimitInfo = document.getElementById('loanLimitInfo');

    // Open Apply Loan Modal
    applyLoanBtn.addEventListener('click', async () => {
        applyModal.style.display = 'block';
        applyFormMessage.textContent = '';
        applyLoanForm.reset();
        document.getElementById('loan_interest').value = 10;
        loanLimitInfo.style.display = 'none';

        try {
            const members = await apiRequest('/members');
            memberSelect.innerHTML = '<option value="">Select Member</option>';
            members.forEach(member => {
                if (member.status === 'active') {
                    memberSelect.innerHTML += `<option value="${member.id}">${member.full_name} (${member.membership_number})</option>`;
                }
            });
        } catch (error) {
            applyFormMessage.style.color = 'red';
            applyFormMessage.textContent = 'Failed to load members';
        }
    });

    // When member is selected → show max loan allowed
    memberSelect.addEventListener('change', async () => {
        const memberId = memberSelect.value;

        if (!memberId) {
            loanLimitInfo.style.display = 'none';
            return;
        }

        try {
            const summary = await apiRequest(`/reports/member/${memberId}`);
            const totalSavings = parseFloat(summary.total_savings || 0);
            const maxLoan = totalSavings * 3;

            document.getElementById('memberSavingsDisplay').textContent = `MWK ${totalSavings.toLocaleString()}`;
            document.getElementById('maxLoanDisplay').textContent = `MWK ${maxLoan.toLocaleString()}`;
            loanLimitInfo.style.display = 'block';
        } catch (error) {
            loanLimitInfo.style.display = 'none';
        }
    });

    // Close modals
    closeApplyModal.addEventListener('click', () => applyModal.style.display = 'none');
    closeRepayModal.addEventListener('click', () => repayModal.style.display = 'none');
    if (closeStatementModal) {
        closeStatementModal.addEventListener('click', () => statementModal.style.display = 'none');
    }

    window.addEventListener('click', (e) => {
        if (e.target === applyModal) applyModal.style.display = 'none';
        if (e.target === repayModal) repayModal.style.display = 'none';
        if (e.target === statementModal) statementModal.style.display = 'none';
    });

    // Load loans
    async function loadLoans() {
        try {
            const loans = await apiRequest('/loans');
            const tbody = document.getElementById('loansTableBody');

            if (loans.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8">No loans found</td></tr>`;
            } else {
                tbody.innerHTML = loans.map(loan => {
                    let actionButtons = '';

                    if (loan.status === 'pending') {
                        actionButtons = `
                            <button class="btn-sm btn-edit" onclick="approveLoan(${loan.id})">Approve</button>
                            <button class="btn-sm btn-delete" onclick="rejectLoan(${loan.id})">Reject</button>
                        `;
                    } else if (loan.status === 'approved') {
                        actionButtons = `
                            <button class="btn-sm btn-edit" onclick="openRepayModal(${loan.id})">Repay</button>
                            <button class="btn-sm" onclick="viewStatement(${loan.id})">Statement</button>
                        `;
                    } else {
                        actionButtons = `
                            <button class="btn-sm" onclick="viewStatement(${loan.id})">Statement</button>
                        `;
                    }

                    return `
                        <tr>
                            <td>${loan.full_name || '-'}</td>
                            <td>MWK ${Number(loan.amount).toLocaleString()}</td>
                            <td>${loan.interest_rate}%</td>
                            <td>MWK ${Number(loan.total_due || 0).toLocaleString()}</td>
                            <td>MWK ${Number(loan.outstanding_balance || 0).toLocaleString()}</td>
                            <td><strong>${loan.status}</strong></td>
                            <td>${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-'}</td>
                            <td>${actionButtons}</td>
                        </tr>
                    `;
                }).join('');
            }

            // Load outstanding summary
            try {
                const outstanding = await apiRequest('/loans/outstanding');
                document.getElementById('activeLoansCount').textContent = outstanding.total_outstanding_loans || 0;
                document.getElementById('outstandingAmount').textContent = 
                    `MWK ${Number(outstanding.total_outstanding_amount || 0).toLocaleString()}`;
            } catch (e) {
                // ignore if outstanding endpoint fails
            }

        } catch (error) {
            document.getElementById('loansTableBody').innerHTML = `
                <tr><td colspan="8" style="color: red;">Error loading loans: ${error.message}</td></tr>
            `;
        }
    }

    // Apply for Loan
    applyLoanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        applyFormMessage.textContent = '';

        const loanData = {
            member_id: document.getElementById('loan_member_id').value,
            amount: document.getElementById('loan_amount').value,
            interest_rate: document.getElementById('loan_interest').value,
            due_date: document.getElementById('loan_due_date').value
        };

        try {
            await apiRequest('/loans/apply', 'POST', loanData);
            applyFormMessage.style.color = 'green';
            applyFormMessage.textContent = 'Loan application submitted successfully!';

            setTimeout(() => {
                applyModal.style.display = 'none';
                loadLoans();
            }, 1000);
        } catch (error) {
            applyFormMessage.style.color = 'red';
            applyFormMessage.textContent = error.message || 'Failed to apply for loan';
        }
    });

    // Approve Loan
    window.approveLoan = async function(id) {
        if (!confirm('Approve this loan?')) return;
        try {
            await apiRequest(`/loans/${id}/status`, 'PUT', { status: 'approved' });
            alert('Loan approved successfully');
            loadLoans();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // Reject Loan
    window.rejectLoan = async function(id) {
        if (!confirm('Reject this loan?')) return;
        try {
            await apiRequest(`/loans/${id}/status`, 'PUT', { status: 'rejected' });
            alert('Loan rejected successfully');
            loadLoans();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // Open Repay Modal
    window.openRepayModal = function(loanId) {
        document.getElementById('repay_loan_id').value = loanId;
        document.getElementById('repay_date').value = new Date().toISOString().split('T')[0];
        repayFormMessage.textContent = '';
        repayForm.reset();
        document.getElementById('repay_loan_id').value = loanId;
        repayModal.style.display = 'block';
    };

    // Record Repayment
    repayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        repayFormMessage.textContent = '';

        const repayData = {
            loan_id: document.getElementById('repay_loan_id').value,
            amount: document.getElementById('repay_amount').value,
            date: document.getElementById('repay_date').value
        };

        try {
            const result = await apiRequest('/loans/repay', 'POST', repayData);
            repayFormMessage.style.color = 'green';
            repayFormMessage.textContent = `Repayment recorded! Remaining: MWK ${Number(result.remaining || 0).toLocaleString()}`;

            setTimeout(() => {
                repayModal.style.display = 'none';
                loadLoans();
            }, 1200);
        } catch (error) {
            repayFormMessage.style.color = 'red';
            repayFormMessage.textContent = error.message || 'Failed to record repayment';
        }
    });

    // View Statement
    window.viewStatement = async function(id) {
        try {
            const statement = await apiRequest(`/loans/${id}/statement`);
            const loan = statement.loan;
            const repayments = statement.repayments;

            let html = `
                <p><strong>Member:</strong> ${loan.full_name}</p>
                <p><strong>Membership No:</strong> ${loan.membership_number || '-'}</p>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;">
                <p><strong>Principal:</strong> MWK ${Number(loan.amount).toLocaleString()}</p>
                <p><strong>Interest (${loan.interest_rate}%):</strong> MWK ${Number(loan.interest_amount).toLocaleString()}</p>
                <p><strong>Total Due:</strong> MWK ${Number(loan.total_due).toLocaleString()}</p>
                <p><strong>Total Repaid:</strong> MWK ${Number(loan.total_repaid).toLocaleString()}</p>
                <p><strong>Outstanding Balance:</strong> 
                    <span style="color: ${loan.outstanding_balance > 0 ? '#d93025' : '#0d904f'}; font-weight: 600;">
                        MWK ${Number(loan.outstanding_balance).toLocaleString()}
                    </span>
                </p>
                <p><strong>Status:</strong> ${loan.status}</p>
                <p><strong>Due Date:</strong> ${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-'}</p>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;">
                <p><strong>Repayment History:</strong></p>
            `;

            if (repayments.length === 0) {
                html += `<p style="color: #666;">No repayments yet.</p>`;
            } else {
                html += `<ul style="padding-left: 20px;">`;
                repayments.forEach(r => {
                    html += `<li>${new Date(r.date).toLocaleDateString()} — MWK ${Number(r.amount).toLocaleString()}</li>`;
                });
                html += `</ul>`;
            }

            document.getElementById('statementContent').innerHTML = html;
            statementModal.style.display = 'block';

        } catch (error) {
            alert('Error loading statement: ' + error.message);
        }
    };

    // Print Statement
    const printStatementBtn = document.getElementById('printStatementBtn');
    if (printStatementBtn) {
        printStatementBtn.addEventListener('click', () => {
            const content = document.getElementById('statementContent').innerHTML;
            const printWindow = window.open('', '', 'width=700,height=600');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Loan Statement - Manase VSLA</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; }
                        h2 { color: #1a73e8; }
                        hr { border: none; border-top: 1px solid #ccc; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <h2>Manase VSLA - Loan Statement</h2>
                    ${content}
                    <br><br>
                    <small>Generated on ${new Date().toLocaleString()}</small>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        });
    }

    // Load data
    loadLoans();
});