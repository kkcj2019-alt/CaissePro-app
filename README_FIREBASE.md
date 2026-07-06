Firebase security notes and deployment

1) Deploy rules

 - Ensure you have the Firebase CLI installed and you're in the project that
   corresponds to `projectId` in `firebase_config.js`.

 - To deploy the included rules file:

```bash
firebase deploy --only firestore:rules --project caissepro-49c26
```

2) Use Firebase Authentication and custom claims

 - Use Firebase Auth to sign-in users from the client.
 - Use the Admin SDK (example: `scripts/set_admin_claims.js`) to set
   `role: 'admin'` for administrator accounts.

3) Data model suggestion

 - For fine-grained access control, avoid storing sensitive arrays/objects as
   fields inside a single document. Instead split `agents` and `parametres`
   into their own collections/documents so Firestore rules can protect them.
