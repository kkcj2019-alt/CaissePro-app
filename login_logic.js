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

        // --- Permissions: Hide sensitive menus for non-admins ---
        const isAdmin = state.currentUser && state.currentUser.role === 'admin';
        const agentsMenu = document.querySelector('.menu-item[data-target="agents"]');
        const paramMenu = document.querySelector('.menu-item[data-target="parametres"]');

        if (!isAdmin) {
            // Non-admin: hide both menus completely from DOM and interaction
            if (agentsMenu) {
                agentsMenu.style.display = 'none';
                agentsMenu.setAttribute('aria-hidden', 'true');
                agentsMenu.style.pointerEvents = 'none';
            }
            if (paramMenu) {
                paramMenu.style.display = 'none';
                paramMenu.setAttribute('aria-hidden', 'true');
                paramMenu.style.pointerEvents = 'none';
            }
        } else {
            // Admin: show both menus
            if (agentsMenu) {
                agentsMenu.style.display = 'flex';
                agentsMenu.removeAttribute('aria-hidden');
                agentsMenu.style.pointerEvents = 'auto';
            }
            if (paramMenu) {
                paramMenu.style.display = 'flex';
                paramMenu.removeAttribute('aria-hidden');
                paramMenu.style.pointerEvents = 'auto';
            }
        }

        // --- Display user name ---
        const userName = state.currentUser.name || state.currentUser.login || state.currentUser.email || 'Utilisateur';
        const userNameSpan = document.getElementById('connected-user-name');
        if (userNameSpan) {
            userNameSpan.textContent = userName;
            userNameSpan.style.display = 'inline';
            userNameSpan.style.visibility = 'visible';
            userNameSpan.style.opacity = '1';
        }
        const sidebarUserNameSpan = document.getElementById('sidebar-connected-user-name');
        if (sidebarUserNameSpan) {
            sidebarUserNameSpan.textContent = userName;
            sidebarUserNameSpan.style.display = 'inline';
            sidebarUserNameSpan.style.visibility = 'visible';
            sidebarUserNameSpan.style.opacity = '1';
        }
        
        // Apply caisse access restrictions for non-admins
        if (!isAdmin && state.currentUser.access) {
            const caisseSelect = document.getElementById('global-caisse-select');
            if (caisseSelect) {
                // Restrict specific caisses based on user.access
                const opts = caisseSelect.options;
                for (let i = 0; i < opts.length; i++) {
                    const opt = opts[i];
                    const val = opt.value;
                    if (val === 'general' && state.currentUser.access === 'secondary') {
                        opt.disabled = true;
                        opt.style.display = 'none';
                    } else if (val === 'secondary' && state.currentUser.access === 'general') {
                        opt.disabled = true;
                        opt.style.display = 'none';
                    }
                }
                // Set the user's accessible caisse
                if (state.currentUser.access === 'general') caisseSelect.value = 'general';
                else if (state.currentUser.access === 'secondary') caisseSelect.value = 'secondary';
            }
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
            setTimeout(() => { if (typeof checkLogin === 'function') checkLogin(); }, 100);
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
