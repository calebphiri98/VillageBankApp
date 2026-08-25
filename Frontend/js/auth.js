document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // If already logged in, redirect based on role
    if (localStorage.getItem('token')) {
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (existingUser.role === 'member') {
            window.location.href = 'profile.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }

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

            // Redirect based on role
            if (data.user.role === 'member') {
                window.location.href = 'profile.html';
            } else {
                window.location.href = 'dashboard.html';
            }

        } catch (error) {
            errorMessage.textContent = error.message || 'Login failed. Please try again.';
        }
    });
});