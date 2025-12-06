# ⌨️ AI Code Typer: Sharpen Your Coding Speed

![Project Status](https://img.shields.io/badge/Status-Active-success) ![Tech Stack](https://img.shields.io/badge/Stack-React_|_Vite_|_TypeScript-blue) ![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)

An interactive web application built to help developers improve their typing speed and accuracy by practicing on **AI-generated code snippets** and **general typing exercises**.

## 🔗 Live Application

### [🚀 Launch Live App](https://naseem-2917.github.io/ai-code-typer/)

---

## ✨ Key Features

### ☁️ Cloud Sync & Authentication (New!)
* **Google Sign-In:** One-click login to save your progress securely.
* **Cross-Device Sync:** Start practicing on your laptop, continue on your mobile. Data syncs in **real-time**.
* **Hybrid Storage:** Works perfectly without login (Guest Mode uses LocalStorage). Data automatically merges when you sign in.

### 📊 Gamified Dashboard (New!)
* **GitHub-Style Heatmap:** Visualize your daily consistency with a green activity calendar.
* **Level System:** Earn XP and level up from "Novice" to "Code Master".
* **Badges & Achievements:** Unlock badges for milestones like High WPM (⚡ Speedster) or High Accuracy (🎯 Sniper).
* **Performance Charts:** Interactive graphs to track your WPM and Accuracy trends over time.

### 🧠 AI-Powered Practice
* **Infinite Snippets:** Practice on unique coding snippets generated endlessly by Gemini AI via a secure proxy.
* **Multi-Language Support:** Python, JavaScript, C++, Java, and more.
* **Difficulty Levels:** Structured levels (Easy, Medium, Hard) for progressive improvement.

### 🎯 Targeted Improvement
* **Weak Key Analysis:** The app tracks errors for every specific key you type.
* **Smart Recommendations:** Identifies your top weakest keys automatically and offers a "Practice These Keys" mode.

### 🏆 Dynamic Goal System
* **Set Goals:** Define targets for WPM, Accuracy, and Daily Practice Time.
* **Smart Suggestions:** The app intelligently suggests increasing your goals once you consistently achieve them.

### 🛠 UI & Accessibility
* **Customizable:** Light/Dark themes, adjustable font sizes, and a virtual hand guide.
* **Mobile Optimized:** A clean, vertical layout designed specifically for phones and tablets.
* **Accessibility:** Full keyboard navigation support and conflict-free shortcuts (Alt + Key).

---

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** CSS / Tailwind (Responsive Design)
* **Backend (Data & Auth):** Firebase (Authentication & Firestore)
* **AI Proxy:** Cloudflare Workers (Serverless)
* **AI Engine:** Google Gemini API (v1beta)
* **Visualization:** Recharts, React Activity Calendar

---

## ⚙️ Run Locally

Running this project locally is simple.

### 1. Clone the Repository
```bash
git clone https://github.com/naseem-2917/ai-code-typer.git
cd ai-code-typer
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Start Development Server
```bash
npm run dev
```
> **🔒 Security Note:**
> 1. **AI Key:** You do **not** need to configure a Gemini API key locally. The app communicates with a deployed **Cloudflare Worker** that holds the secret key.
> 2. **Firebase:** The project includes a public Firebase client config. This is standard practice and safe, as security is handled via Firestore Rules.

## 🚀 Architecture & Security

This project employs a modern, secure, and hybrid architecture:

1. **AI Generation:**
   * Frontend -> **Cloudflare Worker** (Proxy) -> Google Gemini API.
   * *Benefit:* The Gemini API Key is hidden on the server-side and never exposed to the client.

2. **User Data & Sync:**
   * Frontend -> **Firebase Authentication** (Identity) -> **Firestore** (Database).
   * *Benefit:* Real-time data synchronization across devices and persistent storage.

3. **Deployment:**
   * Automatically deployed to **GitHub Pages** via GitHub Actions on every push to the `main` branch.

---

Made with ❤️ by [Naseem Khan](https://github.com/naseem-2917)
