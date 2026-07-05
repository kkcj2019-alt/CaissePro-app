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

        // --- Permissions ---
        const isAdmin = state.currentUser.role === 'admin';
        const agentsMenu = document.querySelector('.menu-item[data-target="agents"]');
        const paramMenu = document.querySelector('.menu-item[data-target="parametres"]');
        
        if (agentsMenu) agentsMenu.style.display = isAdmin ? 'flex' : 'none';
        if (paramMenu) paramMenu.style.display = isAdmin ? 'flex' : 'none';
    }
}

function setupLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();

            const checkUser = () => {
                // Ensure agents exist
                if (!appData.agents || appData.agents.length === 0) {
                    appData.agents = [{ id: 1, name: 'Admin', login: 'admin', code: 'admin', role: 'admin', access: 'both', viewAllBalances: true }];
                    saveData();
                }
                return appData.agents.find(a =>
                    (a.login && a.login.toLowerCase() === username.toLowerCase()) &&
                    (a.code === password)
                );
            };

            let user = checkUser();

            // Si l'utilisateur n'est pas trouvé localement, on force une synchro avec Firebase
            // C'est très utile pour les nouveaux appareils (comme un téléphone)
            if (!user && window.FirebaseDB && window.FirebaseDB.isAvailable) {
                const btn = loginForm.querySelector('button[type="submit"]');
                const oldContent = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Synchronisation...';
                btn.disabled = true;

                try {
                    const cloudData = await window.FirebaseDB.load();
                    if (cloudData && cloudData.agents) {
                        appData.agents = cloudData.agents;
                        user = checkUser();
                    }
                } catch (err) {
                    console.error("Erreur de synchronisation à la connexion:", err);
                }

                btn.innerHTML = oldContent;
                btn.disabled = false;
            }

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
