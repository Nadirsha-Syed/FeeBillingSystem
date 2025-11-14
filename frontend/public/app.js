// Define API_URL globally
const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Attempt automatic redirection if a token exists
    // We are COMMENTING OUT the initial checkAuthAndRedirect() call
    // checkAuthAndRedirect(); // <--- REMOVE OR COMMENT OUT THIS LINE

    // --- Authentication Form Handlers ---
    
    // Handler for Login Form Submission (using the ID from index.html)
    const loginForm = document.getElementById('login-form-data');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Handler for Registration Form Submission
    const registerForm = document.getElementById('register-form-data');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegistration(); // Calls the new registration function
        });
    }
    
    // --- UI Toggle Handlers ---
    document.getElementById('show-register-link').addEventListener('click', (e) => {
        e.preventDefault();
        toggleViews(false); // Show registration
    });

    document.getElementById('show-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        toggleViews(true); // Show login
    });

    // Handle role change to show/hide student fields
    document.getElementById('reg-role').addEventListener('change', (e) => {
        const studentFields = document.getElementById('student-fields');
        if (e.target.value === 'Student') {
            studentFields.style.display = 'block';
        } else {
            studentFields.style.display = 'none';
        }
    });

    window.logout = logout; // Make logout globally available
});

// --- UI Toggle Function ---
function toggleViews(showLogin) {
    document.getElementById('login-form-container').style.display = showLogin ? 'block' : 'none';
    document.getElementById('register-form-container').style.display = showLogin ? 'none' : 'block';
    document.getElementById('message').textContent = ''; // Clear messages on switch
}

// -------------------------------------------------------------------
// CORE LOGIC: REGISTRATION (NEW FUNCTION)
// -------------------------------------------------------------------
async function handleRegistration() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    
    const course = document.getElementById('reg-course').value;
    const year = document.getElementById('reg-year').value;

    const messageElement = document.getElementById('message');
    messageElement.textContent = 'Registering...';
    messageElement.style.color = 'blue';

    const body = { name, email, password, role };

    // Conditionally add student fields and validate
    if (role === 'Student') {
        if (!course || !year) {
            messageElement.textContent = 'Please fill in Course and Year for Student registration.';
            messageElement.style.color = 'red';
            return;
        }
        body.course = course;
        body.year = year;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            messageElement.textContent = 'Registration successful! You can now log in.';
            messageElement.style.color = 'green';
            toggleViews(true); // Switch back to login view
        } else {
            messageElement.textContent = data.msg || 'Registration failed.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Registration error:', error);
        messageElement.textContent = 'Network error during registration.';
        messageElement.style.color = 'red';
    }
}


// -------------------------------------------------------------------
// CORE LOGIC: LOGIN (UPDATED TO USE NEW INPUT IDs)
// -------------------------------------------------------------------
async function handleLogin() {
    // NOTE: Updated element IDs to match the new index.html structure
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageElement = document.getElementById('message');

    messageElement.textContent = 'Logging in...';
    messageElement.style.color = 'blue';

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

            // THIS BLOCK REMAINS ACTIVE to redirect only AFTER successful login
            if (role === 'Admin') {
                window.location.href = 'admin.html';
            } else if (role === 'Student') {
                window.location.href = 'student.html';
            }
        } else {
            messageElement.textContent = data.msg || 'Login failed. Check credentials.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageElement.textContent = 'Network error. Could not connect to server.';
        messageElement.style.color = 'red';
    }
}


// --- Helper Functions ---
function checkAuthAndRedirect() {
    // This function is now only used to check if an unauthenticated user 
    // is trying to access a dashboard directly.
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentPath = window.location.pathname;

    // If no token, and we are not on the login page, redirect to login
    if (!token && !currentPath.includes('index.html') && currentPath !== '/') {
        window.location.href = 'index.html';
        return;
    }
    
    // The redirect logic here is no longer needed at the root, 
    // but remains if you want authenticated users hitting dashboard URLs to redirect correctly.
    if (token) {
        if (role === 'Admin' && !currentPath.includes('admin.html')) {
            window.location.href = 'admin.html';
        } else if (role === 'Student' && !currentPath.includes('student.html')) {
            window.location.href = 'student.html';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}