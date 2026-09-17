function applyRoleMenu() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = (user.role || '').toLowerCase();

    // Ordinary members stay on profile only
    if (role === 'member') {
        if (!window.location.pathname.includes('profile.html')) {
            window.location.href = 'profile.html';
        }
        return;
    }

    // Menu permissions by role
    const permissions = {
        admin: [
            'dashboard.html',
            'members.html',
            'join-requests.html',
            'savings.html',
            'loans.html',
            'welfare.html',
            'fines.html',
            'meetings.html',
            'shareout.html',
            'profile.html'
        ],
        chairperson: [
            'dashboard.html',
            'members.html',
            'join-requests.html',
            'savings.html',
            'loans.html',
            'meetings.html',
            'shareout.html',
            'profile.html'
        ],
        treasurer: [
            'dashboard.html',
            'savings.html',
            'loans.html',
            'welfare.html',
            'fines.html',
            'shareout.html',
            'profile.html'
        ],
        // Secretary: record savings, loans, repayments, fines, welfare, meetings
        // + view members, dashboard summary, audit/activity, own profile
        secretary: [
            'dashboard.html',
            'members.html',
            'savings.html',
            'loans.html',
            'welfare.html',
            'fines.html',
            'meetings.html',
            'profile.html'
        ]
    };

    const allowed = permissions[role] || permissions.admin;

    // Hide sidebar links this role cannot access
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.includes('logout')) return;

        const page = href.split('/').pop();
        if (!allowed.includes(page)) {
            const li = link.closest('li');
            if (li) li.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', applyRoleMenu);