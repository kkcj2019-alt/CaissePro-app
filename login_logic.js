// --- Login System ---
function checkLogin() {
    const currentUser = localStorage.getItem('currentUser');
    const loginModal = document.getElementById('login-modal');
    const appContainer = document.querySelector('.app-container');

    if (!currentUser) {
        // Not logged in
        if (loginModal) loginModal.style.display = 'flex';
        if (appContainer) appContainer.style.filter = 'blur(5px)';
    } else {
        // Logged in
        state.currentUser = JSON.parse(currentUser);
        if (loginModal) loginModal.style.display = 'none';
        if (appContainer) appContainer.style.filter = 'none';
    }
}

function setupLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();

            // Ensure agents exist
            if (!appData.agents || appData.agents.length === 0) {
                appData.agents = [{ id: 1, name: 'Admin', login: 'admin', code: 'admin', role: 'admin', access: 'both', viewAllBalances: true }];
                saveData();
            }

            const user = appData.agents.find(a =>
                (a.login && a.login.toLowerCase() === username.toLowerCase()) &&
                (a.code === password)
            );

            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                state.currentUser = user;
                checkLogin();
                document.getElementById('login-form').reset();
                // Initial load refresh to apply permissions if needed
                window.location.reload();
            } else {
                alert('Identifiant ou mot de passe incorrect.');
            }
        };
    }
}
