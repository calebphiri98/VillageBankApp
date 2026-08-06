document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // --- CASE 1: On the Login Page (index.html) ---
    if (loginForm) {
        // If user is ALREADY logged in, send them to dashboard
        if (localStorage.getItem('token')) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Handle Login Submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            errorMessage.textContent = '';

            try {
                const data = await apiRequest('/auth/login', 'POST', {
                    username,
                    password
                }, false);

                // Save token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to dashboard
                window.location.href = 'dashboard.html';

            } catch (error) {
                errorMessage.textContent = error.message || 'Login failed. Please try again.';
            }
        });
    } 
    // --- CASE 2: On Internal Protected Pages (fines.html, members.html, etc.) ---
    else {
        // If NOT logged in, force user to login page
        if (!localStorage.getItem('token')) {
            window.location.href = 'index.html';
            return;
        }

        // Setup Logout button functionality across pages
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
    }
});