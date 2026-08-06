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
    const addModal = document.getElementById('addMeetingModal');
    const attendanceModal = document.getElementById('viewAttendanceModal');
    const addMeetingBtn = document.getElementById('addMeetingBtn');
    const closeMeetingModal = document.getElementById('closeMeetingModal');
    const closeAttendanceModal = document.getElementById('closeAttendanceModal');
    const addMeetingForm = document.getElementById('addMeetingForm');
    const formMessage = document.getElementById('meetingFormMessage');
    const attendanceList = document.getElementById('attendanceList');

    // Open Add Meeting Modal
    addMeetingBtn.addEventListener('click', async () => {
        addModal.style.display = 'block';
        formMessage.textContent = '';
        addMeetingForm.reset();
        document.getElementById('meeting_date').value = new Date().toISOString().split('T')[0];

        // Load active members for attendance
        try {
            const members = await apiRequest('/members');
            attendanceList.innerHTML = '';

            const activeMembers = members.filter(m => m.status === 'active');

            if (activeMembers.length === 0) {
                attendanceList.innerHTML = '<p>No active members found</p>';
                return;
            }

            activeMembers.forEach(member => {
                attendanceList.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                        <span>${member.full_name} (${member.membership_number})</span>
                        <select class="attendance-status" data-member-id="${member.id}" style="padding: 5px 8px; border-radius: 6px; border: 1px solid #ddd;">
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                        </select>
                    </div>
                `;
            });
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Failed to load members';
        }
    });

    // Close modals
    closeMeetingModal.addEventListener('click', () => addModal.style.display = 'none');
    closeAttendanceModal.addEventListener('click', () => attendanceModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.style.display = 'none';
        if (e.target === attendanceModal) attendanceModal.style.display = 'none';
    });

    // Load meetings
    async function loadMeetings() {
        try {
            const meetings = await apiRequest('/meetings');
            const tbody = document.getElementById('meetingsTableBody');

            if (meetings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4">No meetings found</td></tr>`;
                return;
            }

            tbody.innerHTML = meetings.map(meeting => `
                <tr>
                    <td>${meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : '-'}</td>
                    <td>${meeting.notes || '-'}</td>
                    <td>${meeting.recorded_by_name || '-'}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="viewAttendance(${meeting.id})">View Attendance</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('meetingsTableBody').innerHTML = `
                <tr><td colspan="4" style="color: red;">Error loading meetings: ${error.message}</td></tr>
            `;
        }
    }

    // Handle Add Meeting form
    addMeetingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';

        // Collect attendance
        const attendanceSelects = document.querySelectorAll('.attendance-status');
        const attendance = [];

        attendanceSelects.forEach(select => {
            attendance.push({
                member_id: select.getAttribute('data-member-id'),
                status: select.value
            });
        });

        const meetingData = {
            meeting_date: document.getElementById('meeting_date').value,
            notes: document.getElementById('meeting_notes').value,
            attendance: attendance
        };

        try {
            const result = await apiRequest('/meetings', 'POST', meetingData);
            formMessage.style.color = 'green';
            formMessage.textContent = `Meeting recorded successfully! SMS sent to ${result.sms_sent_to || 0} members.`;

            setTimeout(() => {
                addModal.style.display = 'none';
                loadMeetings();
            }, 1000);
        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = error.message || 'Failed to record meeting';
        }
    });

    // View Attendance
    window.viewAttendance = async function(meetingId) {
        try {
            const data = await apiRequest(`/meetings/${meetingId}`);
            const meeting = data.meeting;
            const attendance = data.attendance;

            let html = `
                <p><strong>Date:</strong> ${new Date(meeting.meeting_date).toLocaleDateString()}</p>
                <p><strong>Notes:</strong> ${meeting.notes || 'None'}</p>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;">
                <p><strong>Attendance:</strong></p>
            `;

            if (attendance.length === 0) {
                html += `<p style="color: #666;">No attendance records.</p>`;
            } else {
                html += `<ul style="padding-left: 20px;">`;
                attendance.forEach(a => {
                    const color = a.status === 'present' ? '#0d904f' : (a.status === 'late' ? '#f9a825' : '#d93025');
                    html += `<li><strong>${a.full_name}</strong> — <span style="color: ${color}; font-weight: 600;">${a.status}</span></li>`;
                });
                html += `</ul>`;
            }

            document.getElementById('attendanceContent').innerHTML = html;
            attendanceModal.style.display = 'block';
        } catch (error) {
            alert('Error loading attendance: ' + error.message);
        }
    };

    // Load data
    loadMeetings();
});