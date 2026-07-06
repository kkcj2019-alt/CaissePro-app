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
        const isAdmin = state.currentUser && state.currentUser.role === 'admin';
        const agentsMenu = document.querySelector('.menu-item[data-target="agents"]');
        const paramMenu = document.querySelector('.menu-item[data-target="parametres"]');

        // Only show these menus to administrators. For non-admins we move them into a hidden container
        // so they are not visible in the DOM or via keyboard navigation, but can be restored for admins.
        const ensureAdminStorage = () => {
            let store = document.getElementById('admin-menu-storage');
            if (!store) {
                store = document.createElement('div');
                store.id = 'admin-menu-storage';
                store.style.display = 'none';
                document.body.appendChild(store);
            }
            return store;
        };

        const adminStore = ensureAdminStorage();

        if (!isAdmin) {
            if (agentsMenu && agentsMenu.parentElement) {
                adminStore.appendChild(agentsMenu);
            }
            if (paramMenu && paramMenu.parentElement) {
                adminStore.appendChild(paramMenu);
            }
        } else {
            // Restore menus for admin if they were moved to storage
            const menuList = document.querySelector('.menu-list');
            const storedAgents = adminStore.querySelector('.menu-item[data-target="agents"]');
            const storedParams = adminStore.querySelector('.menu-item[data-target="parametres"]');
            if (storedAgents && menuList) menuList.appendChild(storedAgents);
            if (storedParams && menuList) menuList.appendChild(storedParams);
            // Ensure visible
            const restoredAgents = document.querySelector('.menu-item[data-target="agents"]');
            const restoredParams = document.querySelector('.menu-item[data-target="parametres"]');
            if (restoredAgents) { restoredAgents.style.display = 'flex'; restoredAgents.removeAttribute('aria-hidden'); }
            if (restoredParams) { restoredParams.style.display = 'flex'; restoredParams.removeAttribute('aria-hidden'); }
        }

        // Refresh in-memory menu list used by navigation
        if (window.state) {
            state.menuItems = document.querySelectorAll('.menu-item');
        }

        // --- Affichage du nom ---
        const userNameSpan = document.getElementById('connected-user-name');
        if (userNameSpan) {
            userNameSpan.textContent = state.currentUser.name || state.currentUser.login;
        }
    }
}

// Listen to Firebase Auth state changes to pick up claims-based roles
if (window.FirebaseAuth && typeof window.FirebaseAuth.onAuthStateChanged === 'function') {
    window.FirebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) return;
        try {
            const idTokenResult = await user.getIdTokenResult(true);
            const role = idTokenResult.claims && idTokenResult.claims.role ? idTokenResult.claims.role : 'user';
            const uiUser = { uid: user.uid, name: user.displayName || user.email, email: user.email, role };
            // Persist minimal currentUser for compatibility with existing UI
            localStorage.setItem('currentUser', JSON.stringify(uiUser));
            window.state = window.state || {};
            state.currentUser = uiUser;
            if (typeof checkLogin === 'function') checkLogin();
        } catch (err) {
            console.error('Erreur lors de la récupération des claims:', err);
        }
    });
}

function setupLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();

            // First attempt: Firebase Authentication (email/password) if available
            if (window.FirebaseAuth && typeof window.FirebaseAuth.signIn === 'function') {
                try {
                    const cred = await window.FirebaseAuth.signIn(username, password);
                    const user = cred.user;
                    const idTokenResult = await user.getIdTokenResult(true);
                    const role = idTokenResult.claims && idTokenResult.claims.role ? idTokenResult.claims.role : 'user';
                    const uiUser = { uid: user.uid, name: user.displayName || user.email, email: user.email, role };
                    localStorage.setItem('currentUser', JSON.stringify(uiUser));
                    state.currentUser = uiUser;
                    if (typeof checkLogin === 'function') checkLogin();
                    document.getElementById('login-form').reset();
                    window.location.reload();
                    return;
                } catch (err) {
                    console.warn('Firebase Auth failed for user:', err);
                    // fallthrough to local check
                }
            }

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
