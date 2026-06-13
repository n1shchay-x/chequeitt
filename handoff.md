# Master Handoff & Context Document

Welcome, Next Agent! You are picking up context for an ambitious, highly detail-oriented user. This document contains everything you need to know about the user's working style, extreme standards, vision, and the current state of their flagship project (PrismoCare / Gautam Clinic). 

**Read this document thoroughly before writing any code.**

---

## 1. The User: Standards, Workflow & Vision
- **Quality Standard**: The user demands **"S-Tier, MNC-level, Premium"** quality. Do not deliver "Minimum Viable" junk. Every UI element, micro-interaction, and layout must feel expensive, polished, and meticulously thought out.
- **Real-World Practicality**: The user explicitly cares about real-world edge cases. (e.g., "What if the doctor doesn't have the patient's number saved?"). You must think beyond the code and anticipate how a non-technical user (like a busy doctor) will actually interact with the app.
- **Workflow & Version Control**: 
  - The user deploys rapidly using **Vercel** via a connected **GitHub repository**.
  - Every time you make a stable change, you must commit and push the code (`git add .`, `git commit -m "..."`, `git push`) so the user can instantly verify it live on their phone.
  - The user tests heavily on real mobile devices (e.g., Vivo T3 Lite). **"Extreme Mobile Responsiveness"** is mandatory. Nothing should overlap, stretch, or require horizontal scrolling.
- **Future Goals**: The user plans to build multiple SaaS platforms and websites. Maintain this high bar for design aesthetics (vibrant colors, glassmorphism, dynamic animations) and robust architecture across all future projects.

---

## 2. Current Project Overview: PrismoCare (Gautam Clinic)
- **Directory**: `d:\Portfolio\Web Projects\Gautam-clinic`
- **Repo**: `https://github.com/n1shchay-x/gautam-clinic`
- **Vision**: A lightning-fast, premium CRM/Practice Management WebApp for doctors to manage patients, inventory, and billing, and to generate e-Prescriptions instantly via WhatsApp.
- **Tech Stack**: Vanilla HTML, CSS (Custom styling, glassmorphism, Phosphor icons), JavaScript. **No heavy frameworks** (React/Vue/Tailwind) were used to keep the app blazing fast and lightweight.
- **Database Architecture**: 
  - Currently using a **robust Mock Database (`db.js`)** leveraging browser `localStorage`. It is fully capable of handling 100+ patients/day for a 7-day clinic trial.
  - The architecture uses a strict Repository Pattern (`window.db.patients`, `window.db.visits`). This is intentional so that we can easily swap out `localStorage` for **Supabase** in the future when the client upgrades to the "Pro/Cloud" version.

---

## 3. What We Have Accomplished & Mastered
- **Data Integrity & Bug Fixes**: We have implemented auto-scrubbing logic to prevent corrupted data (e.g., visit fees accidentally entered as 10,000,000+).
- **Advanced Dashboard**: Dynamically calculates and displays Daily, Monthly, and Yearly Revenue, alongside "Patients Seen Today" and "Pending Dues", all recalculating cleanly on load.
- **Mobile UI Fixes (The Safari/iOS Overlay Bug)**: We conquered the notorious mobile browser bug where fixed sidebars/overlays get trapped in flexbox stacking contexts. The Mobile Overlay DOM element is physically separated from the App Container, utilizing brute-forced `z-index` values to ensure the hamburger menu works flawlessly on every phone.
- **The PDF & WhatsApp Workflow (Bulletproofed)**: 
  - We use `html2pdf.js` to generate beautiful prescriptions.
  - We initially tried the Web Share API, but realized the **Edge Case**: *Doctors often don't save patient numbers*. 
  - **The Final Solution**: A two-button system in the Visit Modal. 
    1. `[Download PDF]` saves the file.
    2. `[Send on WhatsApp]` downloads the PDF *and* triggers a `wa.me/91...` link with pre-filled text. This opens the exact patient's chat instantly, allowing the doctor to manually attach the PDF from their recent downloads. This guarantees consistency across Desktop and Mobile.

---

## 4. Known Issues & Open Threads
1. **Age Bug**: In a previous session, the user noted: "i put his age 22 but when i opened his profile again the age is 35". *Note: Verify patient update/save logic in `patients.js` if this pops up again.*
2. **Microphone/Voice Notes**: There was an attempt to add Web Speech API Voice-to-Text for clinical notes. If the user asks for this again, ensure cross-browser compatibility (especially on mobile Chrome/Safari).

---

## 5. Instructions for the Next Agent
1. **Read the Room**: The user might ask you to continue working on PrismoCare, OR they might ask you to build a completely new SaaS project from scratch. 
2. **If Continuing PrismoCare**: Your immediate goals are likely UI polish, adding new clinic settings, or preparing the Supabase integration. Always push to Git after a successful change.
3. **If Starting a New Project**: Apply the "S-Tier" design philosophy immediately. Use rich aesthetics, clean layouts, vanilla CSS (unless instructed otherwise), and anticipate edge cases before the user has to point them out. 

**You are now fully synced. Acknowledge this context and ask the user what we are building today!**
