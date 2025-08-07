# 🛍️ AI Marketplace App

A modern React Native marketplace app powered by AI, built with Expo, Supabase, and Google Gemini AI.

## ✨ Features

- 🤖 **AI-Powered Product Listing** - Upload photos and get auto-generated titles, descriptions, and prices
- 🔐 **User Authentication** - Secure login/signup with Supabase Auth
- 💰 **Purchase System** - Complete buying flow with real-time status updates
- 📱 **Real-time Notifications** - Get notified when your items sell
- 🏪 **Product Management** - List, edit, and track your products
- 🔍 **Search & Filter** - Find products by category and search terms
- 📊 **Purchase History** - Track all your buying activity

## 🛠️ Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Database, Auth, Storage)
- **AI**: Google Gemini API via Firebase Functions
- **Navigation**: Expo Router
- **UI**: React Native with custom styling
- **State Management**: React Hooks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase account
- Google AI Studio account
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Geethik26/ai-marketplace-app.git
   cd ai-marketplace-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions
   npm install
   cd ..
   ```

3. **Set up environment variables**
   
   **Main app (.env):**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   ```

   **Firebase Functions (functions/.env):**
   ```bash
   cp functions/.env.example functions/.env
   ```
   Fill in your Gemini AI API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## 🛡️ Security Features

- ✅ Environment variables for all sensitive data
- ✅ Row Level Security (RLS) on all database tables
- ✅ Secure authentication with Supabase Auth
- ✅ API keys stored server-side only
- ✅ Input validation and sanitization

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Built with ❤️ using React Native and AI

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
