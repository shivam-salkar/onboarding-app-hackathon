# AI-Powered Multilingual Onboarding Web App

This is a modern, AI-powered onboarding application built for the **Onboarding WebApp Hackathon**. It features a voice-first interface, OCR document extraction, and multilingual support to make digital onboarding seamless and accessible.

## 🚀 Key Features

- **🗣️ AI Voice Assistant**: Natural voice-driven onboarding using ElevenLabs and browser SpeechRecognition API.
- **📄 Smart Document OCR**: Automatic extraction of Name, DOB, PAN, and Aadhaar using Tesseract.js.
- **🌍 Multilingual**: Support for English (EN), Hindi (HI), and Marathi (MR) for inclusive onboarding.
- **🎨 Dynamic Theming**: Branded UI experiences for bank partners (ICICI, SBI, Axis).
- **📝 Real-time Audit Log**: Comprehensive tracking of the KYC process for compliance.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Voice Synthesis**: [ElevenLabs API](https://elevenlabs.io/)
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Internationalization**: [i18next](https://www.i18next.com/)

## 🏁 Getting Started

### Prerequisites

- Node.js 18.x or later
- [ElevenLabs API Key](https://elevenlabs.io/app/settings/api-keys)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-repo]/onboarding-webapp-hackathon.git
   cd onboarding-webapp-hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root:
   ```env
   ELEVENLABS_API_KEY=your_eleven_labs_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📱 Running on Android Chrome

To experience the voice and camera features on a real Android device, the app **must be served over HTTPS**.

### 1. Deployment (Recommended)
Deploy to **Vercel** to get an automatic HTTPS URL.

- **Import Repository**: Connect your GitHub repo to Vercel.
- **Framework**: Ensure **Next.js** is selected.
- **Environment Variables**: Add `ELEVENLABS_API_KEY` in the Project Settings -> Environment Variables.
- **Build Settings**: The default `npm run build` and `npm run dev` are fine.
- **Serverless Warning**: The Demo Audit Log (`/api/kyc/verify`) is currently in-memory. In a serverless environment like Vercel, this state will reset periodically. For production, connect a database (Supabase/Postgres).

### 2. Local Testing (via Ngrok)
If you want to test local changes on your phone:
- Install [ngrok](https://ngrok.com/).
- Run `ngrok http 3000`.
- Open the provided `https://...` URL on your Android device.

### 3. Chrome Flag for Local IP (Experimental)
If you're using your local network IP (e.g., `192.168.1.x:3000`):
- Open Chrome on Android.
- Navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
- Add your local IP and port to the list.
- Relaunch Chrome.

---

## 🏗️ Project Structure

- `src/app/`: Next.js pages and API routes.
- `src/components/`: Reusable UI components and AI orb logic.
- `src/hooks/`: Custom hooks for OCR, Speech, and Voice commands.
- `src/i18n/`: Localization configuration and JSON files.
- `src/providers/`: Context providers for theming and onboarding state.

