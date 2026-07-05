// ============================================================
// FIREBASE CONFIGURATION - CaissePro
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Configuration Firebase ----
const firebaseConfig = {
    apiKey: "AIzaSyBM5b-ykrFZjMxU4MwazUnC1UpRNK1DmzU",
    authDomain: "caissepro-49c26.firebaseapp.com",
    projectId: "caissepro-49c26",
    storageBucket: "caissepro-49c26.firebasestorage.app",
    messagingSenderId: "973944734810",
    appId: "1:973944734810:web:b09ef2d71101415d144463"
};

// ---- Initialisation Firebase ----
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Activer la persistance hors-ligne (cache local IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('[Firebase] Persistance impossible: plusieurs onglets ouverts.');
    } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] Persistance non supportée par ce navigateur.');
    }
});

// ============================================================
// IDENTIFIANT DU DOCUMENT FIRESTORE
// Toutes les données de l'app sont stockées dans un seul document:
// Collection: "caisses" / Document: "caissepro_data"
// ============================================================
const FIRESTORE_DOC_ID = "caissepro_data";
const FIRESTORE_COLLECTION = "caisses";

// ============================================================
// FONCTION: Sauvegarder les données dans Firestore
// ============================================================
async function saveToFirestore(data) {
    try {
        const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
        await setDoc(docRef, {
            ...data,
            _lastUpdated: new Date().toISOString(),
            _version: 1
        });
        console.log('[Firebase] ✅ Données sauvegardées dans Firestore.');
        return true;
    } catch (error) {
        console.error('[Firebase] ❌ Erreur de sauvegarde:', error);
        return false;
    }
}

// ============================================================
// FONCTION: Charger les données depuis Firestore
// ============================================================
async function loadFromFirestore() {
    try {
        const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log('[Firebase] ✅ Données chargées depuis Firestore.');
            const data = docSnap.data();
            // Supprimer les champs internes Firebase avant de retourner
            delete data._lastUpdated;
            delete data._version;
            return data;
        } else {
            console.log('[Firebase] ℹ️ Aucune donnée dans Firestore. Utilisation des données locales.');
            return null;
        }
    } catch (error) {
        console.error('[Firebase] ❌ Erreur de chargement:', error);
        return null;
    }
}

// ============================================================
// FONCTION: Écouter les changements en temps réel (sync multi-appareil)
// ============================================================
function listenToFirestore(callback) {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            delete data._lastUpdated;
            delete data._version;
            callback(data);
        }
    }, (error) => {
        console.error('[Firebase] ❌ Erreur de synchronisation:', error);
    });
}

// ============================================================
// INDICATEUR DE STATUT DE CONNEXION
// ============================================================
function showFirebaseStatus(status) {
    let indicator = document.getElementById('firebase-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'firebase-status';
        indicator.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 24px;
            z-index: 99998;
            display: flex;
            align-items: center;
            gap: 6px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 5px 12px;
            font-family: 'Inter', sans-serif;
            font-size: 0.72rem;
            font-weight: 700;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(indicator);
    }

    const configs = {
        syncing: { color: '#f59e0b', dot: '🟡', text: 'Synchronisation...' },
        synced: { color: '#10b981', dot: '🟢', text: 'Firebase Sync ✓' },
        offline: { color: '#6b7280', dot: '⚫', text: 'Hors ligne (local)' },
        error: { color: '#ef4444', dot: '🔴', text: 'Erreur Firebase' },
    };

    const cfg = configs[status] || configs.offline;
    indicator.style.color = cfg.color;
    indicator.innerHTML = `<span>${cfg.dot}</span>${cfg.text}`;

    // Masquer l'indicateur "synced" après 4 secondes
    if (status === 'synced') {
        clearTimeout(indicator._hideTimeout);
        indicator._hideTimeout = setTimeout(() => {
            indicator.style.opacity = '0';
        }, 4000);
    } else {
        indicator.style.opacity = '1';
    }
}

// ============================================================
// EXPORT DES FONCTIONS (disponibles globalement)
// ============================================================
window.FirebaseDB = {
    save: saveToFirestore,
    load: loadFromFirestore,
    listen: listenToFirestore,
    showStatus: showFirebaseStatus,
    isAvailable: true
};

console.log('[Firebase] ✅ Module Firebase/Firestore initialisé.');
