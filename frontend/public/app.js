const API_URL = 'http://localhost:5000/api'; // Base API URL

document.addEventListener('DOMContentLoaded', () => {
    // 1. On every page load, check if the user is authenticated
    checkAuthAndRedirect();

    // 2. Attach login handler to the form/button on the index page
    const loginBtn = document.getElementById('login-btn');
    const authForm = document.getElementById('auth-form');

    if (authForm) {
        // Prevent default form submission and use our async handler
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Attach logout globally for use on dashboard pages
    window.logout = logout;
});

/**
 * Checks for token/role and handles redirects based on authentication status.
 */
function checkAuthAndRedirect() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentPath = window.location.pathname;

    // If no token, and we are not on the login page, redirect to login
    if (!token && !currentPath.includes('index.html') && currentPath !== '/') {
        window.location.href = 'index.html';
        return;
    }
    
    // If authenticated, ensure the user is on the correct dashboard
    if (token) {
        if (currentPath.includes('admin.html') && role !== 'Admin') {
            window.location.href = 'student.html';
        } else if (currentPath.includes('student.html') && role !== 'Student') {
            window.location.href = 'admin.html';
        }
    }
}

/**
 * Handles the user login process by calling the backend API.
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    messageElement.textContent = 'Logging in...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            const token = data.token;
            
            // Decode role from token payload (based on JWT structure)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const role = payload.user.role;

            // Store credentials and redirect
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);

            messageElement.textContent = 'Login successful!';

            if (role === 'Admin') {
                window.location.href = 'admin.html';
            } else if (role === 'Student') {
                window.location.href = 'student.html';
            }
        } else {
            messageElement.textContent = data.msg || 'Login failed. Check credentials.';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageElement.textContent = 'Network error. Could not connect to server.';
    }
}

/**
 * Clears local storage and redirects to the login page.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

// Make sure the login handler is globally accessible if needed
window.handleLogin = handleLogin;