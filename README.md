# Photo Sharing App (NeonShare)

A modern photo-sharing application built with Next.js and Firebase.

## Features

- 🔐 Google Sign-In & Traditional Authentication
- 📸 Photo Upload & Sharing
- 👥 Friends System
- 🏷️ Photo Tagging
- ☁️ Firebase Firestore Database
- 🚀 Deployed on Firebase Hosting

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/SAMEER-40/Neonshare.git
cd Neonshare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

You can get these values from your Firebase Console → Project Settings → General.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Build for Production

```bash
npm run build
```

## Firebase Configuration

### Firestore Security Rules

The app uses Firestore with the following collections:
- `users` - User profiles and friend lists
- `photos` - Photo metadata and tags

Make sure to configure appropriate security rules in your Firebase Console.

### Firebase Hosting Deployment

```bash
npm run build
firebase deploy
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth (Google & Email/Password)
- **Hosting**: Firebase Hosting
- **Styling**: CSS Modules

## Live Demo

🌐 [https://capture-c1507.web.app](https://capture-c1507.web.app)

## License

MIT
