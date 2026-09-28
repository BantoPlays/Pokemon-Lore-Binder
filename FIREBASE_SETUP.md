# 🔵 Firebase setup — about 10 minutes

This version is the **shared online version**. Once Firebase is connected, you and your friend can open the same website and the cards stay synchronized.

## 1. Create the Firebase project

Go to:

https://console.firebase.google.com/

1. Click **Create a project**.
2. Give it a name such as `pokemon-card-binder`.
3. Google Analytics is optional; you can turn it off for this project.
4. Create the project.

## 2. Register the website

Inside the Firebase project:

1. Click the **Web** icon (`</>`).
2. Give the app a nickname such as `Pokemon Binder`.
3. Click **Register app**.
4. Firebase will show a `firebaseConfig` object.

Open the file in this ZIP called:

`firebase-config.js`

Copy the values from Firebase into that file.

Do NOT put a Firebase service-account private key in this file.

## 3. Turn on Anonymous Authentication

Firebase Console → **Authentication** → **Sign-in method** → **Anonymous** → Enable → Save.

This lets the site give each visitor a Firebase user identity without requiring you and your friend to create accounts.

## 4. Create Firestore

Firebase Console → **Firestore Database** → **Create database**.

Choose a location close to you (for example, a North American region).

Start in production mode.

Then open **Rules** and replace the rules with:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /cards/{cardId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click Publish.

### What this means

Only authenticated Firebase users can read/write the card collection. The website uses anonymous authentication, so normal visitors don't have to make an account.

Because this is a private fan-made binder rather than a public business app, this is a simple setup. Anyone who can access the website can potentially add/edit cards, so don't use it for sensitive information.

## 5. Put the files on GitHub

Create a public repository on GitHub.

Upload these:

- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `assets/bulbasaur_corner.png`
- `assets/snorlax_corner.png`

GitHub Pages can publish the repository as a live website.

## 6. Turn on GitHub Pages

Repository → **Settings** → **Pages**

Under **Build and deployment**:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/ (root)**

Save.

GitHub says Pages sites can be published directly from a repository, and project sites normally use a URL like:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

It can take a few minutes for the first deployment.

## 7. Test it

Open your new website.

You should see:

**Shared collection online**

Then upload a test card to #001.

Open the website in another browser/device.

The card should appear there too.

## Important: card images

This version stores resized card images directly in Firestore instead of Firebase Cloud Storage. That keeps the setup simpler and avoids requiring Cloud Storage.

Firebase's Firestore has a no-cost quota, including 1 GiB stored data, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day for the standard free quota. Your two-person binder should be far below those limits under normal use.

Cloud Storage for Firebase currently requires the Blaze pay-as-you-go plan, so this version deliberately does not depend on Cloud Storage.

## Optional later upgrade

If the set becomes very large or you want full-resolution card images, we can switch the image storage to Firebase Cloud Storage.

