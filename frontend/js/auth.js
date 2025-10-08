import {
    setCurrentUserId,
    setCurrentUsername,
    displayedYear,
    currentUserId,
    currentUsername, // NEW: Import currentUsername
    showToast,
    toggleLoading,
    displayInlineError,
    clearInlineError,
    API_BASE_URL
} from './utils.js';
import {
    renderCalendars
} from './calendarRenderer.js';
import { fetchAndRenderEvents } from './eventManager.js';

export function setupAuthListeners() {
    const authSection = document.getElementById("authSection");
    const appContent = document.getElementById("appContent");
    const loginFormContainer = document.getElementById("loginFormContainer");
    const signupFormContainer = document.getElementById("signupFormContainer");
    const showSignupLink = document.getElementById("showSignup");
    const showLoginLink = document.getElementById("showLogin");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const continueAsGuestLink = document.getElementById("continueAsGuest");
    const continueAsGuestSignupLink = document.getElementById("continueAsGuestSignup");
    const loggedInUsernameSpan = document.getElementById("loggedInUsername"); // NEW: Get username span

    // Input fields for validation
    const loginUsernameInput = document.getElementById("loginUsername");
    const loginPasswordInput = document.getElementById("loginPassword");
    const signupUsernameInput = document.getElementById("signupUsername");
    const signupPasswordInput = document.getElementById("signupPassword");


    // Initially show app content and hide auth section, as a guest
    appContent.classList.remove("hidden");
    authSection.classList.add("hidden");
    loginFormContainer.classList.remove("hidden"); // Ensure login form is default when auth section is shown
    signupFormContainer.classList.add("hidden");

    // Set initial state for guest user and update UI
    setCurrentUserId(null);
    setCurrentUsername(null);
    logoutBtn.textContent = "Login";
    loggedInUsernameSpan.classList.add("hidden"); // Hide username span initially

    showSignupLink.addEventListener("click", () => {
        loginFormContainer.classList.add("hidden");
        signupFormContainer.classList.remove("hidden");
        clearInlineError(loginUsernameInput); // Clear errors when switching forms
        clearInlineError(loginPasswordInput);
        clearInlineError(signupUsernameInput);
        clearInlineError(signupPasswordInput);
        // Clear input fields when switching forms
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        signupUsernameInput.value = '';
        signupPasswordInput.value = '';
    });

    showLoginLink.addEventListener("click", () => {
        signupFormContainer.classList.add("hidden");
        loginFormContainer.classList.remove("hidden");
        clearInlineError(loginUsernameInput); // Clear errors when switching forms
        clearInlineError(loginPasswordInput);
        clearInlineError(signupUsernameInput);
        clearInlineError(signupPasswordInput);
        // Clear input fields when switching forms
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        signupUsernameInput.value = '';
        signupPasswordInput.value = '';
    });

    loginBtn.addEventListener("click", async () => {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        clearInlineError(loginUsernameInput);
        clearInlineError(loginPasswordInput);

        if (!username) {
            displayInlineError(loginUsernameInput, 'Username is required.');
            return;
        }
        if (!password) {
            displayInlineError(loginPasswordInput, 'Password is required.');
            return;
        }

        toggleLoading(loginBtn, true, 'Login');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                setCurrentUserId(data.userId);
                setCurrentUsername(data.username);

                await fetchAndRenderEvents(displayedYear);

                authSection.classList.add("hidden");
                appContent.classList.remove("hidden");
                logoutBtn.textContent = "Logout";
                loggedInUsernameSpan.textContent = `Hello, ${currentUsername}!`; // NEW: Display username
                loggedInUsernameSpan.classList.remove("hidden"); // NEW: Show username span
                renderCalendars(displayedYear);
                showToast('Logged in successfully!', 'success');
            } else {
                showToast(data.message || 'Login failed.', 'error');
                displayInlineError(loginPasswordInput, data.message || 'Invalid credentials.');
            }
        } catch (error) {
            console.error("Login error:", error);
            showToast('An error occurred during login. Check backend server connection.', 'error');
        } finally {
            toggleLoading(loginBtn, false);
        }
    });

    logoutBtn.addEventListener("click", () => {
        if (currentUserId !== null) { // User is logged in, perform logout
            setCurrentUserId(null);
            setCurrentUsername(null);
            appContent.classList.add("hidden");
            authSection.classList.remove("hidden");
            logoutBtn.textContent = "Login";
            loggedInUsernameSpan.classList.add("hidden"); // NEW: Hide username span on logout
            // Clear input fields
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            signupUsernameInput.value = '';
            signupPasswordInput.value = '';
            clearInlineError(loginUsernameInput);
            clearInlineError(loginPasswordInput);
            clearInlineError(signupUsernameInput);
            clearInlineError(signupPasswordInput);
            fetchAndRenderEvents(displayedYear);
            renderCalendars(displayedYear);
            showToast('Logged out successfully!', 'info');
        } else { // User is a guest, show login form
            appContent.classList.add("hidden");
            authSection.classList.remove("hidden");
        }
    });

    // Event listener for "Continue as Guest" links
    const handleContinueAsGuest = () => {
        setCurrentUserId(null);
        setCurrentUsername(null);
        appContent.classList.remove("hidden");
        authSection.classList.add("hidden");
        logoutBtn.textContent = "Login";
        loggedInUsernameSpan.classList.add("hidden"); // NEW: Hide username span for guest
        fetchAndRenderEvents(displayedYear);
        renderCalendars(displayedYear);
        showToast('Continuing as guest.', 'info');
    };

    if (continueAsGuestLink) {
        continueAsGuestLink.addEventListener("click", handleContinueAsGuest);
    }
    if (continueAsGuestSignupLink) {
        continueAsGuestSignupLink.addEventListener("click", handleContinueAsGuest);
    }

    // Sign up button (now makes actual API call)
    document.getElementById("signupBtn").addEventListener("click", async () => {
        const username = signupUsernameInput.value.trim();
        const password = signupPasswordInput.value.trim();

        clearInlineError(signupUsernameInput);
        clearInlineError(signupPasswordInput);

        // Client-side validation
        if (!username) {
            displayInlineError(signupUsernameInput, 'Username is required.');
            return;
        }
        if (username.length < 3) {
            displayInlineError(signupUsernameInput, 'Username must be at least 3 characters.');
            return;
        }
        if (!password) {
            displayInlineError(signupPasswordInput, 'Password is required.');
            return;
        }
        if (password.length < 6) {
            displayInlineError(signupPasswordInput, 'Password must be at least 6 characters.');
            return;
        }

        toggleLoading(signupBtn, true, 'Sign Up');

        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // If signup is successful, automatically log them in
                setCurrentUserId(data.userId);
                setCurrentUsername(data.username);

                await fetchAndRenderEvents(displayedYear);

                authSection.classList.add("hidden");
                appContent.classList.remove("hidden");
                logoutBtn.textContent = "Logout";
                loggedInUsernameSpan.textContent = `Hello, ${currentUsername}!`; // NEW: Display username
                loggedInUsernameSpan.classList.remove("hidden"); // NEW: Show username span
                renderCalendars(displayedYear);
                showToast(`User '${username}' registered and logged in!`, 'success');
            } else if (response.status === 409) { // Conflict: Username already exists
                showToast(data.message || 'Username already exists.', 'error');
                displayInlineError(signupUsernameInput, data.message || 'Username taken.');
            } else {
                showToast(data.message || 'Registration failed.', 'error');
            }
        } catch (error) {
            console.error("Signup error:", error);
            showToast('An error occurred during registration. Check backend server connection.', 'error');
        } finally {
            toggleLoading(signupBtn, false);
        }
    });
}
