# How to Run PathoTrace Mobile Application

This project is built using **React Native with Expo (Expo SDK 58)**, **Expo Router**, and **TypeScript**.

---

## 1. Prerequisites

Before running the application, make sure you have the following installed on your development machine:

- **Node.js**: `v20.x` or later (LTS / Current, e.g. Node 22 or Node 24)
- **Package Manager**: `npm` (bundled with Node.js) or `yarn` / `pnpm` / `bun`
- **Mobile Device or Emulator**:
  - **Android**: Android Studio emulator or physical Android device with the **Expo Go** app installed from Google Play.
  - **iOS** (macOS required for local iOS simulator): iOS Simulator via Xcode or physical iPhone with the **Expo Go** app from the App Store.
  - **Web**: Supported directly in Google Chrome, Edge, Safari, or Firefox.

---

## 2. Installation

Clone the repository and install all dependencies:

```bash
git clone <repository-url>
cd PathoTrace-mobile-app

# Install dependencies
npm install
```

> [!NOTE]
> All dependencies are strictly locked and validated against Expo SDK 58 to prevent any dependency conflicts.

---

## 3. Running the Application

Start the Expo development server:

```bash
npm start
```

Once the Metro bundler starts, you will see a QR code in the terminal and a menu of options:

### A. Run on Physical Device (Android / iOS)
1. Install **Expo Go** on your Android or iOS device.
2. Ensure your phone and development computer are connected to the **same Wi-Fi network**.
3. Open the camera app (iOS) or Expo Go app (Android) and scan the QR code displayed in the terminal.

### B. Run on Android Emulator
Press `a` in the terminal while Metro is running, or execute:
```bash
npm run android
```

### C. Run on iOS Simulator (macOS only)
Press `i` in the terminal while Metro is running, or execute:
```bash
npm run ios
```

### D. Run on Web Browser
Press `w` in the terminal while Metro is running, or execute:
```bash
npm run web
```

---

## 4. Useful Scripts

| Command | Description |
|---|---|
| `npm start` | Starts the Expo development server / Metro bundler |
| `npm run android` | Starts Metro and opens the app in an Android emulator/device |
| `npm run ios` | Starts Metro and opens the app in an iOS simulator (macOS) |
| `npm run web` | Starts Metro with web support |
| `npm run lint` | Runs ESLint to check code formatting and quality |
| `npx tsc --noEmit` | Runs TypeScript compiler type checking without emitting files |

---

## 5. Troubleshooting

- **Clear Metro Cache:**
  If you encounter caching issues, restart Metro with cache cleared:
  ```bash
  npx expo start -c
  ```

- **Check Project Health:**
  Verify that all Expo packages and dependencies are properly aligned:
  ```bash
  npx expo-doctor
  ```
