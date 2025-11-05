<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ⌨️ AI Code Typer: Sharpen Your Coding Speed

This is an interactive web application built to help developers improve their typing speed and accuracy by practicing on **AI-generated coding snippets** across various languages and difficulties, powered by Google's Gemini models.

## 🔗 Live Application

**View the live application here:**
[https://serene-eclair-8521bb.netlify.app/](https://serene-eclair-8521bb.netlify.app/)

## ⚙️ Run Locally

This project uses **Vite** and **React** with **TypeScript**.

**Prerequisites:** Node.js (v18+)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/naseem-2917/ai-code-typer.git](https://github.com/naseem-2917/ai-code-typer.git)
    cd ai-code-typer
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set API Key (Crucial Step):**
    Create a file named **`.env.local`** in the root directory and add your key in the Vite-compatible format:
    ```
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```
4.  **Run the app:**
    ```bash
    npm run dev
    ```

## 🚀 Continuous Deployment (CI/CD)

This application is automatically deployed via **Netlify**. Any changes pushed to the `main` branch trigger an automatic build and update of the live site, enabling "Vibe Coding."
