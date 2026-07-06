const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBM5b-ykrFZjMxU4MwazUnC1UpRNK1DmzU",
    authDomain: "caissepro-49c26.firebaseapp.com",
    projectId: "caissepro-49c26",
    storageBucket: "caissepro-49c26.firebasestorage.app",
    messagingSenderId: "973944734810",
    appId: "1:973944734810:web:b09ef2d71101415d144463"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    try {
        const docRef = doc(db, 'caisses', 'caissepro_data');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            console.log("SUCCESS! Data size:", JSON.stringify(snap.data()).length);
        } else {
            console.log("SUCCESS! Document does not exist yet.");
        }
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
