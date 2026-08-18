# 🦉 DomDom 54: Development 📱

🚨 **DON'T** manage notifications here. Use `projects/domdom_notifications`

## 🏗️ Cross-machine (Arm64 Surface + x86 Desktop)

**DESKTOP** is `Development/dd54`. It works on the Windows OS, in PowerShell, Android Studio, and on an emulator or physical device. To use _scrcpy_ on DESKTOP, you must still unblock connections through the firewall if connecting via USB.

**SURFACE** is `projects/domdom52` on WSL2 and works with _scrcpy_, and a physical device. Connect phone via USB. There is no need to unblock connections through the firewall if connecting via USB.

<br>

## ✂️ Dev vs Prod Split

The dev vs prod split is driven by `process.env.APP_VARIANT === "development"` in `app.config.js`.

The `development` / `preview` EAS profile sets `APP_VARIANT=development`;
The `production` profile sets nothing, so it uses the real package.

### 🔑 Local `.env`

`app.config.js` starts with `import "dotenv/config"`, so `domdom54-app/.env` is
loaded before the config is evaluated. The file is gitignored, so it never reaches the build server. This also means the info in `.env` is never used in _eas builds_, which use the EAS-stored env vars.

<br>

## 🏭 Local Development

**`APP_VARIANT` in the local .env** sets Metro to `com.followcrom.domdom.dev.` Otherwise it fails with:

```
CommandError: No development build (com.followcrom.domdom) for this project is installed.
```

### 🧙‍♀️ Start the daemon (will start automatically)

```bash
adb devices
```

### 🤖 Start the emulator

```bash
emulator -list-avds

emulator -avd Pixel_9
```

### 🌍 Start Expo Dev server

```bash
cd dod54

code .

cd domdom54-app

npx expo start
```

### Emulator

To open on the emulator, press 'a' in the terminal. This should open the .dev build as the local .env sets `process.env.APP_VARIANT === "development"`.

<br>

## 👍 Screen Copy (`scrcpy`)

📱 Connect the phone to laptop via USB.

In `C:\Program Files (x86)\Screen Copy`, click `scrcpy-noconsole.vbs`. This should open a window with your phone screen. You may see an _'Allow a connection'_ popup on the mobile device. If so, click _Allow_ and `scrcpy-noconsole.vbs` again.

Open a terminal:

```bash
open_a_terminal_here.bat
```

Record the screen with:

```bash
scrcpy --r filename.mp4
```

<br>

# 👨‍🔧 Troubleshooting 🧙🏼‍♂️

## 🔔 Push Tokens

Migrated off the Firebase Realtime Database (Aug 2026). Tokens now live in a
Google Sheet, written by a Google Apps Script web app. The `firebase` npm
package is gone from the client entirely.

### 🔁 The flow

1. User taps **Enable notifications** → `Permission.tsx`
2. `src/pushTokenStore.ts` POSTs `{action, token, appVersion, OSVersion, country}` as
   `text/plain` to `EXPO_PUBLIC_TOKEN_ENDPOINT`
3. `docs/domdom-token-writer.gs` (actually runs on Google Sheets) validates the token shape, de-duplicates against the
   sheet, appends a row, and emails admin.
4. Revoking sends `{action: "remove"}`, which deletes the row

Env Variable `EXPO_PUBLIC_TOKEN_ENDPOINT` is set in `.env` and in EAS build profiles. It points to the Apps Script `/exec` URL.

If the `EXPO_PUBLIC_TOKEN_ENDPOINT` variable is missing at build time the app does **not** crash -
`pushTokenStore` logs a warning and skips the write. Convenient, but it means a
misconfigured build fails silently. Check `eas env:list`.

Local runs (expo start, dev client attached to Metro) use .env directly.

EAS cloud builds use the EAS-stored env vars.

### 🚀 Redeploying `domdom-token-writer.gs`

Saving the script does **not** change what `/exec` serves. Every time:

> Deploy → Manage deployments → ✏️ → Version: **New version** → Deploy

Access must be **"Anyone"**, not "Anyone with a Google account" - the app posts
unauthenticated. Verify by opening the `/exec` URL in an incognito window; you
should get `{"ok":true,"service":"domdom-token-store"}` rather than a sign-in
page. Run `selfTest` in the Apps Script editor to check sheet + email wiring.

<br>

## 🔥 Google Firebase project (`domdom-52`) 🔵🔴🟡🟢

I use Firebase for **Cloud Messaging only**. The Realtime Database was retired
in Aug 2026. Push tokens now live in a Google Sheet written by a Google Apps
Script web app.

Android push delivery runs through FCM (`app.config.js` → `googleServicesFile`). The `google-services.json` file contains configuration details such as API keys, project IDs, and other settings needed to connect your app to Firebase services. Deleting it
kills notifications.

<br>

## 🧱 Firewall settings

If you are using a local emulator or if the device is connected via USB on SURFACE, you don't need to uncheck the box that says, "_Block all incoming connections, including those in the list of allowed apps._" This is because the connection is made directly over USB or through the emulator, which doesn't require incoming network connections. Firewalls almost always permit outgoing connections, so no special configuration is needed on your end.

A timeout error when trying to connect to the Metro bundler usually indicates incoming connections are being blocked.

<br>

## 📟 Run the app on a physical device

### Enable Developer Options on your Android phone:

- Go to Settings → About Phone
- Tap "Build Number" 7 times
- Developer Options will appear in Settings

### Enable USB Debugging:

- Settings → Developer Options → USB Debugging (turn on)
- Settings → Developer Options → Verify apps over USB (turn on)

<br>

## 🚫 Stop Metro bundler 🚇

If using Ctrl+C in the terminal doesn't work, you can force it to stop by killing the process that is running the Metro bundler.

Find the Process ID (PID) of the Metro Bundler:

```cmd
netstat -ano | findstr :8081
```

The key line to look at is the one with the state LISTENING on port 8081. This signifies that a process is running and actively waiting for connections on that port.

```cmd
taskkill /PID <PID> /F
```

Replace <PID> with the actual PID you found in the previous step.

<br>
