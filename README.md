# Parth Healthcare & Hospital, Julana

A hospital management website for **Parth Healthcare & Hospital**, Julana (JIND, Haryana).

React front end with modules for patient records, admissions, discharges, treatments
and care plans, and doctor appointments. It runs in two modes:

| Mode | Backend | Used for |
| --- | --- | --- |
| **Local development** | Express API + JSON file database | Everyday development, offline work |
| **Free hosting** | Firebase Hosting + Firestore | The live website, at no cost |

The two backends implement the same interface, so every page works against either
without changes. `npm run check:parity` verifies they stay in sync.

---

## 1. What the site does

- **Patients** — register with UHID, demographics, blood group, allergies, medical
  history; search and filter; full care history per patient.
- **Admissions** — admit a patient, pick a ward and an unoccupied bed, set the reason.
  The daily charge is derived from the bed type. Occupied beds are struck through.
- **Treatments** — care plans with category, treating doctor, dates and progress;
  progress bars and one-tap start/complete/+25%.
- **Appointments** — book an OPD slot. Slot availability is fetched live from the
  backend, so a double-booked slot cannot be selected, and the server rejects it too.
- **Discharges** — clinical summary, condition, medicines, advice, follow-up date and
  bill. Discharging frees the bed automatically and blocks a second discharge.
- **Doctors** — departments, qualifications, OPD days, fees and bookable slots.
- **Dashboard** — headcounts, bed occupancy, revenue collected vs outstanding, and
  today's schedule.

---

## 2. Run it locally (no internet needed)

Two terminals.

**Terminal 1 — API**

```bash
cd server
npm install
npm run seed     # optional: 28 demo patients, 8 doctors, stays, appointments
npm run dev      # http://localhost:4000
```

**Terminal 2 — website**

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

Open <http://localhost:5173>. Vite proxies `/api` to port 4000, so there is no CORS
setup to do.

Useful server commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm run seed` | Fill an empty database with demo data |
| `npm run reset` | Wipe and refill the demo data |
| `node scripts/test-api.js --auto` | Run the 31 API tests (starts and stops its own server) |

---

## 3. Free hosting on Firebase

### Why Firestore and not the Express API

Cloud Functions **cannot** be used on Firebase's free plan. Google's documentation
states that *"Cloud Functions for Firebase requires that your project be on the Blaze
pricing plan."* So a free Firebase deployment must be **static files + Firestore**.

That is why the data layer is pluggable: the hosted site runs against Firestore, while
the Express server stays available for local work.

### Confirmed free allowances (Spark plan, no credit card)

| Product | Free quota |
| --- | --- |
| Hosting | 10 GB storage, 360 MB/day transfer, free SSL and custom domain |
| Firestore | 1 GiB stored, 20K writes/day, 50K reads/day, 10 GiB/month egress |
| Authentication | Free (email/password) |

### Step 1 — create the project

1. Go to <https://console.firebase.google.com> and **Add project**.
2. Name it (for example `parth-healthcare`), disable Google Analytics if you do not
   need it, and create.
3. Stay on the **Spark (free)** plan. Do not upgrade to Blaze.

### Step 2 — register a web app

1. Project overview (the house icon) → **Add app** → **Web**.
2. Give it a nickname, for example `parth-web`.
3. Firebase shows a `firebaseConfig` object. Keep this page open.

### Step 3 — create Firestore

1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose **Production mode** and the region closest to your users
   (`asia-south1` for India). Production mode matters: it starts with all access denied,
   which is what you want for patient records.
3. Do not change any security rules yet — the deploy step publishes the safe ones.

### Step 4 — enable Email/Password sign-in

1. Left menu → **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable **Email/Password** → **Save**.

### Step 5 — install the Firebase CLI and sign in

```bash
npm install -g firebase-tools
firebase login
```

### Step 6 — connect the folder

From the `client` folder:

```bash
firebase use --add
```

Pick your project and give it an alias (for example `parth-healthcare`).

### Step 7 — configure environment variables

```bash
cp .env.example .env.local      # macOS/Linux: cp
```

Paste the `firebaseConfig` values from Step 2 into `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=parth-healthcare.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parth-healthcare
VITE_FIREBASE_STORAGE_BUCKET=parth-healthcare.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
VITE_DATA_BACKEND=firestore
```

`.env.local` is gitignored. These web config values are designed to be public, but
never commit a service account key.

Verify locally before deploying:

```bash
npm run dev
```

You should see the sign-in screen.

### Step 8 — create your first staff account

Do this **before** sharing the site, otherwise nobody can get in.

In the Firebase console: **Authentication → Users → Add user**, enter an email and
password. Repeat for each staff member. Never create accounts from the website.

### Step 9 — deploy

```bash
npm run build
npm run deploy
```

This publishes the security rules, then uploads the built site. You will get a URL
like `https://parth-healthcare.web.app`.

### Step 10 — add a custom domain (optional)

**Hosting → Add custom domain**, then follow the DNS records Firebase lists. The SSL
certificate is issued automatically and is free.

---

## 4. Securing patient records

`firestore.rules` denies everything to the public:

```js
function isStaff() { return request.auth != null; }
// ...
match /{document=**} { allow read, write: if false; }
```

Every read and write requires a signed-in staff account, and anything not explicitly
listed is refused. This matters because patient records are protected health
information — with permissive rules the whole database would be readable by anyone
who opened the URL.

**Important limitations to understand before using real patient data:**

- **Rules are the only real lock.** Firebase web config values are public by design;
  security rules are what protect the data. Never "test" by loosening the rules.
- **Every signed-in staff account sees every patient.** For finer control, add
  role-based checks using custom claims. `firestore.rules` contains a commented
  `hasRole()` example.
- **Adding App Check** blocks automated scraping of the API by non-browser clients.
  It is worth enabling before real data goes in.
- **Set up budget alerts.** Firestore reads add up if many people use the site at
  once. Billing alerts are free even on the Spark plan.
- **Back up Firestore regularly** (console → Firestore → Export, or scheduled).
  Consider encrypting or restricting exports.

---

## 5. Everyday commands

### Client

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check:parity` | Confirm both backends expose the same methods |
| `npm run deploy` | Build and deploy Hosting + Firestore rules |
| `npm run deploy:rules` | Deploy only the security rules |
| `npm run emulators` | Run local Firebase emulators |

### Server

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API normally |
| `npm run seed` | Fill an empty database with demo data |
| `npm run reset` | Wipe and refill the demo data |
| `node scripts/test-api.js --auto` | Run the API test suite |

---

## 6. Project structure

```
parth-healthcare/
├── client/                        React + Vite + Tailwind (the website)
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js           Express HTTP backend
│   │   │   ├── index.js            chooses a backend, exports `api`
│   │   │   └── useApi.js           loading / error / refresh hooks
│   │   ├── firebase/
│   │   │   ├── config.js           reads VITE_FIREBASE_* values
│   │   │   ├── auth.jsx            sign-in state and route guard
│   │   │   └── firestoreApi.js     Firestore backend
│   │   ├── components/             UI kit, layout, form modal
│   │   ├── pages/                  one file per module
│   │   └── constants.js            hospital info, wards, beds, slots
│   ├── firebase.json               Hosting + Firestore config
│   ├── firestore.rules             security rules
│   └── .env.example               Firebase settings template
└── server/                        Express API (local development)
    ├── src/
    │   ├── index.js                app setup and route mounting
    │   ├── db.js                   JSON file database
    │   ├── validate.js             validation and errors
    │   ├── hospital.js             hospital info and enum values
    │   └── routes/                 one file per resource
    └── scripts/test-api.js         API test suite
```

---

## 7. Hospital details to change before launch

Update these in **both** `server/src/hospital.js` and `client/src/constants.js`:

- Phone number and 24x7 helpline
- Email address
- Full address and pincode
- Logo (`client/public/favicon.svg`)

Also review `DAILY_RATES` (both folders) and the bed list in
`client/src/constants.js` (`BEDS_BY_WARD`) so they match your real wards and charges.
