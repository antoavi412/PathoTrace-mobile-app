# Building an installable Android APK

This project is a managed Expo app (no `android/` folder is committed), so the APK
is built in GitHub Actions: the workflow generates the native project with
`expo prebuild`, then runs Gradle `assembleRelease`.

Workflow file: `.github/workflows/build-android-apk.yml`

---

## 1. Run it

**Automatically:** push to `main` (or `master`).

**Manually:** GitHub → **Actions** → **Build Android APK** → **Run workflow**.

You can optionally type a backend URL in the `api_url` input for that single run.

## 2. Download the APK

1. Open the finished workflow run.
2. Scroll to **Artifacts**.
3. Download **PathoTrace-APK** (a `.zip` containing `PathoTrace-1.0.0.apk`).

## 3. Install it on a phone

1. Unzip the artifact and copy the `.apk` to the phone (USB, Drive, Telegram, etc.).
2. Open the file on the phone and allow **"Install unknown apps"** for the app you
   used to open it (Files / Chrome).
3. Install and launch **PathoTrace**.

> The APK is signed with the standard Android **debug keystore**, which is fine for
> testing and sideloading. It is not suitable for the Play Store (see below).

---

## 4. Setting the backend URL

`EXPO_PUBLIC_*` values are compiled into the JavaScript bundle, so they must be
known **before** the build.

- **Repository variable (recommended):** GitHub → **Settings** → **Secrets and
  variables** → **Actions** → **Variables** → **New repository variable**
  - Name: `EXPO_PUBLIC_API_URL`
  - Value: e.g. `https://api.example.com` (no trailing slash)
- **One-off:** pass `api_url` when running the workflow manually.

If it is left empty, the app starts in its built-in demonstration mode, exactly
like running locally without a `.env` file.

---

## 5. Publishing to Google Play (optional)

The Play Store rejects debug-signed APKs. To ship a properly signed build:

1. Create an upload keystore locally:

   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore upload.keystore -alias pathotrace \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Base64-encode it: `base64 -w0 upload.keystore > upload.keystore.b64`
3. Add these repository **secrets**: `ANDROID_KEYSTORE_BASE64`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
4. Decode the keystore in the workflow before the Gradle step and point the release
   signing config at it (`android/app/build.gradle(.kts)`).

For Play Store releases, Google recommends **AAB** (`./gradlew :app:bundleRelease`)
uploaded to the Play Console instead of an APK.

---

## 6. Notes / troubleshooting

- **`npm ci` fails** → `package-lock.json` is out of sync with `package.json`; run
  `npm install` locally and commit the lockfile.
- **`SDK location not found`** → the runner's Android SDK env vars are missing;
  the workflow already installs the needed `platforms`, `build-tools` and `ndk`.
- **Native versions drift** → the SDK packages are read from
  `node_modules/react-native/gradle/libs.versions.toml`, so they follow React
  Native's requirements rather than being hard-coded.
- **Build feels slow** → the first run populates the Gradle cache (typically
  10–20 minutes); later runs reuse it.
- **Want iOS?** That requires a macOS runner and an Apple Developer account, so it
  is not part of this workflow.
