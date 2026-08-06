document.addEventListener('DOMContentLoaded', () => {
  // Set default date picker to today
  const fineDateInput = document.getElementById('fineDate');
  if (fineDateInput) {
    fineDateInput.value = new Date().toISOString().split('T')[0];
  }

  // Load initial data
  loadMembersDropdown();
  loadFines();

  // Event Listeners
  document.getElementById('issueFineForm')?.addEventListener('submit', handleIssueFine);
  document.getElementById('statusFilter')?.addEventListener('change', filterFinesTable);
});

let allFines = [];

/**
 * Fetch members list to populate the select dropdown
 */
async function loadMembersDropdown() {
  const memberSelect = document.getElementById('memberSelect');
  if (!memberSelect) return;

  try {
    const response = await fetch('/api/members');
    if (!response.ok) throw new Error('Failed to fetch members');

    const members = await response.json();
    
    memberSelect.innerHTML = '<option value="">-- Select Member --</option>';
    members.forEach(member => {
      const option = document.createElement('option');
      option.value = member.id || member.member_id;
      option.textContent = `${member.first_name || member.name} ${member.last_name || ''} (${member.phone || member.member_code || ''})`;
      memberSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading members:', error);
    memberSelect.innerHTML = '<option value="">Failed to load members</option>';
  }
}

/**
 * Fetch all fines from backend API and render them
 */
async function loadFines() {
  const tableBody = document.getElementById('finesTableBody');
  if (!tableBody) return;

  try {
    const response = await fetch('/api/fines');
    if (!response.ok) throw new Error('Failed to fetch fines');

    allFines = await response.json();
    renderFines(allFines);
    updateMetrics(allFines);
  } catch (error) {
    console.error('Error loading fines:', error);
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load fines. Please try again.</td></tr>';
  }
}

/**
 * Render fine records into the table
 */
function renderFines(finesList) {
  const tableBody = document.getElementById('finesTableBody');
  if (!tableBody) return;

  if (finesList.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No fine records found.</td></tr>';
    return;
  }

  tableBody.innerHTML = finesList.map(fine => {
    const statusClass = fine.status?.toLowerCase() === 'paid' ? 'badge-success' : 'badge-warning';
    const isPaid = fine.status?.toLowerCase() === 'paid';
    const fineId = fine.id || fine.fine_id;
    const memberName = fine.member_name || `${fine.first_name || ''} ${fine.last_name || ''}`.trim() || 'Unknown';
    const formattedDate = fine.date_issued ? new Date(fine.date_issued).toLocaleDateString() : 'N/A';

    return `
      <tr>
        <td>${formattedDate}</td>
        <td><strong>${memberName}</strong></td>
        <td>${fine.reason || 'N/A'}</td>
        <td>${Number(fine.amount).toLocaleString()}</td>
        <td><span class="badge ${statusClass}">${fine.status || 'Unpaid'}</span></td>
        <td>
          ${!isPaid ? `<button class="btn btn-sm btn-success" onclick="payFine('${fineId}')">Mark as Paid</button>` : '<span class="text-muted">Cleared</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Calculate and display total count, unpaid balance, and paid total
 */
function updateMetrics(fines) {
  const totalCountEl = document.getElementById('totalFinesCount');
  const unpaidEl = document.getElementById('unpaidFinesAmount');
  const paidEl = document.getElementById('paidFinesAmount');

  let unpaidTotal = 0;
  let paidTotal = 0;

  fines.forEach(fine => {
    const amt = Number(fine.amount) || 0;
    if (fine.status?.toLowerCase() === 'paid') {
      paidTotal += amt;
    } else {
      unpaidTotal += amt;
    }
  });

  if (totalCountEl) totalCountEl.textContent = fines.length;
  if (unpaidEl) unpaidEl.textContent = `MWK ${unpaidTotal.toLocaleString()}`;
  if (paidEl) paidEl.textContent = `MWK ${paidTotal.toLocaleString()}`;
}

/**
 * Filter table by status dropdown (All / Paid / Unpaid)
 */
function filterFinesTable() {
  const filterValue = document.getElementById('statusFilter').value.toLowerCase();
  
  if (filterValue === 'all') {
    renderFines(allFines);
  } else {
    const filtered = allFines.filter(f => (f.status || 'unpaid').toLowerCase() === filterValue);
    renderFines(filtered);
  }
}

/**
 * Submit form to issue a new fine
 */
async function handleIssueFine(e) {
  e.preventDefault();

  const memberId = document.getElementById('memberSelect').value;
  const reason = document.getElementById('fineReason').value;
  const amount = document.getElementById('fineAmount').value;
  const dateIssued = document.getElementById('fineDate').value;

  if (!memberId || !reason || !amount || !dateIssued) {
    alert('Please fill in all required fields.');
    return;
  }

  const payload = {
    member_id: memberId,
    reason: reason,
    amount: parseFloat(amount),
    date_issued: dateIssued
  };

  try {
    const response = await fetch('/api/fines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Failed to issue fine');
    }

    alert('Fine issued successfully!');
    document.getElementById('issueFineForm').reset();
    document.getElementById('fineDate').value = new Date().toISOString().split('T')[0];
    loadFines(); // Refresh list
  } catch (error) {
    console.error('Error issuing fine:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Mark a fine as paid
 */
async function payFine(fineId) {
  if (!confirm('Are you sure you want to mark this fine as PAID?')) return;

  try {
    const response = await fetch(`/api/fines/${fineId}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Failed to update fine status');
    }

    alert('Fine marked as paid!');
    loadFines(); // Refresh list
  } catch (error) {
    console.error('Error updating fine status:', error);
    alert(`Error: ${error.message}`);
  }
}