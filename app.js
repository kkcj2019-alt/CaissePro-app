document.addEventListener('DOMContentLoaded', () => {
    // --- state Management ---
    const state = {
        currentView: 'accueil',
        menuItems: document.querySelectorAll('.menu-item'),
        views: document.querySelectorAll('.view'),
        pageTitle: document.getElementById('page-title'),
        editTransactionId: null
    };
    window.state = state; // Make state global for inline HTMl handlers

    // ============================================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================================
    function showNotification(message, type = 'success') {
        // Crée ou récupère le conteneur toast
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed; bottom: 24px; right: 24px; z-index: 99999;
                display: flex; flex-direction: column; gap: 8px; pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: white; border-left: 5px solid ${colors[type] || colors.success};
            border-radius: 8px; padding: 14px 20px; min-width: 260px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 0.9rem; font-weight: 700;
            color: #1e293b; display: flex; align-items: center; gap: 10px;
            animation: slideInRight 0.3s ease; pointer-events: auto; cursor: pointer;
        `;
        toast.innerHTML = `<span style="font-size:1.2rem">${icons[type] || icons.success}</span>${message}`;
        container.appendChild(toast);
        toast.onclick = () => toast.remove();
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
            @keyframes fadeOut { to { opacity: 0; transform: translateY(-10px); } }
        `;
        if (!document.getElementById('toast-style')) { style.id = 'toast-style'; document.head.appendChild(style); }
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
    window.showNotification = showNotification;

    // --- Printing Utilities ---
    function setPrintDates(mode) {
        const startInput = document.getElementById('print-start-date');
        const endInput = document.getElementById('print-end-date');
        if (!startInput || !endInput) return;

        const now = new Date();
        if (mode === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startInput.value = firstDay.toISOString().split('T')[0];
            endInput.value = now.toISOString().split('T')[0];
        } else if (mode === 'last-month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
            startInput.value = firstDay.toISOString().split('T')[0];
            endInput.value = lastDay.toISOString().split('T')[0];
        } else if (mode === 'all') {
            startInput.value = '';
            endInput.value = '';
        }
    }
    window.setPrintDates = setPrintDates;
    let magicTransactions = [];
    // --- state & Storage ---
    const DB_KEY = 'gestCaisseData';

    let appData = {
        transactions: [],
        partners: [],
        categories: ['Vente', 'Achat', 'Transport', 'Salaire', 'Divers'],
        templates: [],
        codes: [],
        agents: [],
        employees: [],
        loans: [],
        importHistory: [],
        company: {
            name: '',
            sigle: '',
            type: '',
            address: '',
            contact: ''
        }
    };
    window.appData = appData; // Make appData global
    // --- Initialization ---
    function init() {
        console.log('Initializing application...');

        // 1. Auth & Data loading first
        try { checkLogin(); } catch (e) { console.error('checkLogin fail:', e); }
        try { loadInitialData(); } catch (e) { console.error('loadInitialData fail:', e); }
        try { setupCaisseSelector(); } catch (e) { console.error('setupCaisseSelector fail:', e); }

        // 2. Core Listeners
        try {
            setupNavigation();
            const btnlogout = document.getElementById('btn-logout');
            if (btnlogout) {
                btnlogout.onclick = () => {
                    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                        localStorage.removeItem('currentUser');
                        window.location.reload();
                    }
                };
            }
        } catch (e) { console.error('Core listeners fail:', e); }

        // 3. UI Subsystems
        const safeSetup = (fn, name) => {
            try { fn(); } catch (e) { console.error(`Setup ${name} failed:`, e); }
        };

        safeSetup(setupForms, 'Forms');
        safeSetup(setupTransferForm, 'TransferForm');
        safeSetup(setupSmartSaisie, 'SmartSaisie');
        safeSetup(setupPaymentLogic, 'PaymentLogic');
        safeSetup(setupEmployeeSearch, 'EmployeeSearch');
        safeSetup(setupMultiBeneficiary, 'MultiBeneficiary');
        safeSetup(setupSaisieModes, 'SaisieModes');
        safeSetup(setupV4Toggles, 'V4Toggles');
        safeSetup(setupRHCalculators, 'RHCalculators');
        safeSetup(setupCompanyProfile, 'CompanyProfile');
        safeSetup(setupParamListeners, 'ParamListeners');
        safeSetup(setupHistoryListeners, 'HistoryListeners');
        safeSetup(setupModelAutomation, 'ModelAutomation');
        safeSetup(setupImportFilter, 'ImportFilter');
        safeSetup(renderPinnedModels, 'PinnedModels');
        safeSetup(setupRapports, 'Rapports');
        safeSetup(setupMagicImport, 'MagicImport');
        safeSetup(updateDashboard, 'Dashboard');
        safeSetup(updateDate, 'Date');
        safeSetup(setupLogin, 'Login');
        safeSetup(renderImportHistory, 'ImportHistory');
        safeSetup(setupInputRecognition, 'InputRecognition');
        safeSetup(setupQuickEntry, 'QuickEntry');
        safeSetup(setupAcomptesPretsLogic, 'AcomptesPretsLogic');
        safeSetup(setupGeneralPrintListeners, 'GeneralPrintListeners');



        // 5. Restore User Context (Persistence)
        try {
            const fiscalYearSelect = document.getElementById('fiscal-year-select');
            if (fiscalYearSelect) {
                const savedYear = localStorage.getItem('selectedFiscalYear');
                if (savedYear) fiscalYearSelect.value = savedYear;
                fiscalYearSelect.addEventListener('change', (e) => {
                    localStorage.setItem('selectedFiscalYear', e.target.value);
                    updateDashboard();
                    renderSaisieHistory();
                    renderImportHistory();
                });
            }

            const dashboardMonthSelect = document.getElementById('dashboard-month-select');
            if (dashboardMonthSelect) {
                const savedMonth = localStorage.getItem('selectedDashboardMonth');
                dashboardMonthSelect.value = savedMonth || new Date().getMonth();
                dashboardMonthSelect.addEventListener('change', (e) => {
                    localStorage.setItem('selectedDashboardMonth', e.target.value);
                    updateDashboard();
                });
            }

            const savedView = localStorage.getItem('currentView');
            if (savedView && savedView !== 'accueil') {
                switchView(savedView);
                const menuItem = document.querySelector(`[data-target="${savedView}"]`);
                if (menuItem) updateActiveMenu(menuItem);
            }
        } catch (e) { console.error('Context restoration fail:', e); }

        // 6. Final cleanup
        try {
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.valueAsDate = new Date();
        } catch (e) { }

        console.log('Application CaissePro initialisée.');
        document.documentElement.classList.remove('fouc-loading');
    }
    function loadInitialData() {
        try {
            const stored = localStorage.getItem(DB_KEY);
            if (stored) {
                appData = JSON.parse(stored);
                window.appData = appData;
            } else {
                saveData();
            }
            // Ensure all critical arrays exist to prevent map/forEach crashes
            appData.transactions = appData.transactions || [];
            appData.partners = appData.partners || [];
            appData.codes = appData.codes || [];
            appData.templates = appData.templates || [];
            appData.agents = appData.agents || [];
            appData.employees = appData.employees || [];
            appData.loans = appData.loans || [];
            appData.importHistory = appData.importHistory || [];
            // --- AUTO-CREATE system codes if missing ---
            if (!appData.codes.find(c => c.short === 'AC')) {
                appData.codes.push({ id: 'sys-ac', name: 'ACOMPTE', short: 'AC', type: 'expense' });
            }
            if (!appData.codes.find(c => c.short === 'PR')) {
                appData.codes.push({ id: 'sys-pr', name: 'PRÊT', short: 'PR', type: 'expense' });
            }
        } catch (e) {
            console.error('Error loading data:', e);
            appData = {
                transactions: [],
                partners: [],
                codes: [{ id: 'sys-ac', name: 'ACOMPTE', short: 'AC', type: 'expense' }, { id: 'sys-pr', name: 'PRÊT', short: 'PR', type: 'expense' }],
                templates: [],
                agents: [],
                employees: [],
                loans: [],
                importHistory: []
            };
        }
        populateSelects();

        // ---- Synchronisation Firebase (async, non-bloquante) ----
        if (window.FirebaseDB && window.FirebaseDB.isAvailable) {
            window.FirebaseDB.showStatus('syncing');
            window.FirebaseDB.load().then((cloudData) => {
                if (cloudData && cloudData.transactions) {
                    // Fusionner: Firestore est la source de vérité si elle contient des données
                    const cloudTxCount = (cloudData.transactions || []).length;
                    const localTxCount = (appData.transactions || []).length;

                    // Utiliser Firestore si plus récente ou plus complète
                    if (cloudTxCount >= localTxCount) {
                        Object.assign(appData, cloudData);
                        appData.transactions = appData.transactions || [];
                        appData.partners = appData.partners || [];
                        appData.codes = appData.codes || [];
                        appData.templates = appData.templates || [];
                        appData.agents = appData.agents || [];
                        appData.employees = appData.employees || [];
                        appData.loans = appData.loans || [];
                        appData.importHistory = appData.importHistory || [];
                        if (!appData.codes.find(c => c.short === 'AC'))
                            appData.codes.push({ id: 'sys-ac', name: 'ACOMPTE', short: 'AC', type: 'expense' });
                        if (!appData.codes.find(c => c.short === 'PR'))
                            appData.codes.push({ id: 'sys-pr', name: 'PRÊT', short: 'PR', type: 'expense' });
                        window.appData = appData;
                        localStorage.setItem(DB_KEY, JSON.stringify(appData));
                        populateSelects();
                        updateDashboard();
                        try { renderPartners(); } catch(e) {}
                        try { renderAgents(); } catch(e) {}
                        try { renderSaisieHistory(); } catch(e) {}
                        console.log('[Firebase] ✅ Données cloud appliquées (' + cloudTxCount + ' transactions).');
                    } else {
                        // Pousser les données locales vers Firestore
                        window.FirebaseDB.save(appData);
                        console.log('[Firebase] ↑ Données locales poussées vers Firestore.');
                    }
                    window.FirebaseDB.showStatus('synced');
                } else {
                    // Aucune donnée dans Firestore: initialiser avec les données locales
                    window.FirebaseDB.save(appData);
                    window.FirebaseDB.showStatus('synced');
                    console.log('[Firebase] ↑ Première synchronisation: données locales envoyées.');
                }

                // Activer l'écoute en temps réel après le chargement initial
                if (!window._firestoreListenerActive) {
                    window._firestoreListenerActive = true;
                    window._firestoreLastSaveTime = 0; // éviter les boucles de sync
                    window.FirebaseDB.listen((cloudData) => {
                        // Ignorer les mises à jour déclenchées par notre propre sauvegarde (fenêtre de 3s)
                        if (Date.now() - window._firestoreLastSaveTime < 3000) return;
                        console.log('[Firebase] 🔄 Mise à jour distante reçue.');
                        Object.assign(appData, cloudData);
                        window.appData = appData;
                        localStorage.setItem(DB_KEY, JSON.stringify(appData));
                        populateSelects();
                        updateDashboard();
                        try { renderPartners(); } catch(e) {}
                        try { renderAgents(); } catch(e) {}
                        try { renderSaisieHistory(); } catch(e) {}
                        window.FirebaseDB.showStatus('synced');
                    });
                }
            }).catch((err) => {
                console.warn('[Firebase] Mode hors-ligne:', err);
                window.FirebaseDB.showStatus('offline');
            });
        }
    }
    function saveData() {
        localStorage.setItem(DB_KEY, JSON.stringify(appData));
        updateDashboard();

        // ---- Sauvegarde asynchrone dans Firestore ----
        if (window.FirebaseDB && window.FirebaseDB.isAvailable) {
            window._firestoreLastSaveTime = Date.now();
            window.FirebaseDB.showStatus('syncing');
            window.FirebaseDB.save(appData).then((ok) => {
                window.FirebaseDB.showStatus(ok ? 'synced' : 'error');
            });
        }
    }
    // --- DOM Population ---
    function populateSelects() {
        // Partners Datalist
        const partnerslist = document.getElementById('partners-list');
        if (partnerslist) {
            partnerslist.innerHTML = '';
            appData.partners.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                partnerslist.appendChild(opt);
            });
        }
        // Codes Datalist (Shared for Saisie and Model Forms)
        const codeslist = document.getElementById('codes-datalist');
        if (codeslist) {
            codeslist.innerHTML = '';
            if (appData.codes) {
                appData.codes.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.short;
                    opt.textContent = c.name;
                    codeslist.appendChild(opt);
                });
            }
        }
        // loan employees list & Agent Remettant list
        const loanEmplist = document.getElementById('loan-employees-list');
        const stafflist = document.getElementById('staff-list');
        const employeeslist = document.getElementById('employees-list'); // BUG FIX

        if (loanEmplist || stafflist || employeeslist) {
            const employees = appData.employees || [];
            if (loanEmplist) loanEmplist.innerHTML = '';
            if (stafflist) stafflist.innerHTML = '';
            if (employeeslist) employeeslist.innerHTML = '';

            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.name;
                if (loanEmplist) loanEmplist.appendChild(opt.cloneNode(true));
                if (stafflist) stafflist.appendChild(opt.cloneNode(true));
                if (employeeslist) employeeslist.appendChild(opt);
            });
        }
        // Templates Select
        const templateSelect = document.getElementById('template-select');
        if (templateSelect) {
            templateSelect.innerHTML = '<option value="">-- Choisir un modèle --</option>';
            if (appData.templates) {
                appData.templates.forEach((t, index) => {
                    const opt = document.createElement('option');
                    opt.value = index;
                    opt.textContent = t.name;
                    templateSelect.appendChild(opt);
                });
            }
            // Consolidating all template selection logic to setupForms
        }
    }
    // --- Event listeners ---
    function setupForms() {
        const txForm = document.getElementById('transaction-form');
        if (txForm) {
            txForm.onsubmit = handleTransactionSubmit;

            // Support touche Entrée pour valider
            txForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    // Si on est dans un champ qui gère déjà Tab/Enter (ex: abréviations), 
                    // on laisse l'événement se propager ou on gère ici.
                    // Pour l'instant, Enter simple soumet le formulaire.
                }
            });
        }
        // Global Caisse Switch handled in setupCaisseSelector
        // const globalCaisse = document.getElementById('global-caisse-select');
        // if (globalCaisse) {
        //     globalCaisse.onchange = () => updateDashboard();
        // }
        // Default Date
        const dateInput = document.getElementById('date');
        if (dateInput && !dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
        // Payment Mode Visibility
        const payMode = document.getElementById('payment-mode');
        const payrefGroup = document.getElementById('payment-ref').parentElement;
        if (payMode && payrefGroup) {
            const toggleref = () => {
                payrefGroup.style.display = payMode.value === 'cash' ? 'none' : 'block';
            };
            payMode.onchange = toggleref;
            toggleref(); // Init
        }

        // --- DYNAMIC VISIBILITY LOGIC ---
        const updateVisibility = (config) => {
            const short = (config.short || config.code || '').toUpperCase().trim();
            const category = (config.category || '').toUpperCase().trim();
            const name = (config.name || '').toUpperCase().trim();

            const isLoan = short === 'PR' || category.includes('PRÊT') || name.includes('PRÊT') || (config.mode === 'pret');
            const isAcompte = short === 'AC' || category.includes('ACOMPTE') || name.includes('ACOMPTE') || (config.mode === 'acompte');
            const isRH = isLoan || isAcompte;

            // Mode "Libre" if not RH and no explicit beneficiary config
            const isLibre = !isRH && !config.showBeneficiary && config.showBeneficiary !== false && (short === 'LIBRE' || !short);

            // 1. Hide/Show RH Groups (loan-only, acompte-only)
            document.querySelectorAll('.loan-only').forEach(el => el.style.display = isLoan ? 'block' : 'none');
            document.querySelectorAll('.acompte-only').forEach(el => el.style.display = isAcompte ? 'block' : 'none');

            // 2. Specific main groups
            const remettantGrp = document.getElementById('remettant-group');
            const executorGrp = document.getElementById('executor-group');
            const partnerGrp = document.getElementById('partner-group');
            const chargeGrp = document.getElementById('amount-charge-group');

            if (isLibre) {
                if (remettantGrp) remettantGrp.style.display = 'block';
                if (executorGrp) executorGrp.style.display = 'block';
                if (partnerGrp) partnerGrp.style.display = 'block';
                if (chargeGrp) chargeGrp.style.display = 'block';
            } else {
                if (remettantGrp) remettantGrp.style.display = config.showRemettant !== false ? 'block' : 'none';
                if (executorGrp) executorGrp.style.display = config.showExecutor !== false ? 'block' : 'none';
                if (chargeGrp) chargeGrp.style.display = config.showCharge === true ? 'block' : 'none';
                if (partnerGrp) partnerGrp.style.display = config.showBeneficiary !== false ? 'block' : 'none';
            }

            // 3. Labels and Buttons Sync
            const partnerLabel = document.getElementById('partner-label');
            if (partnerLabel) {
                partnerLabel.textContent = isRH ? 'BÉNÉFICIAIRE (Personnel)' : 'BÉNÉFICIAIRE (Tiers)';
            }

            const modeToActivate = config.mode || (isAcompte ? 'acompte' : (isLoan ? 'pret' : (config.showBeneficiary !== false ? 'tiers' : 'libre')));
            document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
                if (b.dataset.mode === modeToActivate) b.classList.add('active');
                else b.classList.remove('active');
            });

            // 4. Beneficiary Input Type (Tiers vs Employee)
            const singlePartner = document.getElementById('partner');
            const singleEmployee = document.getElementById('employee-beneficiary');
            const singleWrap = document.getElementById('single-beneficiary-wrap');

            if (singlePartner && singleEmployee) {
                const beneficiaryType = config.beneficiaryType || (isRH ? 'employee' : 'tiers');

                // Forcer retour en saisie unique lors du changement de mode/code
                const multiContainer = document.getElementById('multi-beneficiary-container');
                if (multiContainer) multiContainer.style.display = 'none';
                if (singleWrap) singleWrap.style.display = 'flex';

                if (isLibre || beneficiaryType === 'mixed') {
                    singlePartner.style.display = 'block';
                    singleEmployee.style.display = 'block';
                } else if (beneficiaryType === 'employee') {
                    singlePartner.style.display = 'none';
                    singleEmployee.style.display = 'block';
                    singlePartner.removeAttribute('required');
                    singleEmployee.setAttribute('required', 'true');
                } else {
                    singlePartner.style.display = 'block';
                    singleEmployee.style.display = 'none';
                    singlePartner.setAttribute('required', 'true');
                    singleEmployee.removeAttribute('required');
                }
            }

            // 5. Multi-beneficiary button visibility
            const toggleBtn = document.getElementById('toggle-multi-beneficiary');
            if (toggleBtn) {
                toggleBtn.style.display = isRH ? 'block' : 'none';
                toggleBtn.innerHTML = '<i class="fa-solid fa-users"></i> SAISIE MULTIPLE';
                toggleBtn.style.background = '#f8fafc';
                toggleBtn.style.color = 'var(--primary-color)';
            }

            // 6. Dynamic Details/Libellé if empty or default
            const detailsInput = document.getElementById('details');
            if (detailsInput && (!detailsInput.value || detailsInput.value === "ACOMPTE SUR SALAIRE" || detailsInput.value === "PRÊT SUR SALAIRE")) {
                if (isAcompte) detailsInput.value = "ACOMPTE SUR SALAIRE";
                else if (isLoan) detailsInput.value = "PRÊT SUR SALAIRE";
                else if (!config.details) detailsInput.value = "";
            }
        };
        window.updateVisibility = updateVisibility;

        const codeInput = document.getElementById('code-input');
        if (codeInput) {
            codeInput.oninput = (e) => {
                const val = e.target.value.toUpperCase().trim();
                const codeObj = appData.codes.find(c => c.short === val);
                if (codeObj) {
                    updateVisibility(codeObj);
                    if (codeObj.type && codeObj.type !== 'mixed') {
                        const isIncome = codeObj.type === 'income';
                        const inRadio = document.getElementById('type-income');
                        const exRadio = document.getElementById('type-expense');
                        if (inRadio) inRadio.checked = isIncome;
                        if (exRadio) exRadio.checked = !isIncome;
                        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                        const targetBtn = document.getElementById(isIncome ? 'btn-type-income' : 'btn-type-expense');
                        if (targetBtn) targetBtn.classList.add('active');
                    }
                }
            };

            codeInput.onblur = (e) => {
                const val = e.target.value.toUpperCase().trim();
                if (!val || val === 'AC' || val === 'PR' || val === 'LIBRE') return;
                const exists = appData.codes.some(c => c.short === val);
                if (!exists) {
                    if (confirm(`Le code "${val}" n'existe pas. Voulez-vous le créer maintenant ?`)) {
                        const codeFormCont = document.getElementById('add-code-form-container');
                        if (codeFormCont) {
                            document.getElementById('code-name').value = '';
                            document.getElementById('code-short').value = val;
                            codeFormCont.style.display = 'block';
                        }
                    }
                }
            };
        }
        // Saisie Modes
        setupSaisieModes();
        // Transaction Form
        const trForm = document.getElementById('transaction-form');
        if (trForm) {
            trForm.onsubmit = handleTransactionSubmit;
        }
        // Tiers Forms
        const btnNewTier = document.getElementById('btn-new-tier');
        if (btnNewTier) btnNewTier.onclick = () => document.getElementById('add-tier-form-container').style.display = 'block';
        const btnCancelTier = document.getElementById('btn-cancel-tier');
        if (btnCancelTier) btnCancelTier.onclick = () => document.getElementById('add-tier-form-container').style.display = 'none';
        const tierForm = document.getElementById('tier-form');
        if (tierForm) {
            tierForm.onsubmit = (e) => {
                e.preventDefault();
                const id = document.getElementById('tier-id').value;
                const name = document.getElementById('tier-name').value;
                const type = document.getElementById('tier-type').value;
                const service = document.getElementById('tier-service').value;
                const contact = document.getElementById('tier-contact').value;
                // Initial balance fields
                const initialType = document.getElementById('tier-initial-type').value;
                const initialAmount = parseFloat(document.getElementById('tier-initial-amount').value) || 0;
                const initialLabel = document.getElementById('tier-initial-label').value;
                if (name) {
                    if (!appData.partners) appData.partners = [];
                    if (id) {
                        const index = appData.partners.findIndex(p => p.id == id);
                        if (index !== -1) {
                            appData.partners[index] = { ...appData.partners[index], name, type, service, contact };
                        }
                    } else {
                        appData.partners.push({ id: Date.now(), name, type, service, contact });
                        // Create initial balance transaction if specified
                        if (initialType && initialAmount > 0) {
                            const transactionType = initialType === 'debt' ? 'expense' : 'income';
                            const details = initialLabel || 'Solde d\'ouverture';
                            const initialTransaction = {
                                id: Date.now() + 1,
                                date: new Date().toISOString().split('T')[0],
                                type: transactionType,
                                category: initialType === 'debt' ? 'Dette Initiale' : 'Cr?ance Initiale',
                                code: '',
                                details: details,
                                amount: initialAmount,
                                partner: name,
                                executor: '',
                                paymentMode: 'other',
                                paymentref: 'Solde initial',
                                user: state.currentUser ? state.currentUser.username : 'Admin',
                                caisse: state.currentCaisse || 'general',
                                timestamp: new Date().toISOString()
                            };
                            if (!appData.transactions) appData.transactions = [];
                            appData.transactions.push(initialTransaction);
                        }
                    }
                    saveData();
                    populateSelects();
                    renderPartners();
                    e.target.reset();
                    document.getElementById('tier-id').value = '';
                    document.querySelector('#tier-form button[type="submit"]').textContent = 'Enregistrer';
                    document.getElementById('add-tier-form-container').style.display = 'none';
                    if (initialType && initialAmount > 0) {
                        alert(`Tiers cr?? avec un solde initial de ${formatCurrency(initialAmount)}`);
                    }
                } else {
                    alert('Nom requis.');
                }
            };
        }
        // Codes Forms
        const btnNewCode = document.getElementById('btn-new-code');
        if (btnNewCode) btnNewCode.onclick = () => {
            document.getElementById('add-code-form-container').style.display = 'block';
            document.getElementById('edit-code-form-container').style.display = 'none';
        };
        const btnCancelCode = document.getElementById('btn-cancel-code');
        if (btnCancelCode) btnCancelCode.onclick = () => document.getElementById('add-code-form-container').style.display = 'none';
        const codeForm = document.getElementById('code-form');
        if (codeForm) {
            codeForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('code-name').value.trim();
                const short = document.getElementById('code-short').value.trim().toUpperCase();
                const type = document.getElementById('code-default-type').value;
                const showRemettant = document.getElementById('code-show-remettant').checked;
                const showExecutor = document.getElementById('code-show-executor').checked;
                const showBeneficiary = document.getElementById('code-show-beneficiary').checked;
                const showCharge = document.getElementById('code-show-charge').checked;
                const beneficiaryType = document.getElementById('code-beneficiary-type').value;

                if (name && short) {
                    if (!appData.codes) appData.codes = [];
                    const existingIdx = appData.codes.findIndex(c => c.short === short);
                    if (existingIdx !== -1) {
                        alert('Ce code existe déjà.');
                        return;
                    }
                    appData.codes.push({
                        id: Date.now(), name, short, type,
                        showRemettant, showExecutor, showBeneficiary, showCharge,
                        beneficiaryType
                    });
                    saveData();
                    renderCodes();
                    populateSelects();
                    e.target.reset();
                    document.getElementById('add-code-form-container').style.display = 'none';
                    showNotification("Nouveau code créé avec succès", "success");
                }
            };
        }
        const editCodeForm = document.getElementById('edit-code-form');
        if (editCodeForm) {
            editCodeForm.onsubmit = (e) => {
                e.preventDefault();
                const index = parseInt(document.getElementById('edit-code-index').value);
                const name = document.getElementById('edit-code-name').value;
                const short = document.getElementById('edit-code-short').value.toUpperCase();
                const type = document.getElementById('edit-code-type').value;
                // Récupérer les flags de visibilité du formulaire d'édition (lecture ancienne config par défaut)
                const showRemettant = document.getElementById('code-show-remettant') ? document.getElementById('code-show-remettant').checked : (appData.codes[index]?.showRemettant ?? true);
                const showExecutor = document.getElementById('code-show-executor') ? document.getElementById('code-show-executor').checked : (appData.codes[index]?.showExecutor ?? true);
                const showBeneficiary = document.getElementById('code-show-beneficiary') ? document.getElementById('code-show-beneficiary').checked : (appData.codes[index]?.showBeneficiary ?? true);
                const showCharge = document.getElementById('code-show-charge') ? document.getElementById('code-show-charge').checked : (appData.codes[index]?.showCharge ?? false);
                const beneficiaryType = document.getElementById('edit-code-beneficiary-type').value;

                if (name && short) {
                    if (appData.codes.some((c, i) => i !== index && c.short.toUpperCase() === short.toUpperCase())) {
                        alert('Ce code existe déjà.');
                        return;
                    }
                    appData.codes[index] = { ...appData.codes[index], name, short, type, showRemettant, showExecutor, showBeneficiary, showCharge, beneficiaryType };
                    saveData();
                    renderCodes();
                    setupSmartSaisie();
                    populateSelects();
                    document.getElementById('edit-code-form-container').style.display = 'none';
                }
            };
        }
        // Le gestionnaire '.mode-btn' obsolète a été supprimé ici car il entrait en conflit avec setupSaisieModes().
        const btnCanceleditCode = document.getElementById('btn-cancel-edit-code');
        if (btnCanceleditCode) btnCanceleditCode.onclick = () => document.getElementById('edit-code-form-container').style.display = 'none';
        // Global Search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length > 1) {
                    // Filter transactions that match
                    const results = appData.transactions.filter(t => {
                        return (t.partner || '').toLowerCase().includes(query) ||
                            (t.category || '').toLowerCase().includes(query) ||
                            (t.details || '').toLowerCase().includes(query) ||
                            (t.amount.toString()).includes(query) ||
                            (t.id.toString()).includes(query);
                    });
                    // Show history view with filtered results?
                    // Better approach: store a temporary filter state or just renderHistory with filter
                    state.searchFilter = query;
                    switchView('historique');
                    renderHistory(query);
                } else {
                    state.searchFilter = null;
                }
            };
        }
        // Models Forms
        const btnNewModel = document.getElementById('btn-new-model');
        if (btnNewModel) btnNewModel.onclick = () => {
            document.getElementById('model-form-title').textContent = 'Nouveau Mod?le';
            document.getElementById('model-edit-index').value = '';
            document.getElementById('model-form').reset();
            document.getElementById('add-model-form-container').style.display = 'block';
        };
        const btnCancelModel = document.getElementById('btn-cancel-model');
        if (btnCancelModel) btnCancelModel.onclick = () => {
            document.getElementById('add-model-form-container').style.display = 'none';
            document.getElementById('model-form').reset();
        };
        const modelForm = document.getElementById('model-form');
        if (modelForm) {
            modelForm.onsubmit = (e) => {
                e.preventDefault();
                const editIndex = document.getElementById('model-edit-index').value;
                const name = document.getElementById('model-name').value.trim();
                const type = document.getElementById('model-type').value;
                const code = document.getElementById('model-code').value.trim().toUpperCase();
                const category = document.getElementById('model-category').value;
                const amount = parseFloat(document.getElementById('model-amount').value) || 0;
                // Check for both possible IDs
                const detailsEl = document.getElementById('model-details') || document.getElementById('model-details-input');
                const details = detailsEl ? detailsEl.value : '';

                const requireTier = document.getElementById('model-require-tier') ? document.getElementById('model-require-tier').checked : false;
                const isPinned = document.getElementById('model-is-pinned') ? document.getElementById('model-is-pinned').checked : false;
                const isSimple = document.getElementById('model-is-simple') ? document.getElementById('model-is-simple').checked : false;
                const showRemettant = document.getElementById('model-show-remettant') ? document.getElementById('model-show-remettant').checked : true;
                const showExecutor = document.getElementById('model-show-executor') ? document.getElementById('model-show-executor').checked : true;
                const showBeneficiary = document.getElementById('model-show-beneficiary') ? document.getElementById('model-show-beneficiary').checked : true;
                const showCharge = document.getElementById('model-show-charge') ? document.getElementById('model-show-charge').checked : false;

                if (name) {
                    if (!appData.templates) appData.templates = [];
                    const modelData = {
                        name, type, code, category: category || 'DIVERS', amount, details,
                        requireTier, isPinned, isSimple,
                        showRemettant, showExecutor, showBeneficiary, showCharge
                    };
                    if (editIndex !== "") {
                        appData.templates[parseInt(editIndex)] = modelData;
                    } else {
                        appData.templates.push(modelData);
                    }
                    saveData();
                    populateSelects();
                    renderModels();
                    renderPinnedModels();
                    e.target.reset();
                    document.getElementById('add-model-form-container').style.display = 'none';
                    showNotification("Modèle enregistré avec succès", "success");
                }
            };
        }
        // Amount Sync in Saisie
        const amountChargeInput = document.getElementById('amount-charge');
        const amountPaidInput = document.getElementById('amount');
        if (amountChargeInput && amountPaidInput) {
            amountChargeInput.oninput = () => {
                if (!amountPaidInput.value) amountPaidInput.value = amountChargeInput.value;
            };
        }
        // Template Selection
        const templateSelect = document.getElementById('template-select');
        if (templateSelect) {
            templateSelect.onchange = (e) => {
                const index = e.target.value;
                if (index !== "" && appData.templates[index]) {
                    const t = appData.templates[index];
                    const typeInput = document.querySelector(`input[name="type"][value="${t.type}"]`);
                    if (typeInput) typeInput.checked = true;
                    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                    const activeTypeBtn = document.getElementById(t.type === 'income' ? 'btn-type-income' : 'btn-type-expense');
                    if (activeTypeBtn) activeTypeBtn.classList.add('active');

                    const codeInp = document.getElementById('code-input');
                    if (codeInp) codeInp.value = t.code || '';
                    const catEl = document.getElementById('category');
                    if (catEl) catEl.value = t.category;
                    const detailsInp = document.getElementById('details');
                    if (detailsInp) detailsInp.value = t.details || '';
                    if (t.amount) {
                        const amtInp = document.getElementById('amount');
                        if (amtInp) amtInp.value = t.amount;
                    }

                    // Appliquer la visibilité dynamique des champs selon le modèle
                    updateVisibility(t);
                }
            };
        }
        // Agents Forms
        const btnNewAgent = document.getElementById('btn-new-agent');
        if (btnNewAgent) btnNewAgent.onclick = () => document.getElementById('add-agent-form-container').style.display = 'block';
        const btnCancelAgent = document.getElementById('btn-cancel-agent');
        if (btnCancelAgent) btnCancelAgent.onclick = () => document.getElementById('add-agent-form-container').style.display = 'none';
        const agentForm = document.getElementById('agent-form');
        if (agentForm) {
            agentForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('agent-name').value;
                const login = document.getElementById('agent-login').value;
                const code = document.getElementById('agent-code').value;
                const role = document.getElementById('agent-role').value;
                const access = document.getElementById('agent-access').value;
                const viewAllBox = document.getElementById('agent-view-all-balances');
                const viewAllBalances = viewAllBox ? viewAllBox.checked : false;

                if (name && login && code) {
                    if (!appData.agents) appData.agents = [];
                    const editIndex = document.getElementById('agent-edit-index').value;
                    const agentData = { name, login, code, role, access, viewAllBalances };

                    if (editIndex !== "") {
                        appData.agents[parseInt(editIndex)] = { ...appData.agents[parseInt(editIndex)], ...agentData };
                    } else {
                        appData.agents.push({ id: Date.now(), ...agentData });
                    }

                    saveData();
                    renderAgents();
                    e.target.reset();
                    document.getElementById('agent-edit-index').value = "";
                    document.getElementById('add-agent-form-container').style.display = 'none';
                    alert(editIndex !== "" ? 'Agent mis ? jour !' : 'Agent ajout? avec succ?s !');
                }
            };
        }
        // Dashboard Caisse Selector
        const dashboardCaisseSelect = document.getElementById('dashboard-caisse-select');
        if (dashboardCaisseSelect) {
            dashboardCaisseSelect.onchange = () => updateDashboard();
        }
        // RH Forms
        // RH Forms
        const btnNewEmp = document.getElementById('btn-new-employee');
        if (btnNewEmp) btnNewEmp.onclick = () => {
            document.getElementById('add-employee-form-container').style.display = 'block';
            document.getElementById('employee-form-title').textContent = "Nouvel Employ?";
            document.getElementById('employee-edit-index').value = "";
        };

        const btnCancelemp = document.getElementById('btn-cancel-employee');
        if (btnCancelemp) btnCancelemp.onclick = () => document.getElementById('add-employee-form-container').style.display = 'none';

        const empForm = document.getElementById('employee-form');
        if (empForm) {
            empForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('employee-name').value;
                const abbr = document.getElementById('employee-abbr').value;
                const matricule = document.getElementById('employee-matricule').value;
                const position = document.getElementById('employee-position').value;
                if (name && position) {
                    if (!appData.employees) appData.employees = [];
                    const editIndex = document.getElementById('employee-edit-index').value;
                    const empDataRecord = { name, abbr, matricule, position };

                    if (editIndex !== "") {
                        appData.employees[parseInt(editIndex)] = { ...appData.employees[parseInt(editIndex)], ...empDataRecord };
                    } else {
                        appData.employees.push({ id: Date.now(), ...empDataRecord });
                    }

                    saveData();
                    renderRHView();
                    renderAcomptesPretsView(); // Update both
                    e.target.reset();
                    document.getElementById('employee-edit-index').value = "";
                    document.getElementById('add-employee-form-container').style.display = 'none';
                }
            };
        }

        const btnRefreshFinances = document.getElementById('btn-refresh-finances');
        if (btnRefreshFinances) btnRefreshFinances.onclick = () => renderAcomptesPretsView();

        const btnRefreshRH = document.getElementById('btn-refresh-personnel'); // Old ID if exists
        if (btnRefreshRH) btnRefreshRH.onclick = () => renderRHView();

        // Finance Tabs logic
        document.querySelectorAll('.finance-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.finance-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.color = 'var(--text-muted)';
                    t.style.boxShadow = 'none';
                    t.style.fontWeight = '700';
                });
                tab.classList.add('active');
                tab.style.background = 'white';
                tab.style.color = 'var(--secondary-color)';
                tab.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                tab.style.fontWeight = '800';
                financeFilterMode = tab.getAttribute('data-mode');
                renderAcomptesPretsView();
            };
        });

        // Global Exposures (to fix unresponsive edit buttons)
        window.switchView = switchView;
        window.editTransaction = editTransaction;
        window.deleteTransaction = deleteTransaction;
        window.openEdit = editTransaction;
        window.printSingleEmployee = printSingleEmployee;
        window.renderRHView = renderRHView;
        window.renderAcomptesPretsView = renderAcomptesPretsView;
        window.formatCurrency = formatCurrency;
        window.renderSaisieHistory = renderSaisieHistory;
        window.updateDashboard = updateDashboard;
        window.handleTransactionSubmit = handleTransactionSubmit;

        // Rewire form submit to use global handler so updates always fire
        const txFormRewire = document.getElementById('transaction-form');
        if (txFormRewire) {
            txFormRewire.onsubmit = null;
            txFormRewire.addEventListener('submit', (e) => {
                e.preventDefault();
                handleTransactionSubmit(e);
            }, true);
        }

        // Loan Date Calculation Logic
        const loanDurationInp = document.getElementById('loan-duration');
        const loanMonthlyInp = document.getElementById('loan-monthly');
        const mainAmountInp = document.getElementById('amount');

        const calculateMainLoan = () => {
            calculateMainLoanEndDate(); // Toujours appeler pour MAJ de la date de fin

            const amount = parseFloat(mainAmountInp?.value) || 0;
            const duration = parseInt(loanDurationInp?.value) || 0;
            const monthly = parseFloat(loanMonthlyInp?.value) || 0;

            if (amount <= 0) return;

            if (document.activeElement === loanDurationInp && duration > 0) {
                if (loanMonthlyInp) loanMonthlyInp.value = (amount / duration).toFixed(0);
            } else if (document.activeElement === loanMonthlyInp && monthly > 0) {
                if (loanDurationInp) loanDurationInp.value = Math.ceil(amount / monthly);
            } else if (document.activeElement === mainAmountInp) {
                if (duration > 0 && loanMonthlyInp) {
                    loanMonthlyInp.value = (amount / duration).toFixed(0);
                } else if (monthly > 0 && loanDurationInp) {
                    loanDurationInp.value = Math.ceil(amount / monthly);
                }
            }
        };

        const calculateMainLoanEndDate = () => {
            const startStr = document.getElementById('loan-start-date')?.value;
            const duration = parseInt(document.getElementById('loan-duration')?.value) || 0;
            const endInp = document.getElementById('loan-end-date');

            if (!startStr || duration <= 0 || !endInp) return;

            const s = startStr.toLowerCase().trim();
            const monthMap = {
                'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7, 'aout': 8, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12, 'décembre': 12,
                'jan': 1, 'janv': 1, 'fev': 2, 'févr': 2, 'mar': 3, 'avr': 4, 'jun': 6, 'jul': 7, 'juil': 7, 'aou': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12, 'déc': 12
            };

            let m, y;
            const matchNum = s.match(/^(\d{1,2})[\/\-\s]+(\d{2,4})$/);
            const matchText = s.match(/^([a-zûéè]+)[\/\-\s]*(\d{2,4})$/);
            const matchYMD = s.match(/^(\d{4})[\/\-\s]+(\d{1,2})[\/\-\s]*(\d{0,2})$/);
            const matchDMY = s.match(/^(\d{1,2})[\/\-\s]+(\d{1,2})[\/\-\s]+(\d{2,4})$/);

            if (matchYMD) {
                y = parseInt(matchYMD[1]);
                m = parseInt(matchYMD[2]);
            } else if (matchDMY) {
                m = parseInt(matchDMY[2]);
                y = parseInt(matchDMY[3]);
            } else if (matchNum) {
                m = parseInt(matchNum[1]);
                y = parseInt(matchNum[2]);
            } else if (matchText) {
                m = monthMap[matchText[1]];
                y = parseInt(matchText[2]);
            }

            if (m && y && m >= 1 && m <= 12) {
                // y could be 26 => 2026
                if (y < 100) y += 2000;

                // End date is duration - 1 months ahead (inclusive)
                const totalMonths = m + duration - 1;
                const endM = ((totalMonths - 1) % 12) + 1;
                const endY = y + Math.floor((totalMonths - 1) / 12);

                const monthsNames = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
                endInp.value = `${monthsNames[endM - 1]}/${endY}`;
            } else {
                endInp.value = '';
            }
        };

        if (loanDurationInp) loanDurationInp.addEventListener('input', calculateMainLoan);
        if (loanMonthlyInp) loanMonthlyInp.addEventListener('input', calculateMainLoan);
        if (mainAmountInp) mainAmountInp.addEventListener('input', calculateMainLoan);

        const loanStartInp = document.getElementById('loan-start-date');
        if (loanStartInp) {
            loanStartInp.addEventListener('input', calculateMainLoanEndDate);
            loanStartInp.addEventListener('blur', calculateMainLoanEndDate);
        }

        // RH Forms logic
        const quickRhForm = document.getElementById('quick-rh-form');
        if (quickRhForm) {
            quickRhForm.onsubmit = (e) => {
                e.preventDefault();
                const type = document.getElementById('quick-rh-type').value;
                const beneficiary = document.getElementById('quick-rh-employee').value;
                const amount = parseFloat(document.getElementById('quick-rh-amount').value);
                const month = document.getElementById('quick-rh-month').value;
                const installment = parseFloat(document.getElementById('quick-rh-installment')?.value || 0);
                const duration = parseInt(document.getElementById('quick-rh-duration')?.value || 0);
                const agentName = state.currentUser ? state.currentUser.name : "Admin";

                if (!beneficiary || !amount) return;

                const date = new Date().toISOString().split('T')[0];
                const transId = Date.now();

                if (type === 'ACOMPTE') {
                    appData.transactions.push({
                        id: transId,
                        type: 'expense',
                        date: date,
                        amount: amount,
                        category: 'ACOMPTE',
                        details: `Acompte versé à ${beneficiary}`,
                        partner: beneficiary,
                        advanceMonth: month || new Date().toISOString().slice(0, 7),
                        agent: agentName,
                        caisse: state.currentCaisse || 'general'
                    });
                } else {
                    if (!appData.loans) appData.loans = [];
                    appData.loans.push({
                        id: transId,
                        beneficiary,
                        amount,
                        date,
                        installment,
                        duration,
                        status: 'pending',
                        grantedBy: agentName,
                        isPaid: false
                    });
                    appData.transactions.push({
                        id: transId + 1,
                        type: 'expense',
                        date: date,
                        amount: amount,
                        category: 'PRÊT',
                        details: `Prêt accordé à ${beneficiary} (${duration} mois)`,
                        partner: beneficiary,
                        agent: agentName,
                        caisse: state.currentCaisse || 'general'
                    });
                }

                saveData();
                renderAcomptesPretsView();
                updateDashboard();
                quickRhForm.reset();
                const loanFields = document.querySelectorAll('.loan-only');
                loanFields.forEach(f => f.style.display = 'none');
                showNotification(`Opération ${type} enregistrée`, "success");
            };
        }

        // Initialize Print Date Filters
        const startDateInput = document.getElementById('print-start-date');
        const endDateInput = document.getElementById('print-end-date');
        if (startDateInput && endDateInput) {
            const now = new Date();
            // Force 01 of current month
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const firstDay = `${year}-${month}-01`;
            const today = now.toISOString().split('T')[0];
            startDateInput.value = firstDay;
            endDateInput.value = today;
        }

        const btnPrintPersonnel = document.getElementById('btn-print-personnel');
        if (btnPrintPersonnel) {
            btnPrintPersonnel.onclick = () => {
                const options = document.getElementById('personnel-print-options');
                if (options) options.style.display = options.style.display === 'none' ? 'block' : 'none';
            };
        }

        const btnConfirmPrintPers = document.getElementById('btn-confirm-print');
        if (btnConfirmPrintPers) {
            btnConfirmPrintPers.onclick = () => {
                const printMode = (document.getElementById('print-mode-select') || {}).value || 'all';
                const selection = (document.getElementById('print-employee-select') || {}).value || '';
                const startDate = (document.getElementById('print-start-date') || {}).value || '';
                const endDate = (document.getElementById('print-end-date') || {}).value || '';
                const currentTab = document.querySelector('.finance-tab.active');
                const rhMode = currentTab ? currentTab.dataset.mode : 'ACOMPTE';

                if (printMode === 'individual' && !selection.trim()) {
                    alert('Veuillez rechercher et sélectionner un employé à imprimer.');
                    return;
                }

                printPersonnelState(rhMode, printMode, selection, startDate, endDate);
            };
        }

        const btnExportExcel = document.getElementById('btn-export-excel');
        if (btnExportExcel) {
            btnExportExcel.onclick = () => {
                const printMode = (document.getElementById('print-mode-select') || {}).value || 'all';
                const selection = (document.getElementById('print-employee-select') || {}).value || '';
                const startDate = (document.getElementById('print-start-date') || {}).value || '';
                const endDate = (document.getElementById('print-end-date') || {}).value || '';
                const currentTab = document.querySelector('.finance-tab.active');
                const rhMode = currentTab ? currentTab.dataset.mode : 'ACOMPTE';
                exportToExcel(rhMode, printMode, selection, startDate, endDate);
            };
        }

        const btnExportPdf = document.getElementById('btn-export-pdf');
        if (btnExportPdf) {
            btnExportPdf.onclick = () => {
                const btnPrint = document.getElementById('btn-confirm-print');
                if (btnPrint) btnPrint.click(); // Re-use print logic for PDF export as requested
            };
        }

        const printModeSelect = document.getElementById('print-mode-select');
        if (printModeSelect) {
            printModeSelect.onchange = () => {
                const selectionContainer = document.getElementById('print-selection-container');
                if (selectionContainer) selectionContainer.style.display = (printModeSelect.value !== 'all') ? 'block' : 'none';
            };
        }
    }
    function handleTransactionSubmit(e) {
        e.preventDefault();

        // --- Lecture défensive de tous les champs ---
        const typeRadio = document.querySelector('input[name="type"]:checked');
        const type = typeRadio ? typeRadio.value : 'expense';
        const date = (document.getElementById('date') || {}).value || '';
        const amountPaid = parseFloat((document.getElementById('amount') || {}).value) || 0;

        let amountCharge = amountPaid;
        const chargeGroup = document.getElementById('amount-charge-group');
        const chargeInput = document.getElementById('amount-charge');
        if (chargeGroup && chargeGroup.style.display !== 'none' && chargeInput && chargeInput.value) {
            amountCharge = parseFloat(chargeInput.value) || amountPaid;
        }

        const category = (document.getElementById('category') || {}).value || 'DIVERS';
        const detailsInput = (document.getElementById('details') || {}).value || '';
        const observation = (document.getElementById('observation') || {}).value || '';
        const partner = (document.getElementById('partner') || {}).value || '';
        const employeeBeneficiary = (document.getElementById('employee-beneficiary') || {}).value || '';
        const agentRemettant = (document.getElementById('agent-remettant') || {}).value || '';
        const executor = (document.getElementById('executor') || {}).value || '';
        const paymentMode = (document.getElementById('payment-mode') || {}).value || 'cash';
        const paymentref = (document.getElementById('payment-ref') || {}).value || '';
        const caisseSelect = document.getElementById('global-caisse-select');
        const caisse = caisseSelect ? caisseSelect.value : 'general';
        const code = (document.getElementById('code-input') || {}).value || '';

        // --- Mode actif ---
        const activeModeBtn = document.querySelector('.mode-btn.active');
        const mode = activeModeBtn ? activeModeBtn.dataset.mode : 'libre';
        const isRH = (mode === 'acompte' || mode === 'pret');

        // --- Validations métier ---
        if (!date || !amountPaid) {
            alert("La DATE et le MONTANT sont obligatoires.");
            return;
        }
        if (mode === 'tiers' && !partner) {
            alert("Le Partenaire est obligatoire en mode 'Avec Tiers'.");
            return;
        }
        if (isRH && !employeeBeneficiary) {
            // Don't block – allow saving with empty beneficiary in RH modes
            // alert("L'EMPLOYÉ bénéficiaire est obligatoire pour cette opération.");
            // return;
        }

        const finalBeneficiary = isRH ? employeeBeneficiary : partner;

        // Validation remettant optionnelle
        if (agentRemettant && appData.employees && appData.employees.length > 0) {
            const isEmployee = appData.employees.some(ep => ep.name.toUpperCase() === agentRemettant.toUpperCase());
            if (!isEmployee) {
                const proceed = confirm(`"${agentRemettant}" n'est pas un employé enregistré. Continuer quand même?`);
                if (!proceed) return;
            }
        }

        const agentName = "Admin";
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Validation mode de paiement mobile
        const mobileMoneyModes = ['wave', 'om', 'mtn', 'moov'];
        if (mobileMoneyModes.includes(paymentMode) && !paymentref) {
            alert(`Le numéro de référence est obligatoire pour les paiements par ${paymentMode.toUpperCase()}.`);
            const refEl = document.getElementById('payment-ref');
            if (refEl) refEl.focus();
            return;
        }

        // Mois de déduction
        let deductionMonth = (document.getElementById('deduction-month') || {}).value || '';
        if (!deductionMonth && date) {
            deductionMonth = date.substring(0, 7);
        }

        // Multi-bénéficiaires
        let beneficiaries = [];
        const multiContainer = document.getElementById('multi-beneficiary-container');
        if (multiContainer && multiContainer.style.display !== 'none') {
            const rows = document.querySelectorAll('.multi-beneficiary-row');
            rows.forEach(row => {
                const bName = (row.querySelector('.multi-name') || {}).value || '';
                const bAmount = parseFloat((row.querySelector('.multi-amount') || {}).value) || 0;
                const bMonth = (row.querySelector('.multi-month') || {}).value || '';
                if (bName && bAmount > 0) {
                    beneficiaries.push({ name: bName, amount: bAmount, advanceMonth: bMonth || deductionMonth });
                }
            });
        }

        const loanDuration = (document.getElementById('loan-duration') || {}).value || '';
        const loanMonthlyInput = (document.getElementById('loan-monthly') || {}).value;
        const loanStartDate = (document.getElementById('loan-start-date') || {}).value || '';
        const loanEndDate = (document.getElementById('loan-end-date') || {}).value || '';
        const loanMonthly = loanMonthlyInput || (amountPaid && loanDuration ? (amountPaid / parseInt(loanDuration)).toFixed(0) : 0);

        // Numéro de pièce
        let pieceNumber = '';
        try {
            pieceNumber = state.editTransactionId
                ? (appData.transactions.find(t => t.id === state.editTransactionId)?.pieceNumber || generatePieceNumber(date))
                : generatePieceNumber(date);
        } catch (err) {
            pieceNumber = `PC-${Date.now().toString().slice(-6)}`;
        }

        const transaction = {
            id: state.editTransactionId || Date.now(),
            pieceNumber,
            type,
            date,
            time,
            amount: amountPaid,
            amountCharge,
            category: category || 'DIVERS',
            code,
            details: detailsInput,
            observation,
            partner: beneficiaries.length > 0 ? 'MULTIPLE' : finalBeneficiary,
            beneficiaries,
            executor,
            agentRemettant,
            paymentMode,
            paymentref,
            caisse: caisse || 'general',
            user: agentName,
            advanceMonth: (mode === 'acompte') ? deductionMonth : null,
            isDeducted: (mode === 'acompte') ? false : null,
            loanDetails: (mode === 'pret') ? { duration: loanDuration, monthly: loanMonthly, startDate: loanStartDate, endDate: loanEndDate } : null
        };

        // Enregistrement
        if (state.editTransactionId) {
            const idx = appData.transactions.findIndex(t => t.id === state.editTransactionId);
            if (idx !== -1) appData.transactions[idx] = transaction;
            state.editTransactionId = null;
        } else {
            appData.transactions.push(transaction);
            if (category === 'PRÊT') {
                if (!appData.loans) appData.loans = [];
                const agents = beneficiaries.length > 0 ? beneficiaries : [{ name: finalBeneficiary, amount: amountPaid }];
                agents.forEach((agent, bIdx) => {
                    if (agent.name && agent.amount > 0) {
                        appData.loans.push({
                            id: Date.now() + bIdx,
                            beneficiary: agent.name,
                            amount: agent.amount,
                            date,
                            paymentMode,
                            paymentref,
                            user: agentName,
                            status: 'pending',
                            duration: loanDuration,
                            monthly: loanDuration ? (agent.amount / parseInt(loanDuration)).toFixed(0) : 0,
                            expectedEnd: (() => {
                                if (loanDuration) {
                                    const d = new Date(date);
                                    d.setMonth(d.getMonth() + parseInt(loanDuration));
                                    return d.toISOString().split('T')[0];
                                }
                                return null;
                            })()
                        });
                    }
                });
            }
        }

        // Option Modèle
        const saveAsModelCb = document.getElementById('save-as-model');
        if (saveAsModelCb && saveAsModelCb.checked) {
            const modelName = prompt("Donnez un nom à ce nouveau MODÈLE (il sera épinglé) :");
            if (modelName) {
                if (!appData.templates) appData.templates = [];
                appData.templates.push({
                    id: Date.now() + 1,
                    name: modelName,
                    type: transaction.type,
                    code: transaction.code,
                    category: transaction.category,
                    amount: transaction.amount,
                    details: transaction.details,
                    mode,
                    isPinned: true,
                    isSimple: true,
                    showRemettant: true,
                    showExecutor: true,
                    showBeneficiary: true,
                    showCharge: !!transaction.amountCharge && transaction.amountCharge !== transaction.amount
                });
                saveData();
                if (typeof renderPinnedModels === 'function') renderPinnedModels();
            }
        }

        saveData();
        showNotification("Transaction enregistree avec succes !", "success");

        // --- MISE À JOUR INSTANTANÉE (avant reset) ---
        renderSaisieHistory();
        updateDashboard();
        if (typeof renderAcomptesPretsView === 'function') renderAcomptesPretsView();

        // --- Reset complet dans le prochain tick ---
        setTimeout(() => {
            const form = document.getElementById('transaction-form');
            if (form) { try { form.reset(); } catch (_) { } }

            const fieldsToReset = ['category', 'code-input', 'details', 'partner', 'employee-beneficiary',
                'agent-remettant', 'executor', 'payment-ref', 'amount', 'amount-charge',
                'deduction-month', 'loan-duration', 'loan-start-date', 'loan-end-date'];
            fieldsToReset.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = (id === 'category') ? 'DIVERS' : '';
            });

            const dateEl = document.getElementById('date');
            if (dateEl) { dateEl.valueAsDate = new Date(); dateEl.focus(); }
            const pmEl = document.getElementById('payment-mode');
            if (pmEl) pmEl.value = 'cash';
            ['payment-ref-group', 'amount-charge-group'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            document.querySelectorAll('.acompte-only, .loan-only').forEach(el => el.style.display = 'none');
        }, 50);
    }

    function generatePieceNumber(dateStr) {
        const d = new Date(dateStr);
        const year = d.getFullYear().toString().slice(-2);
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `PC-${year}${month}`;
        // Find max sequence for this month
        const count = appData.transactions.filter(t => t.pieceNumber && t.pieceNumber.startsWith(prefix)).length;
        const sequence = (count + 1).toString().padStart(4, '0');
        return `${prefix}-${sequence}`;
    }
    function editTransaction(id) {
        const t = appData.transactions.find(x => x.id == id);
        if (!t) return;
        state.editTransactionId = id;
        switchView('saisie');

        // Ensure form is visible and scrolled into view
        const form = document.getElementById('transaction-form');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            form.style.background = '#fffbeb'; // Highlight effect
            setTimeout(() => { form.style.background = ''; }, 2000);
        }
        // Fill form
        const typeradio = document.querySelector(`input[name="type"][value="${t.type}"]`);
        if (typeradio) typeradio.checked = true;
        document.getElementById('date').value = t.date;
        document.getElementById('amount-charge').value = t.amountCharge || t.amount;
        document.getElementById('amount').value = t.amount;
        document.getElementById('category').value = t.category;
        document.getElementById('code-input').value = t.code || '';
        document.getElementById('details').value = t.details || '';
        const obsEl = document.getElementById('observation');
        if (obsEl) obsEl.value = t.observation || '';
        document.getElementById('partner').value = t.partner || '';
        document.getElementById('executor').value = t.executor || '';
        document.getElementById('payment-mode').value = t.paymentMode || 'cash';
        document.getElementById('payment-ref').value = t.paymentref || '';
        if (document.getElementById('agent-remettant')) document.getElementById('agent-remettant').value = t.agentRemettant || '';
        if (document.getElementById('employee-beneficiary')) {
            const isRH = (t.category === 'ACOMPTE' || t.category === 'PRÊT');
            document.getElementById('employee-beneficiary').value = isRH ? (t.partner === 'MULTIPLE' ? '' : t.partner) : '';
        }
        // Sync Payment Ref Visibility
        setupPaymentLogic();
        // RH Fields Population
        if (t.category === 'ACOMPTE') {
            triggerMode('acompte');
            const deducEl = document.getElementById('deduction-month');
            if (deducEl) deducEl.value = t.advanceMonth || '';
        } else if (t.category === 'PRÊT') {
            triggerMode('pret');
            if (t.loanDetails) {
                const durEl = document.getElementById('loan-duration');
                const startEl = document.getElementById('loan-start-date');
                const endEl = document.getElementById('loan-end-date');
                const monthlyEl = document.getElementById('loan-monthly');

                if (durEl) durEl.value = t.loanDetails.duration || '';
                if (monthlyEl) monthlyEl.value = t.loanDetails.monthly || '';
                if (startEl) startEl.value = t.loanDetails.startDate || '';
                if (endEl) endEl.value = t.loanDetails.endDate || '';

                // Trigger calc
                if (durEl) durEl.dispatchEvent(new Event('input'));
            }
        } else if (t.partner) {
            triggerMode('tiers');
        } else {
            triggerMode('libre');
        }
        document.querySelector('#transaction-form button[type="submit"]').textContent = 'Mettre à jour';
        // Scroll to form
        document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth' });
    }
    function triggerMode(modeName) {
        const btn = document.querySelector(`.mode-btn[data-mode="${modeName}"]`);
        if (btn) btn.click();
    }
    // --- Mass Selection Helper ---
    function setupMassSelection(config) {
        const selectAll = document.getElementById(config.selectAllId);
        const deleteBtn = document.getElementById(config.deleteBtnId);
        const tbody = document.getElementById(config.tbodyId);

        if (selectAll) {
            selectAll.checked = false;
            selectAll.onclick = (e) => {
                const checked = e.target.checked;
                const cbs = tbody.querySelectorAll('.' + config.rowClass);
                cbs.forEach(cb => cb.checked = checked);
                if (deleteBtn) deleteBtn.style.display = checked && cbs.length > 0 ? 'inline-block' : 'none';
            };
        }

        if (tbody) {
            let lastChecked = null;
            tbody.addEventListener('click', (e) => {
                if (e.target.classList.contains(config.rowClass)) {
                    const checkedCbs = tbody.querySelectorAll('.' + config.rowClass + ':checked');
                    if (deleteBtn) deleteBtn.style.display = checkedCbs.length > 0 ? 'inline-block' : 'none';

                    if (e.shiftKey && lastChecked) {
                        const allCbs = Array.from(tbody.querySelectorAll('.' + config.rowClass));
                        const start = allCbs.indexOf(e.target);
                        const end = allCbs.indexOf(lastChecked);
                        const [min, max] = [Math.min(start, end), Math.max(start, end)];
                        allCbs.slice(min, max + 1).forEach(cb => cb.checked = lastChecked.checked);
                    }
                    lastChecked = e.target;
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.onclick = () => {
                const selected = tbody.querySelectorAll('.' + config.rowClass + ':checked');
                if (selected.length === 0) return;

                if (confirm(`Voulez-vous vraiment supprimer les ${selected.length} éléments sélectionnés ?`)) {
                    const itemsToDelete = Array.from(selected).map(cb => cb.getAttribute('data-id'));

                    if (config.onDelete) {
                        config.onDelete(itemsToDelete);
                    } else {
                        const prop = config.identityProp || 'id';
                        appData[config.dataArrayName] = appData[config.dataArrayName].filter(item => {
                            const val = item[prop]?.toString();
                            return !itemsToDelete.includes(val);
                        });
                    }

                    saveData();
                    if (config.renderFn) config.renderFn();
                    if (selectAll) selectAll.checked = false;
                    deleteBtn.style.display = 'none';
                }
            };
        }
    }

    // --- Tiers logic ---
    function renderPartners() {
        const tbody = document.getElementById('tiers-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        const currentCaisse = state.currentCaisse || 'general';
        appData.partners.forEach((p, index) => {
            const pTransactions = appData.transactions.filter(t =>
                t.partner === p.name && (currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse)
            );
            const balance = pTransactions.reduce((acc, t) => {
                return acc + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="tiers-row-cb" data-id="${p.name}"></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge ${p.type}">${formatType(p.type)}</span></td>
                <td style="font-weight:700; color:${balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                    ${formatCurrency(balance)}
                </td>
                <td><small>${p.contact || '-'}</small></td>
                <td>
                    <button class="btn-icon view-account" data-name="${p.name}" title="Voir Compte"><i class="fa-solid fa-file-invoice"></i></button>
                    <button class="btn-icon edit-tier" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-tier" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Setup Mass Selection for Partners
        setupMassSelection({
            selectAllId: 'select-all-tiers',
            deleteBtnId: 'btn-delete-selected-tiers',
            tbodyId: 'tiers-table-body',
            rowClass: 'tiers-row-cb',
            dataArrayName: 'partners',
            identityProp: 'name',
            renderFn: renderPartners
        });
        // Event Delegation for Partners
        tbody.onclick = (e) => {
            const viewBtn = e.target.closest('.view-account');
            const editBtn = e.target.closest('.edit-tier');
            const deleteBtn = e.target.closest('.delete-tier');
            if (viewBtn) {
                showTierAccount(viewBtn.getAttribute('data-name'));
            }
            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const p = appData.partners[index];
                document.getElementById('tier-edit-index').value = index;
                document.getElementById('tier-name').value = p.name;
                document.getElementById('tier-type').value = p.type;
                document.getElementById('tier-service').value = p.service || '';
                document.getElementById('tier-contact').value = p.contact || '';
                document.getElementById('tier-form-title').textContent = "Modifier Tiers";
                document.getElementById('add-tier-form-container').style.display = 'block';
            }
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                if (confirm('Supprimer ce tiers ?')) {
                    appData.partners.splice(index, 1);
                    saveData();
                    populateSelects();
                    renderPartners();
                }
            }
        };
    }
    function showTierAccount(tierName) {
        state.currentView = 'tier-account';
        state.views.forEach(v => v.classList.add('hidden-view'));
        document.getElementById('tier-account').classList.remove('hidden-view');
        document.getElementById('tier-account-title').textContent = `Compte Tiers : ${tierName}`;
        const historyBody = document.getElementById('tier-account-history');
        const summaryArea = document.getElementById('tier-account-summary');
        historyBody.innerHTML = '';
        const currentCaisse = state.currentCaisse || 'general';
        const txs = appData.transactions.filter(t =>
            t.partner === tierName && (currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulativeBalance = 0;
        let TOTALIncome = 0;
        let TOTALexpense = 0;
        txs.forEach(t => {
            const isInc = t.type === 'income';
            if (isInc) TOTALIncome += t.amount; else TOTALexpense += t.amount;
            cumulativeBalance += (isInc ? t.amount : -t.amount);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:700;">${t.date}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${t.time || '00:00'}</div>
                </td>
                <td>
                   <div style="font-weight:600;">${t.category}</div>
                   <div style="font-size:0.75rem;">${t.details || ''}</div>
                </td>
                <td><small>${t.executor || '-'}</small></td>
                <td style="color:var(--accent-success); font-weight:700;">${isInc ? formatCurrency(t.amount) : '-'}</td>
                <td style="color:var(--accent-danger); font-weight:700;">${!isInc ? formatCurrency(t.amount) : '-'}</td>
                <td style="font-weight:800;">${formatCurrency(cumulativeBalance)}</td>
                <td><small>${(t.paymentMode || 'esp?ce').toUpperCase()}</small></td>
                <td>
                    <button class="btn-icon" onclick="editTransaction(${t.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon" onclick="printReceipt(${t.id})"><i class="fa-solid fa-print"></i></button>
                </td>
            `;
            historyBody.appendChild(tr);
        });
        summaryArea.innerHTML = `
            <div class="card kpi-card">
                <h3>TOTAL Entr?es</h3>
                <p class="amount" style="color:var(--accent-success)">${formatCurrency(TOTALIncome)}</p>
            </div>
            <div class="card kpi-card">
                <h3>TOTAL SORTIEs</h3>
                <p class="amount" style="color:var(--accent-danger)">${formatCurrency(TOTALexpense)}</p>
            </div>
            <div class="card kpi-card">
                <h3>Solde Net</h3>
                <p class="amount" style="color:${cumulativeBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${formatCurrency(cumulativeBalance)}</p>
            </div>
        `;
    }
    function formatType(type) {
        const map = { 'client': 'Client', 'supplier': 'Fournisseur', 'other': 'Autre' };
        return map[type] || type;
    }
    // --- Codes logic ---
    function renderCodes() {
        const tbody = document.getElementById('codes-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!appData.codes) appData.codes = [];
        appData.codes.forEach((c, index) => {
            const tr = document.createElement('tr');
            const typelabel = c.type === 'income' ? 'Entrée' : (c.type === 'expense' ? 'SORTIE' : 'Mixte');
            const typeClass = c.type === 'income' ? 'client' : (c.type === 'expense' ? 'supplier' : 'badge');
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="codes-row-cb" data-id="${c.short}"></td>
                <td><strong>${c.short}</strong></td>
                <td>${c.name}</td>
                <td><span class="badge ${typeClass}">${typelabel}</span></td>
                <td>
                    <button class="btn-icon edit-code" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-code" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupMassSelection({
            selectAllId: 'select-all-codes',
            deleteBtnId: 'btn-delete-selected-codes',
            tbodyId: 'codes-table-body',
            rowClass: 'codes-row-cb',
            dataArrayName: 'codes',
            identityProp: 'short',
            renderFn: renderCodes
        });
        // Event Delegation for Codes
        tbody.onclick = (e) => {
            const editBtn = e.target.closest('.edit-code');
            const deleteBtn = e.target.closest('.delete-code');
            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const c = appData.codes[index];
                document.getElementById('edit-code-index').value = index;
                document.getElementById('edit-code-short').value = c.short;
                document.getElementById('edit-code-name').value = c.name;
                document.getElementById('edit-code-type').value = c.type || 'mixed';
                document.getElementById('edit-code-form-container').style.display = 'block';
                document.getElementById('add-code-form-container').style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                if (confirm('Supprimer ce code ?')) {
                    appData.codes.splice(index, 1);
                    saveData();
                    populateSelects();
                    renderCodes();
                }
            }
        };
    }
    // --- Models logic ---
    function renderModels() {
        const tbody = document.getElementById('models-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        // Ensure defaults if undefined
        if (!appData.templates) appData.templates = [];
        appData.templates.forEach((model, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="models-row-cb" data-id="${index}"></td>
                <td>${model.name}</td>
                <td><strong>${model.code || '-'}</strong></td>
                <td><span class="badge ${model.type === 'income' ? 'client' : 'supplier'}">${model.type === 'income' ? 'Entrée' : 'SORTIE'}</span></td>
                <td>${model.requireTier ? '<i class="fa-solid fa-check" style="color: var(--accent-success);"></i>' : 'Non'}</td>
                <td title="Accès rapide">${model.isPinned ? '📌' : '-'} ${model.isSimple ? '✨' : ''}</td>
                <td>
                    <button class="btn-icon edit-model" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-model" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupMassSelection({
            selectAllId: 'select-all-models',
            deleteBtnId: 'btn-delete-selected-models',
            tbodyId: 'models-table-body',
            rowClass: 'models-row-cb',
            onDelete: (indices) => {
                const sortedIndices = indices.map(Number).sort((a, b) => b - a);
                sortedIndices.forEach(idx => appData.templates.splice(idx, 1));
            },
            renderFn: renderModels
        });
        // Delegation for Models
        tbody.onclick = (e) => {
            const editBtn = e.target.closest('.edit-model');
            const deleteBtn = e.target.closest('.delete-model');
            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const m = appData.templates[index];
                document.getElementById('model-form-title').textContent = 'Modifier le Modèle';
                document.getElementById('model-edit-index').value = index;
                document.getElementById('model-name').value = m.name;
                document.getElementById('model-type').value = m.type;
                document.getElementById('model-code').value = m.code || '';
                document.getElementById('model-category').value = m.category;
                document.getElementById('model-amount').value = m.amount || '';
                // The field is model-details-input or model-details? check index.html
                const det = document.getElementById('model-details-input') || document.getElementById('model-details');
                if (det) det.value = m.details || '';
                document.getElementById('model-require-tier').checked = !!m.requireTier;
                document.getElementById('model-is-pinned').checked = !!m.isPinned;
                const simpleCheck = document.getElementById('model-is-simple');
                if (simpleCheck) simpleCheck.checked = !!m.isSimple;
                document.getElementById('add-model-form-container').style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                if (confirm('Supprimer ce modèle ?')) {
                    appData.templates.splice(index, 1);
                    saveData();
                    populateSelects();
                    renderModels();
                    renderPinnedModels();
                }
            }
        };
    }
    // --- Agents logic ---
    function renderAgents() {
        const tbody = document.getElementById('agents-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!appData.agents) appData.agents = [{ id: 1, name: 'Admin', role: 'admin' }]; // Default admin
        appData.agents.forEach((agent, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${agent.role !== 'admin' ? `<input type="checkbox" class="agents-row-cb" data-id="${agent.id || index}">` : ''}</td>
                <td><strong>${agent.name}</strong><br><small style="color:var(--text-muted)">login: ${agent.login || '-'}</small></td>
                <td><span class="badge ${agent.role === 'admin' ? 'client' : 'other'}">${agent.role === 'admin' ? 'Admin' : 'Caissier'}</span></td>
                <td>${agent.access === 'both' ? 'Générale & Secondaire' : (agent.access === 'secondary' ? 'Secondaire' : 'Générale')}</td>
                <td>
                    <button class="btn-icon edit-agent" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                    ${agent.role !== 'admin' ? `<button class="btn-icon delete-agent" data-index="${index}"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupMassSelection({
            selectAllId: 'select-all-agents',
            deleteBtnId: 'btn-delete-selected-agents',
            tbodyId: 'agents-table-body',
            rowClass: 'agents-row-cb',
            onDelete: (ids) => {
                // Admin protection is already in the checkbox rendering, but we'll double check
                const idsToDelete = ids.map(id => id.toString());
                appData.agents = appData.agents.filter((agent, idx) => {
                    const id = (agent.id || idx).toString();
                    return agent.role === 'admin' || !idsToDelete.includes(id);
                });
            },
            renderFn: renderAgents
        });

        // Delegation for Agents
        tbody.onclick = (e) => {
            const editBtn = e.target.closest('.edit-agent');
            const deleteBtn = e.target.closest('.delete-agent');
            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const agent = appData.agents[index];
                document.getElementById('agent-edit-index').value = index;
                document.getElementById('agent-name').value = agent.name;
                document.getElementById('agent-login').value = agent.login || '';
                document.getElementById('agent-code').value = agent.code || '';
                document.getElementById('agent-role').value = agent.role;
                document.getElementById('agent-access').value = agent.access || 'general';
                const viewAllBox = document.getElementById('agent-view-all-balances');
                if (viewAllBox) viewAllBox.checked = !!agent.viewAllBalances;
                document.getElementById('add-agent-form-container').style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                if (confirm('Supprimer cet agent ?')) {
                    appData.agents.splice(index, 1);
                    saveData();
                    renderAgents();
                }
            }
        };
    }
    // --- RH logic ---
    // --- RH & Finances logic ---
    function renderRHView() {
        const tbody = document.getElementById('rh-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!appData.employees) appData.employees = [];

        appData.employees.forEach((emp, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="rh-row-cb" data-id="${emp.name}"></td>
                <td><div style="font-weight:700; color:var(--primary-color);">${emp.matricule || '-'}</div></td>
                <td><div style="font-weight:700;">${emp.name}</div></td>
                <td>${emp.position}</td>
                <td>${emp.abbr || '-'}</td>
                <td>
                    <button class="btn-icon edit-employee" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-employee" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupMassSelection({
            selectAllId: 'select-all-rh',
            deleteBtnId: 'btn-delete-selected-rh',
            tbodyId: 'rh-table-body',
            rowClass: 'rh-row-cb',
            dataArrayName: 'employees',
            identityProp: 'name',
            renderFn: renderRHView
        });

        tbody.onclick = (e) => {
            const editBtn = e.target.closest('.edit-employee');
            const deleteBtn = e.target.closest('.delete-employee');

            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const emp = appData.employees[index];
                document.getElementById('employee-edit-index').value = index;
                document.getElementById('employee-name').value = emp.name;
                document.getElementById('employee-abbr').value = emp.abbr || '';
                document.getElementById('employee-matricule').value = emp.matricule || '';
                document.getElementById('employee-position').value = emp.position;
                document.getElementById('add-employee-form-container').style.display = 'block';
                document.getElementById('employee-form-title').textContent = "Modifier Employ?";
            }
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                if (confirm('Supprimer cet EMPLOYÉ ?')) {
                    appData.employees.splice(index, 1);
                    saveData();
                    renderRHView();
                }
            }
        };
    }

    let financeFilterMode = 'ACOMPTE';

    function renderAcomptesPretsView() {
        const tbody = document.getElementById('personnel-table-body');
        const table = document.getElementById('personnel-main-table');
        if (!tbody || !table) return;
        tbody.innerHTML = '';
        if (!appData.employees) appData.employees = [];

        const mode = state.financeFilterMode || 'ALL';
        const monthFilter = state.financeMonthFilter || '';

        let globalAcompte = 0;
        let globalPret = 0;
        let employeesAffected = 0;

        appData.employees.forEach((emp) => {
            const transactions = (appData.transactions || []).filter(t => (t.partner === emp.name || (t.beneficiaries && t.beneficiaries.some(b => b.name === emp.name))));

            const getEmpAmount = (t) => {
                if (t.beneficiaries && t.beneficiaries.length > 0) {
                    const b = t.beneficiaries.find(bx => bx.name === emp.name);
                    return b ? parseFloat(b.amount) || 0 : 0;
                }
                return parseFloat(t.amount) || 0;
            };

            const acompteTotal = transactions
                .filter(t => {
                    const isAcompte = t.category && t.category.toUpperCase().trim() === 'ACOMPTE' && !t.isDeducted;
                    if (!isAcompte) return false;
                    if (monthFilter && t.advanceMonth !== monthFilter) return false;
                    return true;
                })
                .reduce((sum, t) => sum + getEmpAmount(t), 0);

            const loanTotal = (appData.loans || [])
                .filter(l => l.beneficiary === emp.name && !l.isPaid)
                .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);



            // Filter logic
            let isVisible = false;
            const search = (state.financeSearchFilter || '').toLowerCase();
            const matchesSearch = !search || emp.name.toLowerCase().includes(search);

            if (matchesSearch) {
                if (mode === 'ALL') isVisible = (acompteTotal > 0 || loanTotal > 0);
                else if (mode === 'ACOMPTE') isVisible = (acompteTotal > 0);
                else if (mode === 'PRÊT') isVisible = (loanTotal > 0);
            }

            if (!isVisible) return;
            globalAcompte += acompteTotal;
            globalPret += loanTotal;
            employeesAffected++;

            const tr = document.createElement('tr');
            tr.className = 'employee-row hover-glow';
            tr.setAttribute('data-emp-name', emp.name);
            tr.innerHTML = `
                <td style="text-align:center;">
                    <i class="fa-solid fa-chevron-right toggle-details" style="cursor:pointer; transition:0.3s; color:var(--primary-color);"></i>
                </td>
                <td style="padding: 1.2rem 1.5rem;">
                    <div style="font-weight:800; color: var(--text-main); font-size: 1rem;">${emp.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px; margin-top: 2px;">MATRICULE: ${emp.matricule || '-'}</div>
                </td>
                <td><span class="badge" style="background: #f1f5f9; color: var(--secondary-color); font-weight: 700; border: 1px solid #e2e8f0; padding: 0.4rem 0.8rem; border-radius: 6px;">${emp.position || 'Personnel'}</span></td>
                <td style="color:#e11d48; font-weight:900; text-align: right; font-size: 0.95rem;">${acompteTotal > 0 ? formatCurrency(acompteTotal) : '-'}</td>
                <td style="color:#8b5cf6; font-weight:900; text-align: right; font-size: 0.95rem;">${loanTotal > 0 ? formatCurrency(loanTotal) : '-'}</td>
                <td style="font-weight:900; color: var(--primary-color); text-align: right; background: rgba(var(--primary-rgb), 0.03); font-size: 1rem; border-left: 1px solid rgba(0,0,0,0.03);">${formatCurrency(acompteTotal + loanTotal)}</td>
            `;

            const detailTr = document.createElement('tr');
            detailTr.className = 'detail-row hidden';
            detailTr.setAttribute('id', 'details-' + emp.name.replace(/\s+/g, '-'));
            detailTr.innerHTML = `<td colspan="6" class="detail-container" style="padding:0; border: none; background: #fafafa;"></td>`;

            tbody.appendChild(tr);
            tbody.appendChild(detailTr);
        });

        const recaps = {
            'recap-total-acomptes': globalAcompte,
            'recap-total-prets': globalPret,
            'recap-total-global-rh': globalAcompte + globalPret,
            'recap-total-employes': employeesAffected
        };

        Object.entries(recaps).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'recap-total-employes') {
                    el.textContent = val;
                } else {
                    el.textContent = formatCurrency(val);
                }
            }
        });

        tbody.onclick = (e) => {
            const toggle = e.target.closest('.toggle-details');
            if (toggle) {
                const row = toggle.closest('.employee-row');
                const nextRow = row.nextElementSibling;
                const icon = toggle;

                if (nextRow.classList.contains('hidden')) {
                    nextRow.classList.remove('hidden');
                    icon.style.transform = 'rotate(90deg)';
                    renderEmployeeDetails(row.getAttribute('data-emp-name'), nextRow.querySelector('.detail-container'));
                } else {
                    nextRow.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        };
    }



    function renderEmployeeDetails(empName, container) {
        const transactions = appData.transactions.filter(t => (t.partner === empName || (t.beneficiaries && t.beneficiaries.some(b => b.name === empName))) && (t.category === 'ACOMPTE' || t.category === 'PRÊT'));

        let html = `
            <div style="padding: 1.5rem; background: #fafafa; border-top: 1px solid #eee;">
                <h5 style="margin-bottom:1rem; color:var(--primary-color);">Historique détaillé : ${empName}</h5>
                <div style="display:grid; grid-template-columns: 1fr; gap: 2rem;">
                    <div>
                        <h6 style="border-bottom:1px solid #ddd; padding-bottom:0.5rem; margin-bottom:0.75rem;">Acomptes (Détails)</h6>
                        ${transactions.filter(t => t.category === 'ACOMPTE').length ? `
                            <table style="font-size:0.85rem; width:100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background:#f1f5f9; text-align: left;">
                                        <th style="padding: 8px;">Date</th>
                                        <th style="padding: 8px;">Mois Déduc.</th>
                                        <th style="padding: 8px;">Compte (Caisse)</th>
                                        <th style="padding: 8px;">Bénéficiaire</th>
                                        <th style="padding: 8px;">Remettant</th>
                                        <th style="padding: 8px;">Moyen</th>
                                        <th style="padding: 8px;">Montant</th>
                                        <th style="padding: 8px;">Statut</th>
                                        <th style="padding: 8px; text-align: center;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactions.filter(t => t.category && t.category.toUpperCase().trim() === 'ACOMPTE').map(t => {
            const isDeducted = t.isDeducted === true;
            let displayAmount = t.amount;
            let displayDetails = t.details;
            if (t.beneficiaries && t.beneficiaries.length > 0) {
                const b = t.beneficiaries.find(bx => bx.name === empName);
                if (b) {
                    displayAmount = b.amount;
                    displayDetails = `[MULTI] ${t.details}`;
                }
            }
            return `
                                        <tr style="border-bottom: 1px solid #eee;" title="${t.details}">
                                            <td style="padding: 8px;">${formatDate(t.date)}</td>
                                            <td style="padding: 8px; font-weight:700;">${t.advanceMonth || '-'}</td>
                                            <td style="padding: 8px;">${t.code || t.category} <br> <span style="font-size:0.7rem;color:#777;">${t.caisse || ''}</span></td>
                                            <td style="padding: 8px; font-weight:600;">${empName}</td>
                                            <td style="padding: 8px;">${t.agentRemettant || '-'}</td>
                                            <td style="padding: 8px;"><span class="badge" style="background:#eef2ff; color:#4f46e5;">${t.paymentMode}</span></td>
                                            <td style="padding: 8px; font-weight:800; color:var(--accent-danger);">${formatCurrency(displayAmount)}</td>
                                            <td style="padding: 8px;">
                                                <span class="badge" style="background: ${isDeducted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'}; color: ${isDeducted ? '#16a34a' : '#ca8a04'}; font-weight: 700;">
                                                    ${isDeducted ? '<i class="fa-solid fa-check-double"></i> DÉDUIT' : '<i class="fa-solid fa-clock"></i> EN ATTENTE'}
                                                </span>
                                            </td>
                                            <td style="padding: 8px; text-align: center;">
                                                <button class="btn-icon toggle-deduction" data-id="${t.id}" title="${isDeducted ? 'Annuler déduction' : 'Marquer comme déduit'}"
                                                    style="color: ${isDeducted ? '#64748b' : '#16a34a'};">
                                                    <i class="fa-solid ${isDeducted ? 'fa-rotate-left' : 'fa-hand-holding-dollar'}"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        ` : '<p style="font-style:italic; color:#999;">Aucun acompte enregistré.</p>'}

                        ${transactions.filter(t => t.category === 'PRÊT').length ? `
                            <h6 style="border-bottom:1px solid #ddd; padding-bottom:0.5rem; margin-top:2rem; margin-bottom:0.75rem;">Prêts (Détails)</h6>
                            <table style="font-size:0.85rem; width:100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background:#f1f5f9; text-align: left;">
                                        <th style="padding: 8px;">Date</th>
                                        <th style="padding: 8px;">Montant Total</th>
                                        <th style="padding: 8px;">Mensualité</th>
                                        <th style="padding: 8px;">Durée</th>
                                        <th style="padding: 8px;">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactions.filter(t => t.category && t.category.toUpperCase().trim() === 'PRÊT').map(t => {
                const loanInfo = t.loanDetails || {};
                return `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 8px;">${formatDate(t.date)}</td>
                                            <td style="padding: 8px; font-weight:700;">${formatCurrency(t.amount)}</td>
                                            <td style="padding: 8px;">${loanInfo.monthly ? formatCurrency(loanInfo.monthly) : '-'}</td>
                                            <td style="padding: 8px;">${loanInfo.duration ? loanInfo.duration + ' mois' : '-'}</td>
                                            <td style="padding: 8px;"><span class="badge ${t.isPaid ? 'badge-success' : 'badge-warning'}">${t.isPaid ? 'PAYÉ' : 'EN COURS'}</span></td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Attach click listener for deduction toggle
        container.querySelectorAll('.toggle-deduction').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tid = btn.getAttribute('data-id');
                toggleAcompteDeduction(tid, empName, container);
            };
        });
    }

    function toggleAcompteDeduction(id, empName, container) {
        const t = appData.transactions.find(tx => tx.id == id);
        if (t) {
            t.isDeducted = !t.isDeducted;
            saveData();
            renderEmployeeDetails(empName, container);
            if (typeof updateDashboard === 'function') updateDashboard();
        }
    }

    // --- Stats logic ---
    // --- Stats logic ---
    function renderStats() {
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;
        const currentCaisse = state.currentCaisse || 'general';
        // Calculate TOTALs per Category
        const catTOTALs = {};
        appData.transactions.filter(t => (currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse) && t.category !== 'Dette Initiale' && t.category !== 'Cr?ance Initiale').forEach(t => {
            if (!catTOTALs[t.category]) catTOTALs[t.category] = { income: 0, expense: 0 };
            if (t.type === 'income') catTOTALs[t.category].income += t.amount;
            if (t.type === 'expense') catTOTALs[t.category].expense += t.amount;
        });
        // Calculate TOTALs per Partner
        const partTOTALs = {};
        appData.transactions.filter(t => currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse).forEach(t => {
            if (t.partner) {
                if (!partTOTALs[t.partner]) partTOTALs[t.partner] = 0;
                if (t.type === 'income') partTOTALs[t.partner] += t.amount;
                if (t.type === 'expense') partTOTALs[t.partner] -= t.amount; // Simplify to balance for now
            }
        });
        let html = '<div class="dashboard-grid">';
        // Category Table
        html += `
            <div class="card">
                <h3>Par Cat?gorie</h3>
                <table>
                    <thead><tr><th>Cat?gorie</th><th>Entr?es</th><th>SORTIEs</th></tr></thead>
                    <tbody>
                        ${Object.keys(catTOTALs).map(cat => `
                            <tr>
                                <td>${cat}</td>
                                <td style="color: var(--accent-success)">${formatCurrency(catTOTALs[cat].income)}</td>
                                <td style="color: var(--accent-danger)">${formatCurrency(catTOTALs[cat].expense)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // Partner Table
        html += `
            <div class="card">
                <h3>Solde par Tiers</h3>
                <table>
                    <thead><tr><th>Tiers</th><th>Solde</th></tr></thead>
                    <tbody>
                        ${Object.keys(partTOTALs).map(p => `
                            <tr>
                                <td>${p}</td>
                                <td style="font-weight: bold; color: ${partTOTALs[p] >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${formatCurrency(partTOTALs[p])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        html += '</div>';
        if (statsContainer) statsContainer.innerHTML = html;
    }
    // --- Dashboard logic ---
    function setupCaisseSelector() {
        const caisseSelect = document.getElementById('global-caisse-select');
        if (!caisseSelect) return;

        // Restore from localStorage
        const savedCaisse = localStorage.getItem('activeCaisse') || 'general';
        caisseSelect.value = savedCaisse;
        state.currentCaisse = savedCaisse;

        // Ensure dashboard reflects the restored caisse immediately
        updateDashboard();

        caisseSelect.addEventListener('change', () => {
            const selected = caisseSelect.value;
            localStorage.setItem('activeCaisse', selected);
            state.currentCaisse = selected;
            updateDashboard();
            renderCurrentView();
        });
    }

    function renderCurrentView() {
        const viewId = state.currentView;
        if (viewId === 'accueil') updateDashboard();
        if (viewId === 'saisie') renderSaisieHistory();
        if (viewId === 'tiers') renderPartners();
        if (viewId === 'codes') renderCodes();
        if (viewId === 'modeles') {
            populateSelects();
            renderModels();
        }
        if (viewId === 'agents') renderAgents();
        if (viewId === 'rh') renderRHView();
        if (viewId === 'acomptes-prets') renderAcomptesPretsView();
        if (viewId === 'rapports') resetRapports();
        if (viewId === 'import') renderImportHistory();
        if (viewId === 'stats') renderStats();
    }
    // --- Dashboard logic ---
    function updateDashboard() {
        // Update Fiscal Year Display on Dashboard
        const fiscalYearSelect = document.getElementById('fiscal-year-select');
        const dashboardYearDisplay = document.getElementById('dashboard-fiscal-year-display');
        if (fiscalYearSelect && dashboardYearDisplay) {
            dashboardYearDisplay.textContent = fiscalYearSelect.value;
        }
        const dashboardCaisseSelect = document.getElementById('global-caisse-select');
        let selectedCaisse = dashboardCaisseSelect ? dashboardCaisseSelect.value : 'general';
        if (!selectedCaisse) selectedCaisse = 'general';
        const dashboardTitle = document.getElementById('dashboard-title');
        if (dashboardTitle) {
            // Only update the text node (first child), keep the selector (element child)
            const textNode = dashboardTitle.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = selectedCaisse === 'general' ? '?? Tableau de Bord ' : '?? Caisse Secondaire ';
            } else {
                // Fallback if structure changed, try to preser?ve the select if it exists inside
                const selector = dashboardTitle.querySelector('.fiscal-year-selector');
                dashboardTitle.textContent = selectedCaisse === 'general' ? '?? Tableau de Bord ' : '?? Caisse Secondaire ';
                if (selector) dashboardTitle.appendChild(selector);
            }
        }
        const dashboardMonthSelect = document.getElementById('dashboard-month-select');
        const selectedMonth = dashboardMonthSelect ? parseInt(dashboardMonthSelect.value) : new Date().getMonth();
        const selectedYear = fiscalYearSelect ? parseInt(fiscalYearSelect.value) : new Date().getFullYear();
        let income = 0;
        let expense = 0;
        let TOTALBalance = 0;
        let generalBalance = 0;
        let secondaryBalance = 0;
        let totalLoan = 0;
        let TOTALAcomptes = 0;

        const user = state.currentUser;
        const canViewAll = user && (user.viewAllBalances || user.role === 'admin');

        appData.transactions.forEach(t => {
            const tCaisseForAcompte = (t.caisse === 'secondary') ? 'secondary' : 'general';
            const matchesCaisse = selectedCaisse === 'all' || tCaisseForAcompte === selectedCaisse;
            if (t.category && t.category.toUpperCase().trim() === 'ACOMPTE' && !t.isDeducted && matchesCaisse) {
                TOTALAcomptes += t.amount || 0;
            }
            // Ensure older transactions default to 'general' correctly
            const tCaisse = (t.caisse === 'secondary') ? 'secondary' : 'general';

            // --- EXCLUDE INITIAL BALANCES FROM CASH CALCULATIONS ---
            const isInitialBalance = t.category === 'Dette Initiale' || t.category === 'Cr?ance Initiale';

            if (!isInitialBalance) {
                if (t.type === 'income') {
                    if (tCaisse === 'general') generalBalance += t.amount;
                    if (tCaisse === 'secondary') secondaryBalance += t.amount;
                }
                if (t.type === 'expense') {
                    if (tCaisse === 'general') generalBalance -= t.amount;
                    if (tCaisse === 'secondary') secondaryBalance -= t.amount;
                }
            }

            if (selectedCaisse !== 'all' && tCaisse !== selectedCaisse) return;

            // Also exclude from global totals and monthly flow if it's an initial balance
            if (!isInitialBalance) {
                const tDate = new Date(t.date);
                if (t.type === 'income') TOTALBalance += t.amount;
                if (t.type === 'expense') TOTALBalance -= t.amount;
                if (tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear) {
                    if (t.type === 'income') income += t.amount;
                    if (t.type === 'expense') expense += t.amount;
                }
            }
        });
        if (appData.loans) {
            appData.loans.forEach(loan => {
                if (loan.status === 'pending') totalLoan += loan.amount;
            });
        }
        // Update DOM
        const balel = document.getElementById('kpi-balance');
        const incEl = document.getElementById('kpi-income');
        const expEl = document.getElementById('kpi-expense');
        const advEl = document.getElementById('kpi-acomptes');
        const loanEl = document.getElementById('kpi-loans');

        if (balel) {
            if (canViewAll) {
                balel.innerHTML = `
                    <div style="font-size: 1.15rem; margin-bottom: 0.25rem;">Générale: <span style="color: var(--primary-color);">${formatCurrency(generalBalance)}</span></div>
                    <div style="font-size: 1.15rem;">Secondaire: <span style="color: var(--primary-color);">${formatCurrency(secondaryBalance)}</span></div>
                `;
            } else {
                balel.textContent = formatCurrency(TOTALBalance);
            }
        }
        if (incEl) incEl.textContent = formatCurrency(income);
        if (expEl) expEl.textContent = formatCurrency(expense);
        if (advEl) advEl.innerHTML = formatCurrency(TOTALAcomptes);
        if (loanEl) loanEl.innerHTML = formatCurrency(totalLoan);
        // Update Date
        const dateEl = document.getElementById('current-date-full');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString('fr-Fr', options);
        }
        updateTopTiers();
        // Add Click events to cards - pointed to Saisie History or reports
        const incomeCard = document.getElementById('card-income');
        if (incomeCard) {
            incomeCard.onclick = () => {
                const year = document.getElementById('fiscal-year-select')?.value || new Date().getFullYear();
                switchView('rapports');
                setTimeout(() => {
                    const start = document.getElementById('rep-sart-date');
                    const end = document.getElementById('rep-end-date');
                    if (start && end) {
                        start.value = `${year}-01-01`;
                        end.value = `${year}-12-31`;
                        document.getElementById('btn-generate-report')?.click();
                    }
                }, 100);
            };
        }
        const expenseCard = document.getElementById('card-expense');
        if (expenseCard) {
            expenseCard.onclick = () => {
                const year = document.getElementById('fiscal-year-select')?.value || new Date().getFullYear();
                switchView('rapports');
                setTimeout(() => {
                    const start = document.getElementById('rep-sart-date');
                    const end = document.getElementById('rep-end-date');
                    if (start && end) {
                        start.value = `${year}-01-01`;
                        end.value = `${year}-12-31`;
                        document.getElementById('btn-generate-report')?.click();
                    }
                }, 100);
            };
        }
        const balanceCard = document.getElementById('card-balance');
        if (balanceCard) {
            balanceCard.onclick = null; // Removed onclick redirect as requested
            balanceCard.style.cursor = 'default';
        }
        const acompteGroupCard = document.getElementById('card-acomptes-group');
        if (acompteGroupCard) {
            acompteGroupCard.onclick = () => {
                // By default shows ACOMTPES, but user can switch in the view
                financeFilterMode = 'ACOMPTE';
                switchView('acomptes-prets');
            };
        }
    }
    function updateTopTiers() {
        const tiersMap = {};
        appData.transactions.forEach(t => {
            if (t.partner && t.amount) {
                if (!tiersMap[t.partner]) tiersMap[t.partner] = { balance: 0, lastOp: '', details: '', lastDate: '' };
                const amount = t.amount;
                if (t.type === 'income') tiersMap[t.partner].balance += amount;
                else tiersMap[t.partner].balance -= amount;
                tiersMap[t.partner].lastOp = t.date;
                tiersMap[t.partner].details = t.category;
                tiersMap[t.partner].lastDate = new Date(t.date).toLocaleDateString('fr-Fr');
            }
        });
        const sortedTiers = Object.entries(tiersMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
            .slice(0, 10);
        const list = document.getElementById('top-tiers-list');
        if (list) {
            list.innerHTML = ''; // Clear existing list items
            sortedTiers.forEach(p => {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';
                li.onclick = () => showTierAccount(p.name);
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${p.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Derni?re op: ${p.lastDate}</div>
                        </div>
                        <div style="font-weight: 700; color: ${p.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                            ${formatCurrency(p.balance)}
                        </div>
                    </div>
                `;
                list.appendChild(li);
            });
        }
    }
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    window.formatDate = formatDate;

    function formatCurrency(amount) {
        return new Intl.NumberFormat('fr-Fr', { style: 'currency', currency: 'XOF' }).format(amount);
    }
    window.formatCurrency = formatCurrency;
    // --- Navigation ---
    function setupNavigation() {
        state.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const targetViewId = item.getAttribute('data-target');
                if (!targetViewId) return;

                // Restrict access to sensitive views for non-admin users (eg. simple caissier)
                const restrictedViews = ['agents', 'parametres'];
                const currentUser = state.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (restrictedViews.includes(targetViewId) && currentUser.role !== 'admin') {
                    e.preventDefault();
                    alert('Accès refusé : réservé aux administrateurs.');
                    return;
                }

                switchView(targetViewId);
                updateActiveMenu(item);
            });
        });
    }
    function switchView(viewId) {
        const restrictedViews = ['agents', 'parametres'];
        const currentUser = state.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (restrictedViews.includes(viewId) && currentUser.role !== 'admin') {
            viewId = 'accueil';
        }
        state.currentView = viewId;
        state.views.forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden-view');
                view.classList.add('active-view');
            } else {
                view.classList.remove('active-view');
                view.classList.add('hidden-view');
            }
        });

        const titles = {
            'accueil': 'Tableau de Bord',
            'saisie': 'Saisie d\'Opération',
            'tiers': 'Gestion des Tiers',
            'rh': 'Gestion Administrative RH',
            'acomptes-prets': 'Suivi des Acomptes & Prêts',
            'rapports': 'Rapports & États',
            'stats': 'Statistiques',
            'codes': 'Codes Comptables',
            'modeles': 'Modèles de Saisie',
            'agents': 'Gestion des Agents',
            'parametres': 'Paramètres Généraux',
            'import': 'Importation'
        };

        if (state.pageTitle) {
            state.pageTitle.textContent = titles[viewId] || 'CaissePro';
        }

        // View specific refresh
        if (viewId === 'accueil') updateDashboard();
        if (viewId === 'rh') renderRHView();
        if (viewId === 'acomptes-prets') renderAcomptesPretsView();
        if (viewId === 'tiers') renderPartners();
        if (viewId === 'codes') renderCodes();
        if (viewId === 'agents') renderAgents();
        if (viewId === 'stats') renderStats();
        if (viewId === 'modeles') {
            populateSelects();
            renderModels();
        }
        if (viewId === 'import') renderImportHistory();

        // Scroll management
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.scrollTop = 0;

        localStorage.setItem('currentView', viewId);
    }
    window.switchView = switchView; // Make switchView global

    function setupRHTabs() {
        // Tab switching logic
        const tabBtns = document.querySelectorAll('.rh-tab-btn');
        const tabContents = document.querySelectorAll('.rh-tab-content');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.rhTab;
                tabBtns.forEach(b => {
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = 'var(--text-muted)';
                    b.classList.remove('active');
                });
                btn.style.borderBottom = '3px solid var(--primary-color)';
                btn.style.color = 'var(--primary-color)';
                btn.classList.add('active');
                tabContents.forEach(c => c.style.display = 'none');
                const targetEl = document.getElementById(`rh-tab-${target}`);
                if (targetEl) targetEl.style.display = 'block';
            };
        });
        const btnPrintGroupAdvances = document.getElementById('btn-print-group-advances');
        if (btnPrintGroupAdvances) {
            btnPrintGroupAdvances.onclick = () => printGroupedAdvances();
        }

        const btnNewLoan = document.getElementById('btn-new-loan');
        if (btnNewLoan) {
            btnNewLoan.onclick = () => {
                document.getElementById('add-loan-form-container').style.display = 'block';
            };
        }

        const btnCancelLoan = document.getElementById('btn-cancel-loan');
        if (btnCancelLoan) {
            btnCancelLoan.onclick = () => {
                document.getElementById('add-loan-form-container').style.display = 'none';
            };
        }

        // Refresh buttons
        const btnRefreshLoans = document.getElementById('btn-refresh-loans');
        if (btnRefreshLoans) btnRefreshLoans.onclick = () => {
            renderLoans();
            btnRefreshLoans.classList.add('fa-spin');
            setTimeout(() => btnRefreshLoans.classList.remove('fa-spin'), 500);
        };
        const btnRefreshAdvances = document.getElementById('btn-refresh-advances');
        if (btnRefreshAdvances) btnRefreshAdvances.onclick = () => {
            renderAdvances();
            btnRefreshAdvances.classList.add('fa-spin');
            setTimeout(() => btnRefreshAdvances.classList.remove('fa-spin'), 500);
        };
    }

    function printGroupedAdvances() {
        const targetMonth = document.getElementById('advances-filter-month').value;
        const targetEmployee = document.getElementById('advances-filter-employee').value.trim();
        const currentCaisse = state.currentCaisse || 'general';

        // Prompt for choice
        const choice = confirm("Voulez-vous filtrer uniquement sur le MOIS DE D?DUCTION s?lectionn? (" + (targetMonth || "Tous") + ") ?\n\nOK = Oui, seulement ce mois\nANNULER = Non, afficher l'ensemble des acomptes (filtr?s par employ? si sp?cifi?)");

        let filtered = appData.transactions.filter(t =>
            t.category === 'ACOMPTE' &&
            (currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse)
        );

        if (choice) {
            // Filter by month
            if (targetMonth) {
                filtered = filtered.filter(t => t.advanceMonth === targetMonth);
            }
        }

        if (targetEmployee) {
            filtered = filtered.filter(t => t.partner && t.partner.toLowerCase().includes(targetEmployee.toLowerCase()));
        }

        if (filtered.length === 0) {
            alert("Aucun acompte trouv? pour les crit?res s?lectionn?s.");
            return;
        }

        const total = filtered.reduce((sum, t) => sum + t.amount, 0);
        const employeeTitle = targetEmployee ? ` pour ${targetEmployee}` : "";
        const periodTitle = choice && targetMonth ? ` - Mois de d?duction: ${targetMonth}` : " - Historique complet";

        let printContent = `
            <div style="font-family: 'Inter', sans-serif; padding: 20px;">
                <h2 style="text-align:center;">?tat Group? des Acomptes${employeeTitle}</h2>
                <p style="text-align:center; color: #64748b;">${periodTitle}</p>
                <hr>
                <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">Date Octroi</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">B?n?ficiaire</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:right;">Montant</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:center;">Mois Pr?l.</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:center;">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(t => `
                            <tr>
                                <td style="border:1px solid #e2e8f0; padding:8px;">${formatDate(t.date)}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px;">${t.partner || '-'}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px; text-align:right; font-weight:700;">${formatCurrency(t.amount)}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px; text-align:center; font-weight:700; color:#b91c1c;">${t.advanceMonth || '-'}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">${t.isDeducted ? 'D?duit' : 'En cours'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background:#f8fafc; font-weight:800;">
                            <td colspan="2" style="border:1px solid #e2e8f0; padding:10px; text-align:right;">TOTAL CUMUL? :</td>
                            <td style="border:1px solid #e2e8f0; padding:10px; text-align:right; color:#1e1b4b; font-size:1.1rem;">${formatCurrency(total)}</td>
                            <td colspan="2" style="border:1px solid #e2e8f0;"></td>
                        </tr>
                    </tfoot>
                </table>
                <div style="margin-top:40px; text-align:right;">
                    <p>Fait ? ........................, le ${new Date().toLocaleDateString('fr-FR')}</p>
                    <br><br>
                    <p><strong>L'Administration</strong></p>
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Impression Group?e Acomptes</title></head><body>' + printContent + '</body></html>');
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    function printGroupedLoans() {
        // Loans are usually handled by status (Ongoing/Terminated)
        const targetEmployee = prompt("Nom de l'employeur pour filtrer les pr?ts (laisser vide pour TOUS) :");
        const currentCaisse = state.currentCaisse || 'general';

        let filtered = appData.transactions.filter(t =>
            t.category === 'PR?T' &&
            (currentCaisse === 'all' || (t.caisse || 'general') === currentCaisse)
        );

        if (targetEmployee) {
            filtered = filtered.filter(t => t.partner && t.partner.toLowerCase().includes(targetEmployee.trim().toLowerCase()));
        }

        if (filtered.length === 0) {
            alert("Aucun pr?t trouv?.");
            return;
        }

        const total = filtered.reduce((sum, t) => sum + t.amount, 0);

        let printContent = `
            <div style="font-family: 'Inter', sans-serif; padding: 20px;">
                <h2 style="text-align:center;">?tat Group? des Pr?ts Personnel</h2>
                <hr>
                <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">Date</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">B?n?ficiaire</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:right;">Montant</th>
                            <th style="border:1px solid #e2e8f0; padding:8px; text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(t => `
                            <tr>
                                <td style="border:1px solid #e2e8f0; padding:8px;">${formatDate(t.date)}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px;">${t.partner || '-'}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px; text-align:right; font-weight:700;">${formatCurrency(t.amount)}</td>
                                <td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">${t.isSettled ? 'Rembours?' : 'En cours'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background:#f8fafc; font-weight:800;">
                            <td colspan="2" style="border:1px solid #e2e8f0; padding:10px; text-align:right;">TOTAL :</td>
                            <td style="border:1px solid #e2e8f0; padding:10px; text-align:right; color:#1e1b4b; font-size:1.1rem;">${formatCurrency(total)}</td>
                            <td style="border:1px solid #e2e8f0;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Impression Group?e Pr?ts</title></head><body>' + printContent + '</body></html>');
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
    // --- Transfer logic ---
    function setupTransferForm() {
        const transferForm = document.getElementById('transfer-form');
        if (transferForm) {
            transferForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('transfer-amount').value);
                if (amount && amount > 0) {
                    const date = new Date().toISOString().split('T')[0]; // Today
                    const timestamp = Date.now();
                    // 1. Withdrawal from Secondary
                    const txOut = {
                        id: timestamp,
                        type: 'expense',
                        date: date,
                        amount: amount,
                        category: 'Transfert Interne',
                        details: 'reversement vers G?n?rale',
                        partner: 'Interne',
                        caisse: 'secondary'
                    };
                    // 2. Deposit to General
                    const txIn = {
                        id: timestamp + 1,
                        type: 'income',
                        date: date,
                        amount: amount,
                        category: 'Transfert Interne',
                        details: 'reversement de Secondaire',
                        partner: 'Interne',
                        caisse: 'general'
                    };
                    appData.transactions.push(txOut);
                    appData.transactions.push(txIn);
                    saveData();
                    updateDashboard();
                    e.target.reset();
                    document.getElementById('transfer-form-container').style.display = 'none';
                    alert('reversement effectu? avec succ?s !');
                } else {
                    alert('Montant invalide.');
                }
            });
        }
    }
    // --- Param logic ---
    function setupParamListeners() {
        const btnreset = document.getElementById('btn-reset-data');
        if (btnreset) {
            btnreset.addEventListener('click', () => {
                if (confirm('?tes-vous s?r de vouloir tout effacer ? Cette action est irr?versible.')) {
                    localStorage.removeItem(DB_KEY);
                    location.reload();
                }
            });
        }
        const btnImport = document.getElementById('btn-Import-data');
        const ImportFile = document.getElementById('Import-file');
        if (btnImport && ImportFile) {
            btnImport.onclick = () => ImportFile.click();
            ImportFile.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (confirm('Importer ces donn?es ? Cela remplacera vos donn?es actuelles.')) {
                            appData = data;
                            saveData();
                            location.reload();
                        }
                    } catch (err) {
                        alert('Erreur lors de la lecture du fichier.');
                    }
                };
                reader.readAsText(file);
            };
        }
        const btnExcel = document.getElementById('btn-export-excel');
        if (btnExcel) btnExcel.onclick = exportToCSV;
        const btnPdf = document.getElementById('btn-export-pdf');
        if (btnPdf) btnPdf.onclick = () => window.print();
    }
    function setupHistoryListeners() {
        const btnPrintBatch = document.getElementById('btn-print-batch');
        const startInput = document.getElementById('hist-start-date');
        const endInput = document.getElementById('hist-end-date');

        // Initialize dates: 1st of month to today
        if (startInput && endInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            startInput.value = `${year}-${month}-01`;
            endInput.value = now.toISOString().split('T')[0];
        }

        if (btnPrintBatch) {
            btnPrintBatch.onclick = () => {
                const start = startInput.value;
                const end = endInput.value;
                if (!start || !end) {
                    alert('Veuillez sélectionner une plage de dates.');
                    return;
                }
                printBatch(start, end);
            };
        }

        const btnExcelHist = document.getElementById('btn-export-excel-saisie');
        if (btnExcelHist) {
            btnExcelHist.onclick = () => {
                const start = startInput.value;
                const end = endInput.value;
                exportSaisieHistoryToExcel(start, end);
            };
        }

        const btnPdfHist = document.getElementById('btn-export-pdf-saisie');
        if (btnPdfHist) {
            btnPdfHist.onclick = () => {
                if (btnPrintBatch) btnPrintBatch.click();
            };
        }

        // Setup bulk selection listeners
        const selectAllHistory = document.getElementById('selectAllHistory');
        if (selectAllHistory) {
            selectAllHistory.addEventListener('change', (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('.saisie-row-cb').forEach(cb => cb.checked = checked);
            });
        }

        const btnDeleteBatchSaisie = document.getElementById('btn-delete-batch-saisie');
        if (btnDeleteBatchSaisie) {
            btnDeleteBatchSaisie.addEventListener('click', () => {
                const selected = document.querySelectorAll('.saisie-row-cb:checked');
                if (selected.length === 0) {
                    alert('Veuillez sélectionner des transactions à supprimer.');
                    return;
                }
                if (confirm(`Voulez-vous vraiment supprimer les ${selected.length} transactions sélectionnées ?`)) {
                    const idsToDelete = Array.from(selected).map(cb => Number(cb.getAttribute('data-id')) || cb.getAttribute('data-id'));
                    appData.transactions = appData.transactions.filter(t => !idsToDelete.includes(t.id));
                    saveData();
                    renderSaisieHistory();
                    if (typeof updateDashboard === 'function') updateDashboard();
                    alert(`${selected.length} transactions supprimées.`);
                    if (selectAllHistory) selectAllHistory.checked = false;
                }
            });
        }

        // Shift-click logic for checkboxes
        const saisieBody = document.getElementById('saisie-history-body');
        if (saisieBody) {
            let lastChecked = null;
            saisieBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('saisie-row-cb')) {
                    if (!lastChecked) {
                        lastChecked = e.target;
                        return;
                    }
                    if (e.shiftKey) {
                        const checkboxes = Array.from(document.querySelectorAll('.saisie-row-cb'));
                        const start = checkboxes.indexOf(e.target);
                        const end = checkboxes.indexOf(lastChecked);
                        const [min, max] = [Math.min(start, end), Math.max(start, end)];
                        checkboxes.slice(min, max + 1).forEach(cb => cb.checked = lastChecked.checked);
                    }
                    lastChecked = e.target;
                }
            });
        }

        if (startInput) startInput.onchange = renderSaisieHistory;
        if (endInput) endInput.onchange = renderSaisieHistory;

        renderSaisieHistory(); // Initial render
    }
    function setupInputRecognition() {
        const fields = ['partner', 'executor', 'model-code'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const handler = (e) => {
                const val = e.target.value.trim().toUpperCase();
                const employees = appData.employees || [];
                const partners = appData.partners || [];
                const codes = appData.codes || [];
                let found = false;
                // employee Abbreviation Check
                const emp = employees.find(e => (e.abbr && e.abbr.toUpperCase() === val) || e.name.toUpperCase() === val);
                if (emp) {
                    if (e.type === 'change' || e.type === 'blur') {
                        e.target.value = emp.name; // Auto-replace with full name
                    }
                    found = true;
                }
                // 2. Partner Name Check
                if (!found) {
                    const p = partners.find(p => p.name.toUpperCase() === val);
                    if (p) found = true;
                }
                // 3. Code Check (for code fields)
                if (!found && id === 'model-code') {
                    const c = codes.find(c => c.short.toUpperCase() === val);
                    if (c) found = true;
                }
                // Visual Feedback
                if (found && val) {
                    e.target.classList.add('input-success');
                } else {
                    e.target.classList.remove('input-success');
                }
            };
            el.addEventListener('input', handler);
            el.addEventListener('blur', handler);
            el.addEventListener('change', handler);
        });
    }
    function renderHistory(filter = null) {
        const tbody = document.getElementById('hist-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        // Sort by date descending and exclude initial balances
        let sorted = [...appData.transactions]
            .filter(t => t.category !== 'Dette Initiale' && t.category !== 'Cr?ance Initiale')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        if (filter) {
            const upFilter = filter.toUpperCase();
            sorted = sorted.filter(t => {
                // Specialized type filter
                if (upFilter === 'TYPE:INCOME') return t.type === 'income';
                if (upFilter === 'TYPE:EXPENSE') return t.type === 'expense';
                const val = upFilter.toLowerCase();
                return (t.partner || '').toLowerCase().includes(val) ||
                    (t.category || '').toLowerCase().includes(val) ||
                    (t.details || '').toLowerCase().includes(val) ||
                    (t.amount.toString()).includes(val) ||
                    (t.id.toString()).includes(val) ||
                    (t.type || '').toUpperCase() === upFilter;
            });
        }
        sorted.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${t.id}</small></td>
                <td>
                    ${formatDate(t.date)}
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${t.time || ''}</div>
                </td>
                <td><span class="badge ${t.type === 'income' ? 'client' : 'supplier'}">${t.type === 'income' ? 'ENTR?E' : 'SORTIE'}</span></td>
                <td>
                    <div style="font-weight:700;">${t.partner || 'Divers'}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${t.category} ${t.details ? '- ' + t.details : ''}</div>
                </td>
                <td style="font-weight:800; color:${t.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                    ${formatCurrency(t.amount)}
                </td>
                <td><small>${(t.paymentMode || 'esp?ce').toUpperCase()} ${t.paymentref ? '(' + t.paymentref + ')' : ''}</small></td>
                <td>
                    <button class="btn-icon" onclick="printReceipt(${t.id})" title="Imprimer re?u">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn-icon" onclick="editTransaction(${t.id})" title="Modifier">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    ${t.isPrinted ? '<i class="fa-solid fa-check" style="color:var(--accent-success); font-size:0.7rem;" title="D?j? imprim?"></i>' : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    function printBatch(startDate, endDate) {
        const targets = appData.transactions.filter(t => t.date >= startDate && t.date <= endDate);
        if (!targets.length) {
            alert('Aucune op?ration trouv?e pour cette p?riode.');
            return;
        }
        const printArea = document.getElementById('print-area');
        const template = document.getElementById('receipt-template');
        printArea.innerHTML = '';
        targets.forEach(t => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.val-id').textContent = t.id;
            clone.querySelector('.val-date').textContent = t.date;
            clone.querySelector('.val-partner').textContent = t.partner || 'Divers';
            clone.querySelector('.val-category').textContent = t.category;
            clone.querySelector('.val-details').textContent = t.details || '';
            clone.querySelector('.val-amount').textContent = formatCurrency(t.amount);
            clone.querySelector('.val-method').textContent = t.paymentMode || 'espece';
            clone.querySelector('.val-ref').textContent = t.paymentref || '';
            clone.querySelector('.val-caisse').textContent = t.caisse || 'general';
            clone.querySelector('.val-user').textContent = t.user || 'Admin';
            // Footer specifically requested: Beneficiary / Executor
            const partnerFooter = clone.querySelector('.val-partner-footer');
            if (partnerFooter) partnerFooter.textContent = t.partner || t.executor || 'Divers';
            printArea.appendChild(clone);
            t.isPrinted = true;
        });
        window.print();
        saveData();
        renderHistory();
        if (state.currentView === 'prets') renderLoans();
    }
    function exportToCSV() {
        if (!appData.transactions.length) {
            alert('Aucune donn?e ? exporter.');
            return;
        }
        const headers = ['Date', 'Type', 'Cat?gorie', 'D?tails', 'Partenaire', 'Montant', 'Caisse', 'Mode', 'ref', 'Agent'];
        const rows = appData.transactions.map(t => [
            t.date, t.type, t.category, t.details, t.partner, t.amount, t.caisse, t.paymentMode, t.paymentref, t.user
        ]);
        let csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n"); // Use semicolon for Excel Fr and BOM for encoding
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `export_caisse_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    function updateActiveMenu(clickedItem) {
        state.menuItems.forEach(item => item.classList.remove('active'));
        clickedItem.classList.add('active');
    }
    function updateDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = new Date().toLocaleDateString('fr-Fr', options);
        }
    }
    // --- Saisie Modes logic ---
    function setupSmartSaisie() {
        const codeInput = document.getElementById('code-input');
        const detailsInput = document.getElementById('details');
        const categoryHidden = document.getElementById('category');
        if (!codeInput) return;
        codeInput.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            const found = appData.codes.find(c => c.short.toUpperCase() === val);
            if (found) {
                if (categoryHidden) categoryHidden.value = found.name;
                // Unique Label logic: code label becomes the detail
                if (detailsInput) {
                    detailsInput.value = found.name;
                }
                // Auto-set Type if not mixed
                if (found.type === 'income' || found.type === 'expense') {
                    const typeradio = document.querySelector(`input[name="type"][value="${found.type}"]`);
                    if (typeradio) typeradio.checked = true;
                }
            } else {
                if (categoryHidden) categoryHidden.value = '';
            }
        });
        // Date filter for Saisie history
        const histDateInput = document.getElementById('saisie-hist-date');
        if (histDateInput) {
            histDateInput.valueAsDate = new Date();
            histDateInput.onchange = () => renderSaisieHistory();
        }
        // Batch Print in Saisie
        const printStart = document.getElementById('saisie-print-start');
        const printEnd = document.getElementById('saisie-print-end');
        const btnPrintBatch = document.getElementById('btn-print-batch-saisie');
        if (printStart && !printStart.value) printStart.valueAsDate = new Date();
        if (printEnd && !printEnd.value) printEnd.valueAsDate = new Date();
        if (btnPrintBatch) {
            btnPrintBatch.onclick = () => {
                const start = printStart.value;
                const end = printEnd.value;
                if (!start || !end) {
                    alert('S?lectionnez une plage de dates.');
                    return;
                }
                printBatch(start, end);
            };
        }
    }
    function setupModelAutomation() {
        const modelCodeInput = document.getElementById('model-code');
        const modelDetailsInput = document.getElementById('model-details-input'); // fixed ID
        const modelCatHidden = document.getElementById('model-category');
        if (modelCodeInput) {
            modelCodeInput.addEventListener('input', (e) => {
                const val = e.target.value.toUpperCase();
                const found = appData.codes.find(c => c.short.toUpperCase() === val);
                if (found) {
                    if (modelCatHidden) modelCatHidden.value = found.name;
                    if (modelDetailsInput) modelDetailsInput.value = found.name;
                }
            });
        }
    }
    function setupV4Toggles() {
        const typeBtns = document.querySelectorAll('.type-btn');
        const radios = {
            'income': document.getElementById('type-income'),
            'expense': document.getElementById('type-expense')
        };

        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.value;
                typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (radios[val]) {
                    radios[val].checked = true;
                    // Trigger mode logic if needed
                    radios[val].dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }

    function setupSaisieModes() {
        const modeBtns = document.querySelectorAll('.mode-btn');
        if (!modeBtns.length) return;

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                const config = {
                    mode: mode, // CRITICAL: for tab highlight
                    short: mode === 'acompte' ? 'AC' : (mode === 'pret' ? 'PR' : ''),
                    category: mode === 'acompte' ? 'ACOMPTE' : (mode === 'pret' ? 'PRÊT' : ''),
                    showBeneficiary: mode !== 'libre' && mode !== 'sans-tiers',
                    showCharge: mode === 'tiers',
                    beneficiaryType: (mode === 'acompte' || mode === 'pret') ? 'employee' : 'tiers'
                };

                // Force visibility update
                if (typeof window.updateVisibility === 'function') {
                    window.updateVisibility(config);
                }

                // Auto-fill defaults FORCING update
                const codeInput = document.getElementById('code-input');
                const detailsInput = document.getElementById('details');
                if (codeInput) {
                    if (mode === 'acompte') { codeInput.value = 'AC'; if (detailsInput) detailsInput.value = 'ACOMPTE SUR SALAIRE'; }
                    else if (mode === 'pret') { codeInput.value = 'PR'; if (detailsInput) detailsInput.value = 'PRÊT SUR SALAIRE'; }
                    else if (mode === 'libre') { codeInput.value = ''; if (detailsInput) detailsInput.value = ''; }
                }

                const categoryHidden = document.getElementById('category');
                if (categoryHidden) {
                    if (mode === 'acompte') categoryHidden.value = 'ACOMPTE';
                    else if (mode === 'pret') categoryHidden.value = 'PRÊT';
                    else categoryHidden.value = '';
                }
            });
        });
    }

    function setupMultiBeneficiary() {
        const toggleBtn = document.getElementById('toggle-multi-beneficiary');
        const multiContainer = document.getElementById('multi-beneficiary-container');
        const singleWrap = document.getElementById('single-beneficiary-wrap');
        const listContainer = document.getElementById('multi-beneficiary-list');
        const addRowBtn = document.getElementById('add-beneficiary-row');
        const amountInput = document.getElementById('amount');

        if (!toggleBtn || !multiContainer) return;

        toggleBtn.addEventListener('click', () => {
            const isHidden = multiContainer.style.display === 'none';
            const activeMode = document.querySelector('.mode-btn.active')?.dataset.mode;

            if (isHidden) {
                if (activeMode === 'acompte' || activeMode === 'pret') {
                    openEmployeeSelectionModal();
                } else {
                    activateMultiMode();
                    addRow();
                }
            } else {
                deactivateMultiMode();
            }
        });

        function activateMultiMode() {
            if (multiContainer) multiContainer.style.display = 'block';
            if (singleWrap) singleWrap.style.display = 'none';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fa-solid fa-user"></i> REPASSER EN SAISIE UNIQUE';
                toggleBtn.style.background = 'var(--primary-color)';
                toggleBtn.style.color = 'white';
            }

            const singlePartner = document.getElementById('partner');
            const singleEmployee = document.getElementById('employee-beneficiary');
            if (singlePartner) { singlePartner.value = 'MULTIPLE'; singlePartner.disabled = true; }
            if (singleEmployee) { singleEmployee.value = 'MULTIPLE'; singleEmployee.disabled = true; }
            if (listContainer) listContainer.innerHTML = '';
        }

        function deactivateMultiMode() {
            if (multiContainer) multiContainer.style.display = 'none';
            if (singleWrap) singleWrap.style.display = 'flex';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fa-solid fa-users"></i> ACTIVER SAISIE MULTIPLE';
                toggleBtn.style.background = 'none';
                toggleBtn.style.color = 'var(--primary-color)';
            }

            const singlePartner = document.getElementById('partner');
            const singleEmployee = document.getElementById('employee-beneficiary');
            const amountInput = document.getElementById('amount');
            if (singlePartner) { singlePartner.value = ''; singlePartner.disabled = false; }
            if (singleEmployee) { singleEmployee.value = ''; singleEmployee.disabled = false; }
            if (amountInput) amountInput.value = '';
        }

        function openEmployeeSelectionModal() {
            const modal = document.getElementById('employee-selection-modal');
            const overlay = document.getElementById('employee-selection-overlay');
            const list = document.getElementById('employee-selection-list');
            if (!modal || !list) return;

            list.innerHTML = '';
            const employees = appData.employees || [];
            employees.forEach(emp => {
                const item = document.createElement('label');
                item.className = 'employee-check-item';
                item.innerHTML = `
                    <input type="checkbox" value="${emp.name}" class="emp-checkbox">
                    <span>${emp.name}</span>
                `;
                list.appendChild(item);
            });

            modal.style.display = 'flex';
            overlay.style.display = 'block';
        }

        window.closeEmployeeModal = function () {
            document.getElementById('employee-selection-modal').style.display = 'none';
            document.getElementById('employee-selection-overlay').style.display = 'none';
        }

        const confirmBtn = document.getElementById('confirm-employee-selection');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const checkboxes = document.querySelectorAll('.emp-checkbox:checked');
                if (checkboxes.length === 0) {
                    alert("Veuillez sélectionner au moins un employé.");
                    return;
                }
                activateMultiMode();
                checkboxes.forEach(cb => addRow(cb.value));
                closeEmployeeModal();
            };
        }

        function addRow(prefilledName = '') {
            const div = document.createElement('div');
            div.className = 'multi-beneficiary-row';
            const activeMode = document.querySelector('.mode-btn.active')?.dataset.mode;
            const isAcompte = activeMode === 'acompte';

            div.innerHTML = `
                <input type="text" class="multi-name" list="employees-list" value="${prefilledName}" placeholder="Bénéficiaire..." style="flex: 2;">
                <input type="number" class="multi-amount" placeholder="Montant" style="flex: 1;">
                ${isAcompte ? `<input type="month" class="multi-month" title="Mois déduction" style="flex: 1.2;">` : ''}
                <button type="button" class="remove-row" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px;"><i class="fa-solid fa-trash-can"></i></button>
            `;

            div.querySelector('.remove-row').onclick = () => {
                div.remove();
                calculateTotal();
                if (listContainer.children.length === 0) deactivateMultiMode();
            };

            div.querySelector('.multi-amount').oninput = calculateTotal;

            if (isAcompte) {
                const monthInput = div.querySelector('.multi-month');
                monthInput.onchange = function () {
                    const newVal = this.value;
                    let foundCurrent = false;
                    listContainer.querySelectorAll('.multi-beneficiary-row').forEach(row => {
                        if (row === div) { foundCurrent = true; return; }
                        if (foundCurrent) {
                            const nextMonthInput = row.querySelector('.multi-month');
                            if (nextMonthInput) nextMonthInput.value = newVal;
                        }
                    });
                };
            }

            listContainer.appendChild(div);
            calculateTotal();
        }

        function calculateTotal() {
            let total = 0;
            listContainer.querySelectorAll('.multi-amount').forEach(input => {
                total += parseFloat(input.value) || 0;
            });
            const totalDisplay = document.getElementById('multi-total-display');
            if (totalDisplay) totalDisplay.textContent = total.toLocaleString() + ' F';
            if (amountInput) amountInput.value = total;
        }

        if (addRowBtn) addRowBtn.onclick = () => addRow();
    }

    function setupPaymentLogic() {
        const payModeSelect = document.getElementById('payment-mode');
        const refGroup = document.getElementById('payment-ref-group');
        const refInput = document.getElementById('payment-ref');
        const refHint = document.getElementById('payment-ref-hint');
        if (!payModeSelect || !refGroup) return;

        const updateRefState = () => {
            const mode = payModeSelect.value;
            const mobileMoneyModes = ['wave', 'om', 'mtn', 'moov'];
            const isMobileMoney = mobileMoneyModes.includes(mode);

            if (mode === 'cash') {
                refGroup.style.display = 'none';
                if (refInput) {
                    refInput.removeAttribute('required');
                    refInput.style.borderColor = '#94a3b8';
                }
                if (refHint) refHint.style.display = 'none';
            } else {
                refGroup.style.display = 'block';
                if (isMobileMoney) {
                    if (refInput) {
                        refInput.setAttribute('required', 'true');
                        refInput.style.borderColor = '#ef4444'; // Emphasis for MM
                    }
                    if (refHint) refHint.style.display = 'block';
                } else {
                    if (refInput) {
                        refInput.removeAttribute('required');
                        refInput.style.borderColor = '#94a3b8';
                    }
                    if (refHint) refHint.style.display = 'none';
                }
            }
        };

        payModeSelect.onchange = updateRefState;
        updateRefState(); // Initial sync
    }

    function setupEmployeeSearch() {
        const inputs = [
            document.getElementById('agent-remettant'),
            document.getElementById('agent-REMETTANT'), // Support lowercase/uppercase IDs
            document.getElementById('executor'),
            document.getElementById('employee-beneficiary')
        ];

        inputs.forEach(input => {
            if (!input) return;

            // Raccourci Tab pour les abréviations
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const val = input.value.trim().toUpperCase();
                    if (!val) return;

                    // Chercher d'abord par abréviation exacte
                    const empByAbbr = (appData.employees || []).find(emp =>
                        emp.abbr && emp.abbr.toUpperCase() === val
                    );

                    if (empByAbbr) {
                        input.value = empByAbbr.name;
                        // On ne bloque pas forcément l'événement Tab pour permettre le passage au champ suivant
                    }
                }
            });

            // Au flou du champ (sortie), on complète si l'allusion est unique par le nom
            input.addEventListener('blur', () => {
                const val = input.value.trim().toUpperCase();
                if (!val) return;

                // Si c'est déjà une abréviation traitée par Tab, ou si on veut aussi le faire au Blur
                const empByAbbr = (appData.employees || []).find(emp =>
                    emp.abbr && emp.abbr.toUpperCase() === val
                );
                if (empByAbbr) {
                    input.value = empByAbbr.name;
                    return;
                }

                // On cherche les employés qui commencent par cette saisie (Nom)
                const matches = (appData.employees || []).filter(emp =>
                    emp.name.toUpperCase().startsWith(val)
                );

                if (matches.length === 1) {
                    input.value = matches[0].name;
                }
            });
        });
    }

    function setupRHCalculators() {
        const amount = document.getElementById('amount');
        const duration = document.getElementById('loan-duration');
        const monthly = document.getElementById('loan-monthly');
        const endDisplay = document.getElementById('loan-end-date-display');
        const dateInput = document.getElementById('date');
        if (!amount || !duration || !monthly) return;
        const calculate = (trigger) => {
            const amt = parseFloat(amount.value) || 0;
            const dur = parseInt(duration.value) || 0;
            const mon = parseFloat(monthly.value) || 0;
            if (trigger === 'duration' && amt > 0 && dur > 0) {
                monthly.value = Math.round(amt / dur);
            } else if (trigger === 'monthly' && amt > 0 && mon > 0) {
                duration.value = Math.round(amt / mon);
            } else if (trigger === 'amount' && dur > 0) {
                monthly.value = Math.round(amt / dur);
            }
            // Update End Date
            const dInput = dateInput.value;
            const dDur = parseInt(duration.value) || 0;
            if (dInput && dDur > 0) {
                const d = new Date(dInput);
                d.setMonth(d.getMonth() + dDur);
                const options = { month: 'long', year: 'numeric' };
                endDisplay.value = d.toLocaleDateString('fr-Fr', options);
            } else {
                endDisplay.value = '-';
            }
        };
        amount.addEventListener('input', () => calculate('amount'));
        duration.addEventListener('input', () => calculate('duration'));
        monthly.addEventListener('input', () => calculate('monthly'));
        if (dateInput) dateInput.addEventListener('change', () => calculate('date'));
    }

    function printEmployeeState(empName) {
        // Détermine si on est dans l'onglet Acompte ou Prêt
        const currentTab = document.querySelector('.finance-tab.active');
        const rhMode = currentTab ? currentTab.dataset.mode : 'ACOMPTE';

        // Appelle la fonction d'impression consolidée
        if (typeof printPersonnelState === 'function') {
            printPersonnelState(rhMode, 'individual', empName, '', '');
        } else {
            console.error("Erreur: printPersonnelState n'est pas définie.");
        }
    }

    // --- Keyboard Shortcuts ---
    function setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (state.currentView !== 'accueil') {
                    switchView('accueil');
                    updateActiveMenu(document.querySelector('[data-target="accueil"]'));
                }
            }
        });
    }
    function printReceipt(id) {
        const t = appData.transactions.find(tx => tx.id === id);
        if (!t) return;
        const printArea = document.getElementById('print-area');
        document.body.classList.remove('is-landscape-print');
        printArea.className = '';
        const template = document.getElementById('receipt-template');

        // Injecter un style spécifique pour forcer 3 reçus par page A4 portrait avec pointillés
        printArea.innerHTML = `
            <style>
                @media print {
                    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
                    #print-area { display: block !important; padding: 0 !important; margin: 0 !important; }
                    .receipt-sheet {
                        width: 210mm;
                        height: 297mm;
                        margin: 0 auto;
                        display: flex;
                        flex-direction: column;
                    }
                    .receipt-container { 
                        height: 99mm; /* Un tiers de 297mm approx */
                        box-sizing: border-box;
                        padding: 10mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        position: relative;
                    }
                    /* Trait pointillé de découpe entre les reçus */
                    .receipt-container:not(:last-child)::after {
                        content: "";
                        position: absolute;
                        bottom: 0;
                        left: 5mm;
                        right: 5mm;
                        border-bottom: 2px dashed #94a3b8;
                    }
                    .receipt { 
                        height: 100%;
                        max-height: 85mm;
                        margin: 0 !important;
                        padding: 20px !important;
                        border: 2px solid #1e293b !important;
                        border-radius: 8px;
                        background: #fcfaf2 !important;
                    }
                    .receipt * { color: #1e293b !important; }
                }
            </style>
            <div class="receipt-sheet"></div>
        `;

        const sheet = printArea.querySelector('.receipt-sheet');

        const comp = appData.company || {};

        for (let i = 0; i < 3; i++) {
            const clone = template.content.cloneNode(true);

            // Branding
            clone.querySelector('.val-comp-name').textContent = comp.name || 'Ma Société';
            clone.querySelector('.val-comp-details').textContent = `${comp.sigle || ''} ${comp.number ? ' - ' + comp.number : ''} | ${comp.address || ''}`;

            const logoImg = clone.querySelector('.val-logo');
            if (comp.logo && logoImg) {
                logoImg.src = comp.logo;
                logoImg.style.display = 'block';
            } else if (logoImg) {
                logoImg.style.display = 'none'; // Hide if no logo
            }

            // Transaction Data
            clone.querySelector('.val-id').textContent = t.pieceNumber || t.id;
            clone.querySelector('.val-date').textContent = formatDate(t.date);
            clone.querySelector('.val-partner').textContent = t.partner || '-';
            clone.querySelector('.val-remettant').textContent = t.agentRemettant || '-';
            clone.querySelector('.val-executor').textContent = t.executor || '-';
            clone.querySelector('.val-category').textContent = t.category;
            clone.querySelector('.val-details').textContent = t.details || '';
            clone.querySelector('.val-amount').textContent = formatCurrency(t.amount);
            clone.querySelector('.val-method').textContent = t.paymentMode || 'espèce';
            clone.querySelector('.val-ref').textContent = t.paymentref || '';
            clone.querySelector('.val-caisse').textContent = t.caisse || 'général';
            clone.querySelector('.val-user').textContent = t.user || 'Admin';
            clone.querySelector('.val-obs').textContent = t.observation || '-';

            // Month of deduction (specific to Acomptes)
            const monthRow = clone.querySelector('.val-row-month');
            const monthVal = clone.querySelector('.val-advance-month');
            if (t.advanceMonth && monthRow) {
                monthRow.style.display = 'block';
                monthVal.textContent = t.advanceMonth;
            }

            if (i === 1) clone.querySelector('.print-indicator').textContent = 'Souche Comptable';
            if (i === 2) clone.querySelector('.print-indicator').textContent = 'Copie Archives';

            const container = document.createElement('div');
            container.className = 'receipt-container';
            container.appendChild(clone);
            sheet.appendChild(container);
        }
        window.print();
        t.isPrinted = true;
        saveData();
        renderSaisieHistory();
        if (state.currentView === 'prets') renderLoans();
    }
    function renderSaisieHistory() {
        const body = document.getElementById('saisie-history-body');
        const searchInput = document.getElementById('saisie-search');
        if (!body) return;
        const transactions = appData.transactions || [];
        const fiscalYearSelect = document.getElementById('fiscal-year-select');
        const selectedYear = fiscalYearSelect ? fiscalYearSelect.value : new Date().getFullYear().toString();
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let currentCaisse = document.getElementById('global-caisse-select') ? document.getElementById('global-caisse-select').value : 'general';
        if (!currentCaisse) currentCaisse = 'general'; // Safety check
        const startFilter = document.getElementById('hist-start-date')?.value;
        const endFilter = document.getElementById('hist-end-date')?.value;

        // Filter logic
        let filtered = transactions.filter(t => {
            // Exclude initial balances from history
            if (t.category === 'Dette Initiale' || t.category === 'Créance Initiale') return false;

            // Strict Caisse Filter - ISOlATION
            const tCaisse = t.caisse || 'general';
            if (currentCaisse !== 'all' && tCaisse !== currentCaisse) return false;

            // Date Range Filter
            if (startFilter && t.date < startFilter) return false;
            if (endFilter && t.date > endFilter) return false;

            // Fiscal Year check (only if no date range is active or as secondary filter)
            if (!startFilter && !endFilter && t.date && t.date.split('-')[0] !== selectedYear) return false;
            // Search Filter
            if (searchTerm) {
                const searchStr = (
                    (t.date || '') + ' ' +
                    (t.code || '') + ' ' +
                    (t.pieceNumber || '') + ' ' +
                    (t.category || '') + ' ' +
                    (t.details || '') + ' ' +
                    (t.partner || '') + ' ' +
                    (t.executor || '') + ' ' +
                    (t.agentRemettant || '') + ' ' +
                    (t.amount || '') + ' ' +
                    formatCurrency(t.amount)
                ).toUpperCase();

                if (searchTerm && !searchStr.includes(searchTerm.toUpperCase())) return false;
            }
            return true;
        });
        // Sort by date ascending
        filtered.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
            return dateB - dateA; // Newest first
        });
        if (filtered.length === 0) {
            body.innerHTML = `
            <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                <i class="fa-solid fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                Aucune transaction trouvée ${searchTerm ? 'pour "' + searchTerm + '"' : 'pour cette année'}
            </td>
                </tr>
            `;
            return;
        }
        body.innerHTML = filtered.map(t => {
            const isImport = t.details && t.details.includes('[Import]');
            const displayDetails = t.details ? t.details.replace('?? [Import]', '').replace('[Import]', '').trim() : '';
            return `
            <tr>
                    <td style="text-align: center;"><input type="checkbox" class="saisie-row-cb" data-id="${t.id}"></td>
                    <td>
                        <div style="font-weight:600;">${formatDate(t.date)}</div>
                        <small style="color:var(--text-muted)">${t.time || ''}</small>
                        ${isImport ? '<br><span style="background: #e0f2fe; color: #0284c7; padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-size: 0.65rem; font-weight: 700;"><i class="fa-solid fa-file-import"></i> Import</span>' : ''}
                    </td>
                    <td><span style="font-size:0.8rem; font-weight:700; color:#4f46e5;">${t.pieceNumber || '-'}</span></td>
                    <td>
                        <div style="font-weight:700; color:var(--primary-color);">${t.code || ''}</div>
                    </td>
                    <td>
                        <div style="font-size:0.85rem; font-weight:bold;">${t.category}</div>
                        ${displayDetails && displayDetails !== t.category ? `<div style="font-size:0.85rem; color: #1e293b;">${displayDetails}</div>` : ''}
                        ${t.observation ? `<div style="font-size:0.75rem; color: #64748b; font-style: italic; margin-top:4px;">Obs: ${t.observation}</div>` : ''}
                    </td>
                    <td>
                        <div style="font-weight:700;">${t.partner || '-'}</div>
                    </td>
                    <td>
                        ${t.agentRemettant ? `<div style="font-size:0.85rem;">${t.agentRemettant}</div>` : '-'}
                    </td>
                    <td>
                        ${t.executor ? `<div style="font-size:0.85rem; color:#64748b">${t.executor}</div>` : '-'}
                    </td>
                    <td style="color: ${t.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)'}; font-weight: 700; font-size: 1rem;">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency ? formatCurrency(t.amount) : t.amount}
                    </td>
                    <td>
                        <span class="badge" style="background:#f1f5f9; color:#475569;">${t.paymentMode}</span>
                        ${t.paymentref ? `<br><small style="color:var(--text-muted)">Réf: ${t.paymentref}</small>` : ''}
                    </td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-icon edit-transaction" data-id="${t.id}" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon print-transaction" data-id="${t.id}" title="Imprimer"><i class="fa-solid fa-print"></i></button>
                            <button class="btn-icon delete-transaction" data-id="${t.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        setupBatchHistoryActions();

        // Event Delegation for Saisie History
        body.onclick = (e) => {
            const editBtn = e.target.closest('.edit-transaction');
            const printBtn = e.target.closest('.print-transaction');
            const deleteBtn = e.target.closest('.delete-transaction');

            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                editTransaction(id);
            }
            if (printBtn) {
                const id = printBtn.getAttribute('data-id');
                printReceipt(parseInt(id));
            }
            if (deleteBtn) {
                const id = parseInt(deleteBtn.getAttribute('data-id'));
                if (confirm('Supprimer cette transaction ?')) {
                    const idx = appData.transactions.findIndex(t => t.id === id);
                    if (idx !== -1) {
                        appData.transactions.splice(idx, 1);
                        saveData();
                        renderSaisieHistory();
                    }
                }
            }
        };

        const saisieSearch = document.getElementById('saisie-search');
        if (saisieSearch && !saisieSearch.oninput) {
            saisieSearch.oninput = () => renderSaisieHistory();
        }
    }

    function setupBatchHistoryActions() {
        const body = document.getElementById('saisie-history-body');
        const selectAll = document.getElementById('selectAllHistory');
        const btnPrintBatch = document.getElementById('btn-print-batch');
        const btnDeleteBatch = document.getElementById('btn-delete-batch-saisie');
        const btnExportExcel = document.getElementById('btn-export-excel-saisie');

        if (selectAll && body) {
            selectAll.onclick = () => {
                const checkboxes = body.querySelectorAll('.saisie-row-cb');
                checkboxes.forEach(cb => cb.checked = selectAll.checked);
            };
        }

        if (btnPrintBatch) {
            btnPrintBatch.onclick = () => {
                const selectedIds = Array.from(body.querySelectorAll('.saisie-row-cb:checked'))
                    .map(cb => cb.dataset.id);

                if (selectedIds.length === 0) {
                    alert("Veuillez sélectionner au moins une transaction à imprimer.");
                    return;
                }
                printBatchReceipts(selectedIds);
            };
        }

        if (btnDeleteBatch) {
            btnDeleteBatch.onclick = () => {
                const selectedIds = Array.from(body.querySelectorAll('.saisie-row-cb:checked'))
                    .map(cb => parseInt(cb.dataset.id));

                if (selectedIds.length === 0) return;

                if (confirm(`Voulez-vous supprimer les ${selectedIds.length} transactions sélectionnées ?`)) {
                    appData.transactions = appData.transactions.filter(t => !selectedIds.includes(t.id));
                    saveData();
                    renderSaisieHistory();
                    showNotification(`${selectedIds.length} transactions supprimées`, "warning");
                }
            };
        }

        if (btnExportExcel) {
            btnExportExcel.onclick = () => {
                const start = document.getElementById('hist-start-date')?.value;
                const end = document.getElementById('hist-end-date')?.value;
                if (typeof exportSaisieHistoryToExcel === 'function') {
                    exportSaisieHistoryToExcel(start, end);
                }
            };
        }
    }

    function setupRapports() {
        const btnGen = document.getElementById('btn-generate-report');
        const btnPrint = document.getElementById('btn-print-report');
        const btnPrintRH = document.getElementById('btn-print-rh-report');

        if (btnGen) {
            btnGen.onclick = () => generateReport();
        }
        if (btnPrint) {
            btnPrint.onclick = () => window.print();
        }

        const btnExportExcelMonth = document.getElementById('btn-export-excel-month');
        const btnExportPdfMonth = document.getElementById('btn-export-pdf-month');
        if (btnExportExcelMonth) {
            btnExportExcelMonth.onclick = () => exportMonthly('excel');
        }
        if (btnExportPdfMonth) {
            btnExportPdfMonth.onclick = () => exportMonthly('pdf');
        }
    }
    function exportMonthly(format) {
        const month = parseInt(document.getElementById('exp-month').value);
        const year = parseInt(document.getElementById('exp-year').value);
        const filtered = appData.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
        if (!filtered.length) {
            alert('Aucune donn?e pour ce mois.');
            return;
        }
        if (format === 'excel') {
            const headers = ['Date', 'Type', 'Code/Cat', 'D?tails', 'Tiers', 'Entr?e', 'SORTIE', 'Mode', 'ref'];
            const rows = filtered.map(t => [
                t.date,
                t.type === 'income' ? 'ENTR?E' : 'SORTIE',
                t.category,
                t.details,
                t.partner || '-',
                t.type === 'income' ? t.amount : 0,
                t.type === 'expense' ? t.amount : 0,
                t.paymentMode,
                t.paymentref || '-'
            ]);
            let csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = Url.createObjectUrl(blob);
            link.download = `rapport_mensuel_${month + 1}_${year}.csv`;
            link.click();
        } else {
            // PDF export via print version
            // Prepare a temporary report view and print it
            const oldStart = document.getElementById('rep-start-date').value;
            const oldEnd = document.getElementById('rep-end-date').value;
            // Set first and last day of month
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            document.getElementById('rep-start-date').value = firstDay;
            document.getElementById('rep-end-date').value = lastDay;
            document.getElementById('rep-partner').value = '';
            generateReport();
            setTimeout(() => {
                window.print();
                // restore old values optional
            }, 500);
        }
    }
    function renderPinnedModels() {
        const container = document.getElementById('saisie-modes-container');
        if (!container) return;
        // remove old segments if any (we'll just clear or append carefully)
        // let's remove any btn-pinned class
        container.querySelectorAll('.btn-pinned').forEach(el => el.remove());
        const pinned = (appData.templates || []).filter(t => t.isPinned);
        pinned.forEach(t => {
            const wrapper = document.createElement('div');
            wrapper.className = 'btn-pinned-wrapper';

            const titleBtn = document.createElement('span');
            titleBtn.innerHTML = `📌 ${t.name}`;
            titleBtn.className = 'pinned-title';

            const mainBtn = document.createElement('button');
            mainBtn.type = 'button';
            mainBtn.className = 'mode-btn pinned-btn';
            mainBtn.innerHTML = `${t.code} <span style="opacity:0.7; font-size:0.6rem;">${t.amount ? formatCurrency(t.amount) : ''}</span>`;
            mainBtn.onclick = () => {
                // Appliquer le type
                const typeInput = document.querySelector(`input[name="type"][value="${t.type}"]`);
                if (typeInput) typeInput.checked = true;
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                const activeTypeBtn = document.getElementById(t.type === 'income' ? 'btn-type-income' : 'btn-type-expense');
                if (activeTypeBtn) activeTypeBtn.classList.add('active');

                // Remplir les champs
                const codeInp = document.getElementById('code-input');
                if (codeInp) codeInp.value = t.code || '';
                const catEl = document.getElementById('category');
                if (catEl) catEl.value = t.category;
                const detailsInp = document.getElementById('details');
                if (detailsInp) detailsInp.value = t.details || '';

                if (t.amount) {
                    const amtInp = document.getElementById('amount');
                    if (amtInp) amtInp.value = t.amount;
                }

                // Déterminer le mode si absent (compatibilité rétroactive)
                if (!t.mode) {
                    const upCode = (t.code || '').toUpperCase().trim();
                    const upCat = (t.category || '').toUpperCase().trim();
                    if (upCode === 'AC' || upCat.includes('ACOMPTE')) t.mode = 'acompte';
                    else if (upCode === 'PR' || upCat.includes('PRÊT')) t.mode = 'pret';
                    else t.mode = t.showBeneficiary !== false ? 'tiers' : 'libre';
                }

                // Appliquer la visibilité dynamique des champs
                updateVisibility(t);

                // Highlight le bouton actif
                container.querySelectorAll('.pinned-btn').forEach(b => b.classList.remove('active'));
                mainBtn.classList.add('active');
            };
            wrapper.appendChild(titleBtn);
            wrapper.appendChild(mainBtn);
            wrapper.className = 'btn-pinned btn-pinned-wrapper';
            container.appendChild(wrapper);
        });
    }
    function resetRapports() {
        const start = document.getElementById('rep-start-date');
        const end = document.getElementById('rep-end-date');
        if (start && !start.value) start.valueAsDate = new Date();
        if (end && !end.value) end.valueAsDate = new Date();
        const container = document.getElementById('report-result-container');
        if (container) container.style.display = 'none';
    }
    function generateReport() {
        const start = document.getElementById('rep-start-date').value;
        const end = document.getElementById('rep-end-date').value;
        const partner = document.getElementById('rep-partner').value;
        const container = document.getElementById('report-result-container');
        const header = document.getElementById('report-table-header');
        const body = document.getElementById('report-table-body');
        if (!start || !end) {
            alert('Veuillez s?lectionner une p?riode.');
            return;
        }
        let filtered = appData.transactions.filter(t => t.date >= start && t.date <= end);
        if (partner) {
            filtered = filtered.filter(t => t.partner === partner);
        }
        header.innerHTML = `
            <th>Date</th>
            <th>Libell?</th>
            <th>Tiers</th>
            <th>Entr?e</th>
            <th>SORTIE</th>
            <th>Solde</th>
        `;
        let balance = 0;
        body.innerHTML = filtered.map(t => {
            const income = t.type === 'income' ? t.amount : 0;
            const expense = t.type === 'expense' ? t.amount : 0;
            balance += (income - expense);
            return `
            <tr>
                    <td>${t.date}</td>
                    <td>${t.category}</td>
                    <td>${t.partner || '-'}</td>
                    <td style="color: var(--accent-success)">${income > 0 ? formatCurrency(income) : ''}</td>
                    <td style="color: var(--accent-danger)">${expense > 0 ? formatCurrency(expense) : ''}</td>
                    <td style="font-weight: bold;">${formatCurrency(balance)}</td>
                </tr>
            `;
        }).join('');
        if (container) container.style.display = 'block';
    }
    function setupCompanyProfile() {
        const companyForm = document.getElementById('company-profile-form');
        if (companyForm) {
            // load current data
            const c = appData.company || {};
            document.getElementById('comp-name').value = c.name || '';
            document.getElementById('comp-sigle').value = c.sigle || '';
            document.getElementById('comp-number').value = c.number || '';
            document.getElementById('comp-type').value = c.type || '';
            document.getElementById('comp-address').value = c.address || '';
            document.getElementById('comp-contact').value = c.contact || '';
            companyForm.onsubmit = (e) => {
                e.preventDefault();
                appData.company = {
                    name: document.getElementById('comp-name').value,
                    sigle: document.getElementById('comp-sigle').value,
                    number: document.getElementById('comp-number').value,
                    type: document.getElementById('comp-type').value,
                    address: document.getElementById('comp-address').value,
                    contact: document.getElementById('comp-contact').value
                };
                saveData();
                alert('Informations de la soci?t? mises ? jour !');
            };
        }
    }
    function setupMagicImport() {
        const input = document.getElementById('magic-input');
        const btnAnalyze = document.getElementById('btn-analyze-magic');
        const btnClear = document.getElementById('btn-clear-magic');
        const overlay = document.getElementById('magic-overlay');
        const btnCloseOverlay = document.getElementById('btn-close-overlay');
        const btnCancelImport = document.getElementById('btn-cancel-import');
        const btnConfirm = document.getElementById('btn-confirm-import');
        const fileInput = document.getElementById('magic-file-input');
        const dropZone = document.getElementById('magic-drop-zone');
        const btnDownloadTemplate = document.getElementById('btn-download-template');

        if (btnDownloadTemplate) {
            btnDownloadTemplate.onclick = () => {
                if (typeof XLSX === 'undefined') {
                    alert("La bibliothèque Excel n'est pas encore chargée.");
                    return;
                }
                const wb = XLSX.utils.book_new();
                const headers = [
                    ["Date (ex: 31/12/2026)", "Montant Entrée", "Montant Sortie", "Code (ex: VNT)", "Catégorie", "Détails (Optionnel)", "Partenaire (Tiers)", "Exécutant (Employé)"]
                ];
                const sampleRow = [
                    "01/01/2026", 50000, 0, "VNT", "Vente de services", "Facture F-001", "Client A", "Jean Dupont"
                ];
                const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

                ws['!cols'] = [
                    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 25 }
                ];

                XLSX.utils.book_append_sheet(wb, ws, "Modèle_Import");
                XLSX.writeFile(wb, "CaissePro_Modele_Import.xlsx");
            };
        }
        if (!input || !btnAnalyze) return;
        if (btnCloseOverlay) btnCloseOverlay.onclick = () => closeMagicOverlay();
        if (btnCancelImport) btnCancelImport.onclick = () => closeMagicOverlay();
        function closeMagicOverlay() {
            if (overlay) overlay.style.display = 'none';
            document.body.classList.remove('overlay-active');
        }
        function openMagicOverlay() {
            if (overlay) overlay.style.display = 'flex';
            document.body.classList.add('overlay-active');
            renderMagicreview();
        }
        // File Selection
        if (dropZone) {
            dropZone.onclick = () => fileInput.click();
            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = '#be185d'; };
            dropZone.ondragleave = () => { dropZone.style.borderColor = '#d8b4fe'; };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#d8b4fe';
                if (e.dataTransfer.files.length) handleMagicFile(e.dataTransfer.files[0]);
            };
        }
        if (fileInput) {
            fileInput.onchange = (e) => {
                if (e.target.files.length) handleMagicFile(e.target.files[0]);
            };
        }
        async function handleMagicFile(file) {
            try {
                console.log('Processing file:', file.name, 'Type:', file.type);
                if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                    alert('Note: le support PDF et Image est exp?rimental. l\'extraction automatique n?cessite un moteur OCr.\nFormat Excel recommand? pour une meilleure pr?cision.');
                    // Placeholder for future OCR implementation
                    return;
                }
                if (typeof XLSX === 'undefined') {
                    alert('Erreur: la biblioth?que Excel n\'est pas charg?e. Veuillez rafra?chir la page.');
                    return;
                }
                const data = await file.arrayBuffer();
                console.log('File loaded, size:', data.byteLength);
                const workbook = XLSX.read(data, { cellDates: true });
                console.log('Workbook loaded, sheets:', workbook.SheetNames);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                console.log('rows parsed:', json.length);
                magicTransactions = [];
                let lastValidDate = null; // Track last valid date for forward-fill

                // Detect if it's our official template by looking for 'Partenaire' in the header string
                let isOfficialTemplate = false;
                if (json.length > 0) {
                    const headerStr = json[0].join(' ').toLowerCase();
                    if (headerStr.includes('partenaire') || headerStr.includes('tiers') || headerStr.includes('exécutant')) {
                        isOfficialTemplate = true;
                    }
                }

                json.forEach((row, i) => {
                    if (i === 0 && isHeaderrow(row)) return;

                    if (isOfficialTemplate) {
                        // Strict parsing based on our template columns
                        let rawDate = row[0];
                        let date = null;
                        if (rawDate instanceof Date) {
                            date = rawDate.toISOString().split('T')[0];
                        } else if (typeof rawDate === 'string') {
                            const dateMatch = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?/);
                            if (dateMatch) {
                                let d = dateMatch[1].padStart(2, '0');
                                let m = dateMatch[2].padStart(2, '0');
                                let y = dateMatch[4] || new Date().getFullYear();
                                if (y.toString().length === 2) y = "20" + y;
                                date = `${y}-${m}-${d}`;
                            } else if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                date = rawDate;
                            }
                        } else if (typeof rawDate === 'number') {
                            // Excel date to JS Date
                            const d = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
                            if (!isNaN(d.getTime())) {
                                date = d.toISOString().split('T')[0];
                            }
                        }

                        if (!date && lastValidDate) { date = lastValidDate; }
                        else if (date) { lastValidDate = date; }

                        let entree = parseFloat(row[1]) || 0;
                        let sortie = parseFloat(row[2]) || 0;
                        let amount = entree > 0 ? entree : sortie;
                        let type = entree > 0 ? 'income' : 'expense';

                        let code = (row[3] || '').toString().trim().toUpperCase().substring(0, 10) || 'DIV';
                        let category = (row[4] || '').toString().trim() || 'Opération Importée';
                        let details = (row[5] || '').toString().trim();
                        let partner = (row[6] || '').toString().trim();
                        let executor = (row[7] || '').toString().trim();

                        if (date || amount > 0 || category !== 'Opération Importée') {
                            magicTransactions.push({
                                date: date || new Date().toISOString().split('T')[0],
                                amount: amount,
                                type: type,
                                category: category,
                                code: code,
                                partner: partner,
                                executor: executor,
                                details: details
                            });
                        }
                    } else {
                        // Custom unformatted file heuristic parser
                        let date = null, amount = 0, type = 'expense', code = '';
                        let amountColumnIndex = -1;
                        let labelParts = [];
                        row.forEach((cell, colIndex) => {
                            if (cell == null || cell === '') return;
                            // Enhanced date detection
                            if (cell instanceof Date) {
                                date = cell.toISOString().split('T')[0];
                            } else if (typeof cell === 'string') {
                                // Try to parse date strings (DD/MM/YYYY, DD/MM, etc.)
                                const dateMatch = cell.match(/(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?/);
                                if (dateMatch) {
                                    let day = dateMatch[1].padStart(2, '0');
                                    let month = dateMatch[2].padStart(2, '0');
                                    let year = dateMatch[4] || new Date().getFullYear();
                                    if (year.toString().length === 2) year = "20" + year;
                                    date = `${year}-${month}-${day}`;
                                } else if (cell.trim().length > 0) {
                                    // Collect all text for full label
                                    labelParts.push(cell.trim());
                                }
                                // Try to detect code
                                if (cell.length >= 2 && cell.length <= 10 && cell === cell.toUpperCase()) {
                                    code = cell;
                                }
                            } else if (typeof cell === 'number' && cell > 100) {
                                amount = cell;
                                amountColumnIndex = colIndex;
                            } else if (typeof cell === 'number') {
                                // could be Excel date
                                const d = new Date((cell - (25567 + 2)) * 86400 * 1000);
                                if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) {
                                    date = d.toISOString().split('T')[0];
                                } else {
                                    amount = cell;
                                    amountColumnIndex = colIndex;
                                }
                            }
                        });
                        // Forward-fill: If no date found, use last valid date
                        if (!date && lastValidDate) {
                            date = lastValidDate;
                        } else if (date) {
                            lastValidDate = date; // Update last valid date
                        }
                        // Column-based type detection: left columns (0-1) = Income, right columns (2+) = Expense
                        if (amountColumnIndex >= 0) {
                            type = amountColumnIndex <= 1 ? 'income' : 'expense';
                        }
                        // Preserve full label
                        const fulllabel = labelParts.join(' - ');
                        if (date || amount || fulllabel) {
                            const item = {
                                date: date || new Date().toISOString().split('T')[0],
                                amount: amount || 0,
                                type: type,
                                category: fulllabel || 'Opération Importée',
                                code: code || 'DIV',
                                partner: '',
                                details: fulllabel // Captured label as details
                            };
                            magicTransactions.push(item);
                        }
                    }
                });
                console.log('Transactions extracted:', magicTransactions.length);
                if (magicTransactions.length) {
                    openMagicOverlay();
                } else {
                    alert('Aucune donn?e valide trouv?e dans le fichier.');
                }
            } catch (error) {
                console.error('Error processing Excel file:', error);
                alert('Erreur lors du traitement du fichier Excel: ' + error.message);
            }
        }
        function isHeaderrow(row) {
            const head = row.join(' ').toLowerCase();
            return head.includes('date') || head.includes('montant') || head.includes('Libell?');
        }
        btnAnalyze.onclick = () => {
            const text = input.value;
            if (!text.trim()) {
                alert('Veuillez coller des donn?es ou Importer un fichier.');
                return;
            }
            magicTransactions = parseMagicInput(text);
            if (magicTransactions.length === 0) {
                alert('Aucune op?ration d?tect?e. Essayez un autre format.');
                return;
            }
            openMagicOverlay();
        };
        btnClear.onclick = () => {
            input.value = '';
            fileInput.value = '';
            magicTransactions = [];
        };
        btnConfirm.onclick = () => {
            if (!magicTransactions.length) return;
            if (!confirm(`Voulez-vous vraiment importer ces ${magicTransactions.length} opérations ?`)) return;
            // Generate a unique identifier for this entire import batch
            const importBatchId = 'batch_' + Date.now().toString();
            // Calculate Import statistics
            let totalIncome = 0;
            let totalExpense = 0;
            let operationCount = magicTransactions.length;
            magicTransactions.forEach(t => {
                const amount = t.amount || 0;
                // Calculate TOTALs for history
                if (t.type === 'income') {
                    totalIncome += amount;
                } else {
                    totalExpense += amount;
                }
                // 1. Auto-create Code if missing
                if (t.code && t.code.trim()) {
                    const codeUpper = t.code.trim().toUpperCase();
                    const exists = appData.codes.find(c => c.short === codeUpper);
                    if (!exists) {
                        appData.codes.push({
                            id: Date.now() + Math.floor(Math.random() * 500),
                            short: codeUpper,
                            name: t.category || 'Code Import?',
                            type: t.type || 'expense',
                            origin: 'Import'
                        });
                    }
                }
                // 2. Handle Partner/employee
                let finalPartner = '';
                let finalexecutor = '';
                // Handle Partner (Tiers)
                let pName = (t.partner || '').trim();
                if (pName) {
                    const tierExists = appData.partners.find(p => p.name.toLowerCase() === pName.toLowerCase());
                    if (tierExists) {
                        finalPartner = tierExists.name;
                    } else {
                        const newTier = {
                            id: Date.now() + Math.floor(Math.random() * 1000),
                            name: pName,
                            type: 'Import?'
                        };
                        appData.partners.push(newTier);
                        finalPartner = pName;
                    }
                }
                // Handle employee (Executor)
                let eName = (t.executor || '').trim();
                if (eName) {
                    const staffExists = appData.employees.find(e => e.name.toLowerCase() === eName.toLowerCase() || (e.abbr && e.abbr.toLowerCase() === eName.toLowerCase()));
                    if (staffExists) {
                        finalexecutor = staffExists.name;
                    } else {
                        finalexecutor = eName;
                    }
                }
                // 3. Create Transaction
                const originalDetails = t.details || t.category || 'Saisie vrac';
                const newTx = {
                    id: Date.now() + Math.floor(Math.random() * 2000),
                    date: t.date || new Date().toISOString().split('T')[0],
                    time: t.time || (new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')),
                    type: t.type || 'expense',
                    code: t.code || 'DIV',
                    category: t.category || 'Op?ration Import?e',
                    partner: finalPartner,
                    executor: finalexecutor,
                    amount: amount,
                    details: originalDetails + ' ? [Import]',
                    paymentMode: 'cash',
                    user: state.currentUser ? state.currentUser.username : 'Admin',
                    caisse: state.currentCaisse || 'general',
                    isPrinted: false,
                    batchId: importBatchId
                };
                appData.transactions.push(newTx);
            });
            // record Import history
            const now = new Date();
            const Importrecord = {
                id: Date.now(),
                batchId: importBatchId,
                date: now.toISOString().split('T')[0],
                time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} `,
                agent: state.currentUser ? state.currentUser.username : 'Admin',
                operationCount: operationCount,
                totalIncome: totalIncome,
                totalExpense: totalExpense,
                balance: totalIncome - totalExpense
            };
            if (!appData.importHistory) appData.importHistory = [];
            appData.importHistory.unshift(Importrecord); // Add to beginning for newest first
            saveData();
            populateSelects(); // refresh datalists for new tiers/staff
            renderHistory();
            renderSaisieHistory();
            renderImportHistory(); // render Import history
            updateDashboard();
            input.value = '';
            fileInput.value = '';
            closeMagicOverlay();
            container.style.display = 'none';
            magicTransactions = [];
            alert('Importation r?ussie ! Nouveaux codes et tiers cr??s si n?cessaire.');
        };
    }
    function parseMagicInput(text) {
        const lines = text.split('\n');
        const results = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.length < 5) return;
            let date = new Date().toISOString().split('T')[0];
            let amount = 0;
            let type = 'expense';
            let category = 'Import';
            let code = '';
            let partner = '';
            // 1. Extract Date (DD/MM/YYYY or DD/MM)
            const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?/);
            if (dateMatch) {
                let day = dateMatch[1].padStart(2, '0');
                let month = dateMatch[2].padStart(2, '0');
                let year = dateMatch[4] || new Date().getFullYear();
                if (year.toString().length === 2) year = "20" + year;
                date = `${year}-${month}-${day}`;
            }
            // 2. Extract Amount
            const amountMatches = trimmed.match(/\d+[\s\d]*\d*/g);
            if (amountMatches) {
                const numbers = amountMatches.map(n => parseInt(n.replace(/\s/g, '').replace(/\./g, ''))).filter(n => n > 100);
                if (numbers.length > 0) amount = Math.max(...numbers);
            }
            // 3. Prepare lowercase version for keyword matching
            const lowerline = trimmed.toLowerCase();
            // 4. Extract Code (heuristic: words in All CAPS 2-10 chars or specific patterns)
            const codeMatch = trimmed.match(/\b([A-Z]{2,10})\b/);
            if (codeMatch) code = codeMatch[1];
            else {
                // Heuristic proposal based on keywords
                if (lowerline.includes('carburant') || lowerline.includes('essence') || lowerline.includes('gasoil')) code = 'CArB';
                else if (lowerline.includes('transport') || lowerline.includes('taxi') || lowerline.includes('moto')) code = 'TrANS';
                else if (lowerline.includes('salaire') || lowerline.includes('avance') || lowerline.includes('paye')) code = 'PErS';
                else if (lowerline.includes('loyer') || lowerline.includes('local')) code = 'lOY';
                else if (lowerline.includes('manger') || lowerline.includes('bouffe') || lowerline.includes('caf?')) code = 'rESTO';
            }
            // 5. Extract Type
            if (['entree', 'recette', 'plus', '+'].some(w => lowerline.includes(w))) type = 'income';
            // 5. Cleanup label
            let label = trimmed;
            if (dateMatch) label = label.replace(dateMatch[0], '');
            if (amount > 0) label = label.replace(new RegExp(`\\b${amount} \\b`, 'g'), '');
            category = label.replace(/[0-9\/\\-]/g, '').replace(/\b(entr?e|SORTIE|recette|d?pense|income|expense)\b/gi, '').trim();
            if (category.length > 50) category = category.substring(0, 47) + '...';
            if (!category) category = 'Op?ration Import?e';
            results.push({
                date,
                amount,
                type,
                category,
                code: code || 'DIV',
                partner: '',
                executor: '',
                details: trimmed // Capture full line as details
            });
        });
        return results;
    }
    function renderMagicreview() {
        const reviewBody = document.getElementById('magic-review-body');
        if (!reviewBody) return;
        reviewBody.innerHTML = '';
        magicTransactions.forEach((t, i) => {
            const tr = document.createElement('tr');
            tr.style.height = '60px'; // larger rows
            // Check if code/tier/staff exists for visual feedback
            const codeExists = appData.codes.some(c => c.short === (t.code || '').toUpperCase());
            const tierExists = appData.partners.some(p => p.name.toLowerCase() === (t.partner || '').toLowerCase());
            const staffExists = appData.employees.some(e => e.name.toLowerCase() === (t.executor || '').toLowerCase() || (e.abbr && e.abbr.toLowerCase() === (t.executor || '').toLowerCase()));
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="magic-row-cb" data-id="${i}"></td>
                <td><input type="date" value="${t.date}" style="font-size: 1.1rem; padding: 0.8rem;"></td>
                <td>
                    <select style="font-size: 1.1rem; padding: 0.8rem;">
                        <option value="income" ${t.type === 'income' ? 'selected' : ''}>Entrée</option>
                        <option value="expense" ${t.type === 'expense' ? 'selected' : ''}>SORTIE</option>
                    </select>
                </td>
                <td>
                    <input type="text" value="${t.code || ''}" placeholder="Code..." style="font-size: 1.1rem; padding: 0.8rem; font-weight: 700; color: #be185d;">
                    ${!codeExists && t.code ? '<span class="magic-status-new">Nouveau Code</span>' : ''}
                </td>
                <td><input type="text" value="${t.category}" style="font-size: 1.1rem; padding: 0.8rem;"></td>
                <td style="position: relative;">
                    <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 700;">FCFA</span>
                    <input type="number" value="${t.amount}" style="font-size: 1.3rem; padding: 0.8rem 0.8rem 0.8rem 4rem; font-weight: 800; color: #15803d;">
                </td>
                <td>
                    <input type="text" value="${t.partner || ''}" placeholder="Tiers..." list="partners-list"
                        class="${tierExists ? 'input-success' : ''}"
                        style="font-size: 1rem; padding: 0.6rem;">
                    ${!tierExists && t.partner ? '<span class="magic-status-new">Nouveau</span>' : ''}
                </td>
                <td>
                    <input type="text" value="${t.executor || ''}" placeholder="EMPLOYÉ..." list="staff-list"
                        class="${staffExists ? 'input-success' : ''}"
                        style="font-size: 1rem; padding: 0.6rem;">
                <td><button type="button" class="btn-icon delete-magic-row" style="color: #ef4444; font-size: 1.5rem;"><i class="fa-solid fa-trash"></i></button></td>
            `;
            const inputs = tr.querySelectorAll('input, select');
            inputs[0].onchange = (e) => magicTransactions[i].date = e.target.value;
            inputs[1].onchange = (e) => magicTransactions[i].type = e.target.value;
            inputs[2].onchange = (e) => {
                magicTransactions[i].code = e.target.value.toUpperCase();
                renderMagicreview(); // refresh feedback
            };
            inputs[3].onchange = (e) => magicTransactions[i].category = e.target.value;
            inputs[4].onchange = (e) => magicTransactions[i].amount = parseFloat(e.target.value) || 0;
            inputs[5].onchange = (e) => {
                magicTransactions[i].partner = e.target.value;
                renderMagicreview(); // refresh feedback
            };
            inputs[6].onchange = (e) => {
                const val = e.target.value.trim().toUpperCase();
                const emp = appData.employees.find(ev => (ev.abbr && ev.abbr.toUpperCase() === val) || ev.name.toUpperCase() === val);
                if (emp) {
                    magicTransactions[i].executor = emp.name;
                } else {
                    magicTransactions[i].executor = e.target.value;
                }
                renderMagicreview(); // refresh feedback
            };
            tr.querySelector('.delete-magic-row').onclick = () => {
                magicTransactions.splice(i, 1);
                renderMagicreview();
            };
            reviewBody.appendChild(tr);
        });
    }
    // render Import History
    function renderImportHistory() {
        const tbody = document.getElementById('import-history-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!appData.importHistory || appData.importHistory.length === 0) {
            tbody.innerHTML = `
                < tr >
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    Aucun historique d'importation pour le moment
                </td>
                </tr >
                `;
            return;
        }
        appData.importHistory.forEach(record => {
            const tr = document.createElement('tr');
            const balanceColor = record.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
            tr.innerHTML = `
                < td >
                    <div style="font-weight: 700;">${record.date}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${record.time}</div>
                </td >
                <td><strong>${record.agent}</strong></td>
                <td style="text-align: center; font-weight: 700; color: var(--primary-color);">${record.operationCount}</td>
                <td style="color: var(--accent-success); font-weight: 700;">${formatCurrency(record.totalIncome || record.TOTALIncome)}</td>
                <td style="color: var(--accent-danger); font-weight: 700;">${formatCurrency(record.totalExpense || record.TOTALexpense)}</td>
                <td style="color: ${balanceColor}; font-weight: 800; font-size: 1.1rem;">${formatCurrency(record.balance)}</td>
                <td>
                    <button class="btn-icon delete-import-batch" data-batch="${record.batchId || ''}" title="Annuler et supprimer cet import">
                        <i class="fa-solid fa-trash" style="color: #ef4444;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for batch deletion
        document.querySelectorAll('.delete-import-batch').forEach(btn => {
            btn.onclick = (e) => {
                const batchId = e.currentTarget.getAttribute('data-batch');
                if (!batchId) {
                    alert("Cet import est trop ancien pour être supprimé en groupe. Mais vous pouvez les sélectionner un par un dans l'Historique des Saisies.");
                    return;
                }
                if (confirm('Voulez-vous vraiment supprimer toutes les transactions de CETTE importation précise ?')) {
                    // Remove transactions with exactly this batchId
                    const initialCount = appData.transactions.length;
                    appData.transactions = appData.transactions.filter(t => t.batchId !== batchId);
                    const deletedCount = initialCount - appData.transactions.length;

                    // Remove record from import history
                    appData.importHistory = appData.importHistory.filter(h => h.batchId !== batchId);

                    saveData();
                    renderImportHistory();
                    if (typeof renderSaisieHistory === 'function') renderSaisieHistory();
                    if (typeof updateDashboard === 'function') updateDashboard();

                    alert(`Import annulé! ${deletedCount} transactions ont été supprimées.`);
                }
            };
        });
    }
    // Setup Import Filter
    function setupImportFilter() {
        const btnFilterImports = document.getElementById('btn-filter-imports');
        const btnClearFilter = document.getElementById('btn-clear-filter');
        if (!btnFilterImports) return;
        let isFiltered = false;
        btnFilterImports.onclick = () => {
            isFiltered = true;
            btnFilterImports.style.display = 'none';
            btnClearFilter.style.display = 'inline-block';
            // Filter to show only Imported transactions
            const allrows = document.querySelectorAll('#saisie-history-body tr');
            allrows.forEach(row => {
                // The 'Import' badge is now placed in the first column or details.
                // Searching the whole row is more reliable.
                if (row.textContent.includes('Import')) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        };
        btnClearFilter.onclick = () => {
            isFiltered = false;
            btnClearFilter.style.display = 'none';
            btnFilterImports.style.display = 'inline-block';
            // Show all transactions
            const allrows = document.querySelectorAll('#saisie-history-body tr');
            allrows.forEach(row => {
                row.style.display = '';
            });
        };

        const btnPurgeImports = document.getElementById('btn-purge-imports');
        if (btnPurgeImports) {
            btnPurgeImports.onclick = () => {
                if (confirm('Voulez-vous VRAIMENT supprimer TOUTES les données importées (historique et transactions) ? Cette action est irréversible.')) {
                    // Supprimer les transactions marquées [Import]
                    const initialCount = appData.transactions.length;
                    appData.transactions = appData.transactions.filter(t => !(t.details && t.details.includes('[Import]')));
                    const deletedCount = initialCount - appData.transactions.length;

                    // Vider l'historique des importations
                    appData.importHistory = [];

                    saveData();

                    if (typeof renderSaisieHistory === 'function') renderSaisieHistory();
                    if (typeof renderImportHistory === 'function') renderImportHistory();
                    if (typeof updateDashboard === 'function') updateDashboard();

                    alert(`Purge terminée.${deletedCount} transactions importées ont été supprimées.`);
                }
            };
        }
    }
    // --- login System ---
    function checkLogin() {
        const currentUser = localStorage.getItem('currentUser');
        const loginModal = document.getElementById('login-modal');
        const appContainer = document.querySelector('.app-container');
        if (!currentUser) {
            // Not logged in
            if (loginModal) loginModal.style.display = 'flex';
            if (appContainer) appContainer.style.filter = 'blur(5px)';
        } else {
            // logged in
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
                // Ensure at least one admin exists or force create "admin"
                if (!appData.agents) appData.agents = [];
                const adminExists = appData.agents.some(a => a.login === 'admin');
                if (!adminExists) {
                    appData.agents.push({ id: 1, name: 'Admin', login: 'admin', code: 'admin', role: 'admin', access: 'both' });
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

    // --- Helper Functions ---
    function setupShortcuts() {
        // shortcut keys if needed
    }

    // Expose global functions for inline HTML event handlers
    window.switchView = switchView;
    window.editTransaction = editTransaction;
    window.printReceipt = printReceipt;

    window.toggleEmployeeDetails = function (empName) {
        const detailsRow = document.getElementById('details-' + empName.replace(/\s+/g, '-'));
        if (!detailsRow) return;
        if (detailsRow.style.display === 'none') {
            detailsRow.style.display = 'table-row';
            const container = detailsRow.querySelector('.details-container');
            const trans = appData.transactions.filter(t => t.partner === empName && t.category === 'ACOMPTE');
            const loans = (appData.loans || []).filter(l => l.beneficiary === empName);
            let h = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; padding:1rem; background:#f9f9f9; border:1px solid #eee; margin:5px; border-radius:5px;">';
            h += '<div><strong style="display:block; margin-bottom:5px; border-bottom:1px solid #ccc;">Acomptes</strong>';
            if (trans.length) {
                h += '<table style="width:100%; font-size:12px;"><thead><tr><th>Date</th><th>Mois</th><th>Montant</th></tr></thead><tbody>';
                trans.forEach(t => { h += '<tr><td>' + new Date(t.date).toLocaleDateString() + '</td><td>' + (t.advanceMonth || '-') + '</td><td>' + formatCurrency(t.amount) + '</td></tr>'; });
                h += '</tbody></table>';
            } else h += '<p style="font-size:12px; color:#999;">Aucun acompte.</p>';
            h += '</div><div><strong style="display:block; margin-bottom:5px; border-bottom:1px solid #ccc;">Pr?ts</strong>';
            if (loans.length) {
                h += '<table style="width:100%; font-size:12px;"><thead><tr><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>';
                loans.forEach(l => { h += '<tr><td>' + new Date(l.date).toLocaleDateString() + '</td><td>' + formatCurrency(l.amount) + '</td><td>' + (l.isPaid ? 'Pay?' : 'En cours') + '</td></tr>'; });
                h += '</tbody></table>';
            } else h += '<p style="font-size:12px; color:#999;">Aucun pr?t.</p>';
            h += '</div></div>';
            container.innerHTML = h;
        } else {
            detailsRow.style.display = 'none';
        }
    };


    // --- Quick Entry Logic (Excel Style) ---
    function setupQuickEntry() {
        const qeDate = document.getElementById('qe-date');
        const qeAmountOut = document.getElementById('qe-amount-out');
        const qeAmountIn = document.getElementById('qe-amount-in');
        const btnAdd = document.getElementById('btn-add-quick');

        if (qeDate && !qeDate.value) qeDate.valueAsDate = new Date();

        // Mutually exclusive amounts
        if (qeAmountOut && qeAmountIn) {
            qeAmountOut.oninput = () => { if (qeAmountOut.value) qeAmountIn.value = ''; };
            qeAmountIn.oninput = () => { if (qeAmountIn.value) qeAmountOut.value = ''; };
        }

        // Action on button click
        if (btnAdd) btnAdd.onclick = handleQuickEntrySubmit;

        // Action on Enter key
        const qeInputs = ['qe-date', 'qe-code', 'qe-details', 'qe-partner', 'qe-logic', 'qe-amount-out', 'qe-amount-in'];
        qeInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickEntrySubmit();
                    }
                };
            }
        });
    }

    function handleQuickEntrySubmit() {
        const date = document.getElementById('qe-date').value;
        const code = document.getElementById('qe-code').value.trim().toUpperCase();
        const details = document.getElementById('qe-details').value.trim();
        const partner = document.getElementById('qe-partner').value.trim();
        const logic = document.getElementById('qe-logic').value;
        const outVal = parseFloat(document.getElementById('qe-amount-out').value) || 0;
        const inVal = parseFloat(document.getElementById('qe-amount-in').value) || 0;

        if (!code) { alert('Code requis'); return; }
        if (outVal <= 0 && inVal <= 0) { alert('Montant requis'); return; }

        const type = inVal > 0 ? 'income' : 'expense';
        const amount = inVal > 0 ? inVal : outVal;

        // Auto-detect category from code
        const codeObj = appData.codes ? appData.codes.find(c => c.short.toUpperCase() === code) : null;
        const category = codeObj ? codeObj.name : 'SAISIE RAPIDE';

        const newTr = {
            id: Date.now(),
            date: date || new Date().toISOString().split('T')[0],
            type: type,
            category: category,
            code: code,
            details: details,
            amount: amount,
            partner: partner,
            executor: '',
            paymentMode: document.getElementById('qe-payment-mode').value,
            user: state.currentUser ? state.currentUser.username : 'Admin',
            caisse: state.currentCaisse || 'general',
            timestamp: new Date().toISOString()
        };

        if (!appData.transactions) appData.transactions = [];
        appData.transactions.push(newTr);

        // Special logic for RH if needed
        if (logic === 'rh' && partner) {
            // Check if it's an advance
            if (code === 'AC' || code === 'ACOMPTE') {
                if (!appData.loans) appData.loans = [];
                // Simple auto-link to employee advances could be added here
            }
        }

        saveData();
        renderSaisieHistory();
        updateDashboard();

        // Clear only small fields
        document.getElementById('qe-details').value = '';
        document.getElementById('qe-partner').value = '';
        document.getElementById('qe-amount-out').value = '';
        document.getElementById('qe-amount-in').value = '';
        document.getElementById('qe-code').focus(); // Ready for next one
    }

    // Run Init
    init();

    function setupGeneralPrintListeners() {
        const btnPrintTiers = document.getElementById('btn-print-tiers');
        if (btnPrintTiers) btnPrintTiers.onclick = printTiersReport;

        const btnPrintAgents = document.getElementById('btn-print-agents');
        if (btnPrintAgents) btnPrintAgents.onclick = printAgentsReport;

        const btnPrintStats = document.getElementById('btn-print-stats');
        if (btnPrintStats) btnPrintStats.onclick = printStatsReport;
    }

    function printTiersReport() {
        const title = "LISTE DES TIERS ET SOLDES";
        const headers = ["Désignation", "Catégorie", "Solde"];
        const data = (appData.partners || []).map(p => [p.name, p.category || '-', formatCurrency ? formatCurrency(p.balance || 0) : (p.balance || 0).toLocaleString()]);
        generateSimpleGenericReport(title, headers, data);
    }

    function printEmployeesReport() {
        const title = "LISTE DU PERSONNEL";
        const headers = ["Nom & Prénom", "Poste/Fonction", "Contact"];
        const data = (appData.employees || []).map(e => [e.name, e.function || '-', e.phone || '-']);
        generateSimpleGenericReport(title, headers, data);
    }

    function printAgentsReport() {
        const title = "LISTE DES AGENTS (ACCÈS)";
        const headers = ["Nom complet", "Login", "Rôle", "Accès Caisse"];
        const data = (appData.agents || []).map(a => [a.name, a.username, a.role === 'admin' ? 'Administrateur' : 'Caissier', a.access === 'both' ? 'Inter-caisses' : (a.access === 'general' ? 'Générale' : 'Secondaire')]);
        generateSimpleGenericReport(title, headers, data);
    }

    function printStatsReport() {
        const statsEl = document.getElementById('stats-container');
        if (!statsEl) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Statistiques CaissePro</title>`);
        printWindow.document.write(`<link rel="stylesheet" href="style.css">`);
        printWindow.document.write(`<style>
            body { padding: 40px; font-family: 'Inter', sans-serif; }
            .no-print { display: none; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 800; }
        </style></head><body>`);
        printWindow.document.write(`<h1>STATISTIQUES GÉNÉRALES - ${new Date().toLocaleDateString()}</h1>`);
        printWindow.document.write(statsEl.innerHTML);
        printWindow.document.write(`</body></html>`);
        printWindow.document.close();
        printWindow.print();
    }

    function generateSimpleGenericReport(title, headers, rows) {
        const company = appData.company || {};
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>${title}</title>`);
        printWindow.document.write(`<style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 30px; }
            h1 { font-size: 20px; text-transform: uppercase; margin: 0; }
            h2 { font-size: 22px; margin: 0; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1e3a8a; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 50px; font-size: 11px; color: #64748b; text-align: right; }
        </style></head><body>`);

        printWindow.document.write(`
            <div class="header">
                <div><h2>${company.name || 'CaissePro'}</h2><p>${company.address || ''}</p></div>
                <div style="text-align:right"><h1>${title}</h1><p>Le ${new Date().toLocaleDateString('fr-FR')}</p></div>
            </div>
            <table>
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
            <div class="footer">Document généré par CaissePro</div>
        </body></html>`);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    // --- Acomptes & Prêts Logic ---
    // --- Acomptes & Prêts Logic ---
    function setupAcomptesPretsLogic() {
        const tabs = document.querySelectorAll('.finance-tab');
        const monthFilter = document.getElementById('finance-month-filter');
        const label = document.getElementById('current-filter-label');
        const printBtn = document.getElementById('btn-print-finance-options');
        const printDropdown = document.getElementById('finance-print-dropdown');

        // Set current month as default ONLY if we want it. We will leave it empty to align with the Dashboard total.
        if (monthFilter && !monthFilter.value) {
            monthFilter.value = ''; // Ensure it's empty by default
            state.financeMonthFilter = '';
        }

        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                state.financeFilterMode = tab.dataset.mode;
                if (label) label.textContent = `Vue: ${tab.dataset.mode === 'ALL' ? 'TOUT' : tab.dataset.mode}`;
                renderAcomptesPretsView();
            };
        });

        if (monthFilter) {
            monthFilter.onchange = () => {
                state.financeMonthFilter = monthFilter.value;
                renderAcomptesPretsView();
            };
        }

        const searchInput = document.getElementById('finance-search-live');
        const btnPrintList = document.getElementById('btn-print-finance-list');
        const btnPrintCards = document.getElementById('btn-print-finance-cards');

        if (searchInput) {
            searchInput.oninput = () => {
                state.financeSearchFilter = searchInput.value.trim();
                renderAcomptesPretsView();
            };
        }

        if (btnPrintList) {
            btnPrintList.onclick = () => {
                const mode = state.financeFilterMode || 'ALL';
                const month = monthFilter?.value || '';
                const search = state.financeSearchFilter || '';
                printPersonnelState(mode, 'all', search, '', '', month);
            };
        }

        if (btnPrintCards) {
            btnPrintCards.onclick = () => {
                const mode = state.financeFilterMode || 'ALL';
                const month = monthFilter?.value || '';
                const search = state.financeSearchFilter || '';
                const printMode = search ? 'individual' : 'individual-all';
                printPersonnelState(mode, printMode, search, '', '', month);
            };
        }

        const btnRefresh = document.getElementById('btn-refresh-finances');
        if (btnRefresh) {
            btnRefresh.onclick = () => {
                renderAcomptesPretsView();
                updateDashboard();
                showNotification("Données actualisées", "info");
            };
        }

        // Form Type Selection Logic (Keep existing functionality)
        const typeSelect = document.getElementById('quick-rh-type');
        if (typeSelect) {
            typeSelect.onchange = () => {
                const isLoan = typeSelect.value === 'PRÊT';
                document.querySelectorAll('.loan-only').forEach(el => el.style.display = isLoan ? 'block' : 'none');

                // Change label text based on type
                const monthLabel = document.getElementById('quick-rh-month-label');
                if (monthLabel) {
                    monthLabel.textContent = isLoan ? 'Début prélèvement' : 'Mois de déduction';
                }
            };
            // Initial trigger
            typeSelect.dispatchEvent(new Event('change'));
        }

        // Auto-calculation logic for loans
        const rhAmountInput = document.getElementById('quick-rh-amount');
        const rhDurationInput = document.getElementById('quick-rh-duration');
        const rhMonthlyInput = document.getElementById('quick-rh-monthly-deduction');

        const calculateLoanOptions = (source) => {
            const amt = parseFloat(rhAmountInput?.value) || 0;
            const dur = parseInt(rhDurationInput?.value) || 0;
            const mon = parseFloat(rhMonthlyInput?.value) || 0;

            if (source === 'duration' && dur > 0 && amt > 0) {
                if (rhMonthlyInput) rhMonthlyInput.value = (amt / dur).toFixed(0);
            } else if (source === 'monthly' && mon > 0 && amt > 0) {
                if (rhDurationInput) rhDurationInput.value = Math.ceil(amt / mon);
            } else if (source === 'amount' && amt > 0) {
                if (dur > 0 && rhMonthlyInput) rhMonthlyInput.value = (amt / dur).toFixed(0);
                else if (mon > 0 && rhDurationInput) rhDurationInput.value = Math.ceil(amt / mon);
            }
        };

        if (rhAmountInput) rhAmountInput.addEventListener('input', () => calculateLoanOptions('amount'));
        if (rhDurationInput) rhDurationInput.addEventListener('input', () => calculateLoanOptions('duration'));
        if (rhMonthlyInput) rhMonthlyInput.addEventListener('input', () => calculateLoanOptions('monthly'));

        // Quick RH Form Submission (Keep existing functionality)
        const quickRhForm = document.getElementById('quick-rh-form');
        if (quickRhForm) {
            quickRhForm.onsubmit = (e) => {
                e.preventDefault();
                const type = typeSelect.value;
                const employee = document.getElementById('quick-rh-employee').value.trim();
                const amount = parseFloat(document.getElementById('quick-rh-amount').value) || 0;
                const month = document.getElementById('quick-rh-month').value;
                const duration = parseInt(document.getElementById('quick-rh-duration')?.value) || 0;
                const monthly = parseFloat(document.getElementById('quick-rh-monthly-deduction')?.value) || 0;

                if (!employee || amount <= 0) {
                    alert('Employé et montant requis.');
                    return;
                }

                if (type === 'PRÊT' && duration <= 0 && monthly <= 0) {
                    alert('Veuillez indiquer une durée ou une mensualité pour le prêt.');
                    return;
                }

                // Verify employee exists
                const empExists = (appData.employees || []).find(emp => emp.name.toLowerCase() === employee.toLowerCase());
                if (!empExists) {
                    if (!confirm(`L'employé "${employee}" n'existe pas dans la base RH. Voulez-vous continuer ?`)) return;
                }

                const finalMonthly = monthly || (duration > 0 ? (amount / duration).toFixed(0) : 0);
                const finalDuration = duration || (monthly > 0 ? Math.ceil(amount / monthly) : 0);

                const transaction = {
                    id: Date.now(),
                    pieceNumber: `PC-${Date.now().toString().slice(-6)}`,
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
                    amount: amount,
                    category: type,
                    code: type === 'ACOMPTE' ? 'AC' : 'PR',
                    details: type === 'ACOMPTE' ? `ACOMPTE SUR SALAIRE - ${month}` : `PRÊT PERSONNEL (${finalDuration} mois, ${finalMonthly} CFA/mois)`,
                    partner: employee,
                    executor: '',
                    paymentMode: 'cash',
                    caisse: state.currentCaisse || 'general',
                    user: state.currentUser ? state.currentUser.username : 'Admin',
                    advanceMonth: month || null,
                    isDeducted: type === 'ACOMPTE' ? false : null,
                    loanDetails: type === 'PRÊT' ? { duration: finalDuration, monthly: finalMonthly } : null
                };

                appData.transactions.push(transaction);

                if (type === 'PRÊT') {
                    if (!appData.loans) appData.loans = [];
                    appData.loans.push({
                        id: Date.now() + 1,
                        beneficiary: employee,
                        amount: amount,
                        date: transaction.date,
                        isPaid: false,
                        status: 'pending',
                        duration: duration,
                        monthly: (duration ? (amount / duration).toFixed(0) : 0),
                        user: transaction.user,
                        paymentMode: 'cash'
                    });
                }

                saveData();
                showNotification(`Enregistrement du ${type} réussi !`, "success");
                renderAcomptesPretsView();
                updateDashboard();
                if (typeof renderSaisieHistory === 'function') renderSaisieHistory();
                quickRhForm.reset();
                if (typeSelect) typeSelect.dispatchEvent(new Event('change'));
                document.getElementById('quick-rh-employee').focus();
            };
        }
    }



});



function printPersonnelState(rhMode, printMode, selection, startDate, endDate, month) {
    rhMode = (rhMode || 'ALL').toUpperCase();
    printMode = printMode || 'all'; // 'all' (global list) or 'individual' / 'individual-all'
    selection = selection || '';
    startDate = startDate || '';
    endDate = endDate || '';
    month = month || '';

    let title = 'ÉTAT GLOBAL DES ENCOURS (ACOMPTES & PRÊTS)';
    if (rhMode === 'ACOMPTE') title = 'ÉTAT DÉTAILLÉ DES ACOMPTES SUR SALAIRE';
    else if (rhMode === 'PRÊT') title = 'ÉTAT DÉTAILLÉ DES PRÊTS AU PERSONNEL';

    const formatMonthToDate = (m) => {
        if (!m || m === '-') return '-';
        const p = m.split('-');
        if (p.length !== 2) return m;
        const date = new Date(parseInt(p[0]), parseInt(p[1]) - 1, 1);
        const monthName = date.toLocaleString('fr-FR', { month: 'long' });
        return `${monthName}/${p[0]}`;
    };

    const periodLabel = month
        ? `Mois de déduction : ${formatMonthToDate(month)}`
        : ((startDate && endDate) ? `Période du ${formatDate(startDate)} au ${formatDate(endDate)}` : 'Historique complet');
    // Filter transactions
    let txs = (appData.transactions || []).filter(t => {
        const tCat = (t.category || '').toUpperCase();
        if (rhMode === 'ACOMPTE' && tCat !== 'ACOMPTE') return false;
        if (rhMode === 'PRÊT' && tCat !== 'PRÊT') return false;
        if (rhMode === 'ALL' && (tCat !== 'ACOMPTE' && tCat !== 'PRÊT')) return false;

        if (month && t.advanceMonth && t.advanceMonth !== month) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });

    const getPartnerNames = (tx) => {
        if (tx.beneficiaries && tx.beneficiaries.length > 0) return tx.beneficiaries.map(b => b.name);
        return [tx.partner || ''];
    };

    const empMap = {};
    txs.forEach(tx => {
        const names = getPartnerNames(tx);
        names.forEach(name => {
            if (!name) return;
            if (!empMap[name]) empMap[name] = { total: 0, rows: [] };
            const amt = tx.beneficiaries && tx.beneficiaries.length > 0
                ? (tx.beneficiaries.find(b => b.name === name)?.amount || 0)
                : tx.amount;
            empMap[name].total += amt;

            let rowDetails = tx.details || '';
            const isLoan = (tx.category || '').toUpperCase().trim() === 'PRÊT';
            if (isLoan) {
                const ld = tx.loanDetails || {};
                const start = ld.startDate || '-';
                const end = ld.endDate || '-';
                const dur = ld.duration ? `${ld.duration} mois` : '-';
                rowDetails = `<b>PRÊT PERSONNEL</b><br><small style="color:#64748b; font-weight:700;">Début: ${start} | Fin: ${end} | Durée: ${dur}</small>`;
                // Si l'utilisateur vérifie "historique prêt" depuis "Acomptes & Prêts", 
                // on est sûr que les infos de l'exécutant et du moyen de paiement y sont grâce à "by" et "mode".
            }

            empMap[name].rows.push({
                date: tx.date,
                amount: amt,
                id: tx.pieceNumber || tx.id,
                details: rowDetails,
                month: tx.advanceMonth || '-',
                type: (tx.category || '').toUpperCase(),
                mode: tx.paymentMode || '-',
                by: tx.agentRemettant || tx.user || '-'
            });
        });
    });

    let employees = Object.keys(empMap).sort();

    // Global filter: if an employee is searched, filter the list first
    if (selection) {
        employees = employees.filter(e => e.toLowerCase().includes(selection.toLowerCase()));
    }

    if (employees.length === 0) {
        alert("Aucune donnée trouvée pour cette sélection.");
        return;
    }

    const company = appData.company || {};
    // prepare content first

    // Header HTML with styles
    let headHtml = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: #fff; line-height: 1.4; }
                .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 20px auto; box-sizing: border-box; page-break-after: always; position: relative; border: 1px solid #eee; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
                .comp-info h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f172a; text-transform: uppercase; }
                .comp-info p { margin: 2px 0; font-size: 0.75rem; color: #64748b; font-weight: 500; }
                .report-title { text-align: right; }
                .report-title h1 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
                .report-title p { margin: 2px 0; font-size: 0.7rem; color: #64748b; font-weight: 700; }
                
                .employee-section { margin-top: 20px; }
                .employee-header { background: #f8fafc; padding: 10px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-left: 4px solid #1e3a8a; }
                .employee-name { font-weight: 800; font-size: 1rem; color: #0f172a; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; }
                th { background: #f1f5f9; color: #475569; text-align: left; padding: 8px 12px; font-size: 0.7rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.8rem; font-weight: 500; }
                .total-row { background: #f8fafc; font-weight: 800; color: #0f172a; }
                
                .signature-box { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
                .sig-line { border-bottom: 1px solid #1e293b; width: 80%; margin: 15px auto; height: 40px; }
                
                .footer { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 0.6rem; color: #94a3b8; font-weight: 600; }
                
                @media print {
                    body { background: none; -webkit-print-color-adjust: exact; }
                    .page { border: none; box-shadow: none; margin: 0; padding: 10mm; height: auto; min-height: auto; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <button onclick="window.print()" style="padding: 10px 20px; background: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 0.8rem;">📄 LANCER L'IMPRESSION</button>
            </div>
    `;

    let bodyHtml = "";

    if (printMode === 'all') {
        // GLOBAL LIST MODE
        let globalTotal = 0;
        let tableRowsHtml = "";

        employees.forEach(empName => {
            const data = empMap[empName];
            if (!data) return;
            globalTotal += data.total;

            tableRowsHtml += `
                <div class="employee-header" style="background: #f1f5f9; margin-top: 15px; margin-bottom: 5px;">
                    <span class="employee-name">${empName.toUpperCase()}</span>
                    <span style="font-weight: 800; color: #b91c1c;">${formatCurrency(data.total)}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">DATE</th>
                            <th style="flex: 1;">DÉTAILS</th>
                            <th style="width: 12%;">MODE</th>
                            <th style="width: 12%;">PAR</th>
                            <th style="width: 12%;">PRÉLÈV.</th>
                            <th style="width: 15%; text-align: right;">MONTANT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.rows.map(row => `
                            <tr>
                                <td>${formatDate(row.date)}</td>
                                <td>${row.details}</td>
                                <td>${row.mode}</td>
                                <td>${row.by}</td>
                                <td>${formatMonthToDate(row.month)}</td>
                                <td style="text-align: right; font-weight: 700;">${formatCurrency(row.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        });

        bodyHtml = `
            <div class="page">
                <div class="header">
                    <div class="comp-info">
                        <h2>${company.name || 'Ma Société'}</h2>
                        <p>${company.address || ''}</p>
                    </div>
                    <div class="report-title">
                        <h1>${title}</h1>
                        <p>${periodLabel}</p>
                    </div>
                </div>
                <div class="employee-section">
                    ${tableRowsHtml}
                    <div style="margin-top: 30px; padding: 20px; background: #1e3a8a; color: white; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; text-transform: uppercase; font-size: 1.1rem;">TOTAL GÉNÉRAL À DÉDUIRE :</span>
                        <span style="font-size: 1.5rem; font-weight: 900;">${formatCurrency(globalTotal)}</span>
                    </div>
                </div>
                <div class="footer">
                    <span>Généré le ${new Date().toLocaleString('fr-FR')}</span>
                    <span>CaissePro v6.0</span>
                </div>
            </div>
        `;
    } else {
        // INDIVIDUAL MODE
        employees.forEach((empName, index) => {
            const data = empMap[empName];
            if (!data) return;

            bodyHtml += `
                <div class="page">
                    <div class="header">
                        <div class="comp-info">
                            <h2>${company.name || 'Ma Société'}</h2>
                            <p>${company.address || ''}</p>
                        </div>
                        <div class="report-title">
                            <h1>${title}</h1>
                            <p>${periodLabel}</p>
                            <p>Édité le: ${new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>

                    <div class="employee-section">
                        <div class="employee-header">
                            <span class="employee-name">EMPLOYÉ : ${empName.toUpperCase()}</span>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 12%;">DATE</th>
                                    <th style="width: 10%;">RÉF</th>
                                    <th style="flex: 1;">LIBELLÉ / OBJET</th>
                                    <th style="width: 20%;">MODE / PAR</th>
                                    <th style="width: 10%; text-align: center;">MOIS</th>
                                    <th style="width: 15%; text-align: right;">MONTANT</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.rows.map(row => `
                                    <tr>
                                        <td>${formatDate(row.date)}</td>
                                        <td style="color: #4f46e5; font-weight: 700;">${row.id}</td>
                                        <td>${row.details}</td>
                                        <td>${row.mode} / ${row.by}</td>
                                        <td style="text-align: center; font-weight: 700; color: #b91c1c;">${formatMonthToDate(row.month)}</td>
                                        <td style="text-align: right; font-weight: 700;">${formatCurrency(row.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="4" style="text-align: right; padding: 15px; text-transform: uppercase;">Total à déduire :</td>
                                    <td style="text-align: right; padding: 15px; font-size: 1.2rem; color: #b91c1c;">${formatCurrency(data.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div class="signature-box">
                        <div>
                            <p style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">Signature Employé</p>
                            <div class="sig-line"></div>
                            <p style="font-size: 0.6rem; color: #94a3b8;">(Lu et approuvé)</p>
                        </div>
                        <div>
                            <p style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">Direction / Caisse</p>
                            <div class="sig-line"></div>
                        </div>
                    </div>

                    <div class="footer">
                        <span>CaissePro v6.0</span>
                        <span>Fiche ${index + 1} / ${employees.length}</span>
                    </div>
                </div>
            `;
        });
    }

    const fullHtml = headHtml + bodyHtml + "</body></html>";

    // Open window ONLY after content is ready
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up d'impression bloqué.");
        return;
    }

    try {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();

        setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.focus();
                printWindow.print();
            }
        }, 800);
    } catch (err) {
        console.error("Erreur:", err);
    }
}

function printBatchReceipts(ids) {
    if (!ids || ids.length === 0) {
        alert("Veuillez sélectionner au moins une opération.");
        return;
    }

    const template = document.getElementById('receipt-template');
    const comp = appData.company || {};

    // Prepare full HTML content first
    let pagesHtml = "";
    for (let i = 0; i < ids.length; i += 3) {
        let chunkHtml = "";
        const chunk = ids.slice(i, i + 3);

        chunk.forEach(id => {
            const t = appData.transactions.find(tx => tx.id === parseInt(id));
            if (!t) return;

            const clone = template.content.cloneNode(true);
            const receiptDiv = clone.querySelector('.receipt');

            // Populate Clone
            receiptDiv.querySelector('.val-comp-name').textContent = comp.name || 'CaissePro';
            receiptDiv.querySelector('.val-comp-details').textContent = `${comp.sigle || ''} ${comp.number ? ' - ' + comp.number : ''} | ${comp.address || ''}`;
            receiptDiv.querySelector('.val-id').textContent = t.pieceNumber || t.id;
            receiptDiv.querySelector('.val-date').textContent = formatDate(t.date);
            receiptDiv.querySelector('.val-partner').textContent = t.partner || '-';
            receiptDiv.querySelector('.val-amount').textContent = formatCurrency(t.amount);
            receiptDiv.querySelector('.val-category').textContent = t.category;
            receiptDiv.querySelector('.val-details').textContent = t.details || '';
            receiptDiv.querySelector('.val-method').textContent = t.paymentMode;
            receiptDiv.querySelector('.val-remettant').textContent = t.agentRemettant || '-';
            receiptDiv.querySelector('.val-executor').textContent = t.executor || '-';
            receiptDiv.querySelector('.val-user').textContent = t.user || 'Admin';
            receiptDiv.querySelector('.val-caisse').textContent = t.caisse || 'général';
            receiptDiv.querySelector('.val-obs').textContent = t.observation || '-';

            const logoImg = receiptDiv.querySelector('.val-logo');
            if (comp.logo && logoImg) {
                logoImg.src = comp.logo;
                logoImg.style.display = 'block';
            }

            const monthRow = receiptDiv.querySelector('.val-row-month');
            if (t.advanceMonth && monthRow) {
                monthRow.style.display = 'block';
                receiptDiv.querySelector('.val-advance-month').textContent = t.advanceMonth;
            }

            chunkHtml += `<div class="receipt-container">${receiptDiv.outerHTML}</div>`;
        });
        pagesHtml += `<div class="print-page-3">${chunkHtml}</div>`;
    }

    const fullHtml = `
        <html>
        <head>
            <title>Impression Groupée - Pièces de Caisse</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                body { margin: 0; padding: 0; background: #fff; }
                .print-page-3 { width: 210mm; height: 297mm; padding: 0; display: flex; flex-direction: column; page-break-after: always; box-sizing: border-box; }
                .receipt-container { height: 99mm; box-sizing: border-box; padding: 10mm; display: flex; flex-direction: column; justify-content: center; position: relative; }
                .receipt-container:not(:last-child)::after { content: ""; position: absolute; bottom: 0; left: 5mm; right: 5mm; border-bottom: 2px dashed #94a3b8; }
                .receipt { height: 100%; max-height: 85mm; margin: 0 !important; padding: 20px !important; border: 2px solid #1e293b !important; border-radius: 8px; background: #fcfaf2 !important; }
                .receipt * { color: #1e293b !important; font-family: 'Inter', sans-serif; }
                @media print { body { -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            ${pagesHtml}
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up bloqué.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();

    setTimeout(() => {
        if (!printWindow.closed) {
            printWindow.focus();
            printWindow.print();
        }
    }, 1000);
}

window.printPersonnelState = printPersonnelState;
window.printBatchReceipts = printBatchReceipts;

function exportToExcel(rhMode, printMode, selection, startDate, endDate) {
    const cat = (rhMode || 'ACOMPTE').toUpperCase();
    let txs = (appData.transactions || []).filter(t => {
        const tCat = (t.category || '').toUpperCase();
        if (tCat !== cat) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });

    if (printMode === 'individual' && selection) {
        txs = txs.filter(t => (t.partner || '').toLowerCase() === selection.toLowerCase());
    } else if (printMode === 'except' && selection) {
        txs = txs.filter(t => (t.partner || '').toLowerCase() !== selection.toLowerCase());
    }

    if (txs.length === 0) {
        alert('Aucune donnée à exporter.');
        return;
    }

    // Format data for Excel with all requested fields
    const data = txs.map(t => ({
        'N° PIÈCE': t.pieceNumber || t.id,
        'DATE': t.date,
        'BÉNÉFICIAIRE': t.partner,
        'REMETTANT': t.agentRemettant || '-',
        'EXÉCUTANT': t.executor || '-',
        'CATÉGORIE': t.category,
        'DÉTAILS': t.details || '-',
        'OBSERVATION': t.observation || '-',
        'MONTANT': t.amount,
        'MODE PAIEMENT': t.paymentMode,
        'RÉF / NUMÉRO': t.paymentref || '-',
        'MOIS DÉDUC.': t.advanceMonth || '-',
        'AGENT (UTILISATEUR)': t.user,
        'CAISSE': t.caisse
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    // Download file
    const filename = `CaissePro_${cat}_${startDate || 'Tout'}_au_${endDate || 'Auj'}.xlsx`;
    XLSX.writeFile(wb, filename);
}
window.exportToExcel = exportToExcel;

function exportSaisieHistoryToExcel(startDate, endDate) {
    let txs = (appData.transactions || []);
    if (startDate) txs = txs.filter(t => t.date >= startDate);
    if (endDate) txs = txs.filter(t => t.date <= endDate);

    // Filter out initial balances if needed
    txs = txs.filter(t => t.category !== 'Dette Initiale' && t.category !== 'Créance Initiale');

    if (txs.length === 0) {
        alert('Aucune donnée à exporter.');
        return;
    }

    // Format data for Excel
    const data = txs.map(t => ({
        'N° PIÈCE': t.pieceNumber || t.id,
        'DATE': t.date,
        'HEURE': t.time || '-',
        'CODE': t.code || '-',
        'BÉNÉFICIAIRE': t.partner || '-',
        'REMETTANT': t.agentRemettant || '-',
        'EXÉCUTANT': t.executor || '-',
        'CATÉGORIE': t.category,
        'DÉTAILS': t.details || '-',
        'OBSERVATION': t.observation || '-',
        'MONTANT': t.amount,
        'MODE PAIEMENT': t.paymentMode,
        'REF / NUMÉRO': t.paymentref || '-',
        'AGENT': t.user,
        'CAISSE': t.caisse
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historique Saisies");

    const filename = `Historique_Saisies_${startDate || 'Tout'}_au_${endDate || 'Auj'}.xlsx`;
    XLSX.writeFile(wb, filename);
}
window.exportSaisieHistoryToExcel = exportSaisieHistoryToExcel;
