# ⌨️ AI Code Typer: Sharpen Your Coding Speed

![Project Status](https://img.shields.io/badge/Status-Active-success) ![Tech Stack](https://img.shields.io/badge/Stack-React_|_Vite_|_TypeScript-blue)

An interactive web application built to help developers improve their typing speed and accuracy by practicing on **AI-generated code snippets** and **general typing exercises**.

## 🔗 Live Application

### [🚀 Launch Live App](https://naseem-2917.github.io/ai-code-typer/)

---

## ✨ Key Features

### 🧠 AI-Powered Practice
* **Infinite Snippets:** Practice on unique coding snippets generated endlessly by Gemini AI via a secure proxy.
* **Multi-Language Support:** Python, JavaScript, C++, Java, and more.
* **Difficulty Levels:** Structured levels (Easy, Medium, Hard) for progressive improvement.

### ⌨️ General Typing Mode
* **Comprehensive Practice:** Master letters, symbols, punctuation, and numbers.
* **Beyond Code:** Boosts overall keyboard familiarity and general typing accuracy.

### 🎯 Targeted Improvement
* **Weak Key Analysis:** The app tracks errors for every specific key you type.
* **Smart Dashboard:** Identifies your top weakest keys automatically.
* **"Practice These Keys":** A dedicated mode to drill specifically on your problem areas.

### 🏆 Dynamic Goal System
* **Set Goals:** Define targets for WPM, Accuracy, and Daily Practice Time.
* **Smart Suggestions:** The app intelligently suggests increasing your goals once you consistently achieve them.

### 📊 Real-Time Metrics & UI
* **Live Stats:** WPM, Accuracy, Error Count, and Timer update in real-time.
* **Visual Feedback:** Per-character highlighting and error tracking.
* **Customizable:** Light/Dark themes, adjustable font sizes, and a virtual hand guide.
* **Mobile Optimized:** A clean, vertical layout designed specifically for phones and tablets.

### 🔄 Data & Accessibility
* **Data Portability:** Export your stats to JSON, Import (Merge/Replace), or Reset data.
* **Offline Capable:** Uses LocalStorage to track history.
* **Accessibility:** Full keyboard navigation support and conflict-free shortcuts (Alt + Key).

---

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** CSS / Tailwind (Responsive Design)
* **Backend/Proxy:** Cloudflare Workers (Serverless)
* **AI Engine:** Google Gemini API (v1beta)

---

## ⚙️ Run Locally

Running this project locally is now easier than ever. **No API keys required on your machine!**

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
> **🔒 Security Note:** You do **not** need to create a `.env` file or configure an API key locally. The application is pre-configured to communicate securely with the deployed **Cloudflare Worker**, which handles all AI requests and keeps the API key hidden from the client side.

## 🚀 Deployment & Security

This project employs a modern, secure architecture:

* **Frontend:** Automatically deployed to **GitHub Pages** via GitHub Actions on every push to the `main` branch.
* **Backend Proxy:** Uses a **Cloudflare Worker** as a middleman to handle API requests.
* **Security:**
    * The Google Gemini API Key is stored securely in **Cloudflare Secrets** (Server-side).
    * The frontend calls the Worker, and the Worker calls Google.
    * **Result:** The API key is never exposed to the browser or public code.

---

Made with ❤️ by [Naseem Khan](https://github.com/naseem-2917)
