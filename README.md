# SEED: Smart Ecosystem for Education & Data

SEED is a modern, mobile-first SaaS platform designed to bridge the engagement gap in modern education. Built specifically for schools, teachers, parents, and students, SEED digitizes school management and enhances learning through gamification and AI.

## Features

- **Role-Based Dashboards**: Tailored experiences for Super Admins, School Admins, Teachers, Students, and Parents.
- **Gamified Learning**: Students earn XP and Coins for completing assignments, quizzes, and brain games.
- **AI Study Buddy**: Integrated with Google's Gemini AI to provide a 24/7 personalized tutor.
- **Real-Time Data Analytics**: Parents and admins have instant visibility into attendance, grades, and behavioral insights.
- **Finance & Fee Management**: Automated invoice generation and tracking for school fees.
- **Mobile-First & Lightweight**: Optimized for performance and usability on low-bandwidth networks.

- **Frontend**: React 19, Vite, Tailwind CSS 4, Framer Motion
- **Backend**: Node.js (Express) serverless functions via Vercel
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: @google/genai (Gemini)

## Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Add your `firebase-applet-config.json` and `.env` variables.
4. Run `npm run dev` to start the local development server.

## Deployment

This app is configured for deployment on Vercel. 
- The React application is built via Vite into the `dist/` directory.
- The Express API is mapped via `vercel.json` to the `server.ts` entry file as a serverless function (`/api/*`).
