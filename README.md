# Daily LeetCode Solutions

A read-only public LeetCode solution archive with a private admin dashboard.

## Run locally

```powershell
npm start
```

Open:

- Public site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Default admin password:

```text
Lc$9vQ2!mR7#zT4@pX8&wN6
```

For real use, set a stronger password before starting:

```powershell
$env:ADMIN_PASSWORD="your-strong-password"
npm start
```

## What it includes

- Public visitors can only view posted solutions.
- Admin can import LeetCode questions by number.
- Admin can post approach notes and C++, Python, and Java solutions.
- Local testing stores posts in `data/store.json`.
- Production can use Firebase Firestore so posts are stored online, not on your laptop.
- Analytics include total views, views per day, and views for each question.

## Production database

Use Firebase Firestore for the deployed site. Firebase has the largest free database storage among the options we compared: 1 GiB on the Spark plan.

Install dependencies once:

```powershell
npm install
```

Then start with Firebase enabled:

```powershell
$env:DATABASE_PROVIDER="firebase"
$env:ADMIN_PASSWORD="your-strong-password"
$env:SESSION_SECRET="a-long-random-secret"
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\to\firebase-service-account.json"
npm start
```

On hosting platforms, store the service account as a base64 environment variable instead:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_BASE64="base64-version-of-service-account-json"
```

Firestore collections used:

- `solutions`
- `views`

## Notes

The LeetCode importer uses LeetCode's public GraphQL endpoint from the server. If LeetCode changes or blocks that endpoint, manual editing still works from the admin form.
