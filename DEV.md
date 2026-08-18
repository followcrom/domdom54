# 🦉 DomDom 52 📱

DON'T manage notifications here. Use `projects/domdom_notifications`

### 🏗️ Cross-machine (Arm64 Surface + x86 Desktop)

- `eas build` compiles in the cloud — the triggering machine's CPU (x86 vs Arm64) is irrelevant to the resulting APK.
- The `development` profile in `eas.json` has no ABI restriction, so it ships `arm64-v8a` + `armeabi-v7a` — every real Android phone, regardless of which laptop built it.
- Metro (the JS dev server started with `npx expo start --dev-client`) is pure Node.js — architecture-agnostic, runs fine on Arm64/WSL2.
- The Surface's Arm64 limitation only blocks running an x86 **emulator** locally — it doesn't affect installing/running an existing dev-client APK on a physical phone.

So the same phone + same dev-client install works across both laptops: just start Metro on whichever machine you're editing on, and point the dev-client app at it.

### Dev vs Prod Split

The dev vs prod split is driven by `process.env.APP_VARIANT === "development"` in `app.config.js`.

The `development` / `preview` EAS profile sets `APP_VARIANT=development`;
The `production` profile sets nothing, so it uses the real package.

### 🔑 Local `.env`

`app.config.js` starts with `import "dotenv/config"`, so `domdom54-app/.env` is
loaded before the config is evaluated. The file is gitignored, and EAS uploads
via `git archive`, so it never reaches the build server.

## 🏭 Local Development 🏗️

**`APP_VARIANT` is set locally in the .env** Without it `IS_DEV` is false, the
config resolves to `com.followcrom.domdom`, and Metro fails with:

```
CommandError: No development build (com.followcrom.domdom) for this project is installed.
```

---

## 🔔 Push Tokens

Migrated off the Firebase Realtime Database (Aug 2026). Tokens now live in a
Google Sheet, written by a Google Apps Script web app. The `firebase` npm
package is gone from the client entirely.

### 🔁 The flow

1. User taps **Enable notifications** → `Permission.tsx`
2. `src/pushTokenStore.ts` POSTs `{action, token, platform, appVersion}` as
   `text/plain` to `EXPO_PUBLIC_TOKEN_ENDPOINT`
3. `docs/domdom-token-writer.gs` (actually runs on Google Sheets) validates the token shape, de-duplicates against the
   sheet, appends a row, and emails `followcrom@gmail.com`
4. Revoking sends `{action: "remove"}`, which deletes the row

If the `EXPO_PUBLIC_TOKEN_ENDPOINT` variable is missing at build time the app does **not** crash —
`pushTokenStore` logs a warning and skips the write. Convenient, but it means a
misconfigured build fails silently. Check `eas env:list`.

### 🚀 Redeploying `domdom-token-writer.gs`

Saving the script does **not** change what `/exec` serves. Every time:

> Deploy → Manage deployments → ✏️ → Version: **New version** → Deploy

Access must be **"Anyone"**, not "Anyone with a Google account" — the app posts
unauthenticated. Verify by opening the `/exec` URL in an incognito window; you
should get `{"ok":true,"service":"domdom-token-store"}` rather than a sign-in
page. Run `selfTest` in the Apps Script editor to check sheet + email wiring.

### `domdom-52` Firebase project

Android push delivery runs through FCM (`app.config.js` → `googleServicesFile`). Deleting it
kills notifications.

---

# 🦉 DESKTOP 📱

DESKTOP is `Development/dd54`. It works on the Windows OS, in PowerShell, Android studio, and on an emulator or physical device.

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

### Screen Copy

To use `scrcpy` on DESKTOP, you must still unblock connections through the firewall if connecting via USB.

<br>

# 🦉 SURFACE 📱

SURFACE is projects/domdom52 on WSL2 and works with scrncpy, and a physical device.

Connect phone via USB. There is no need to unblock connections through the firewall if connecting via USB.

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

### 🪵 Logs 📜

```bash
# First, open a terminal:
open_a_terminal_here.bat

# Run the following command to see the logs:
.\adb logcat | findstr "com.followcrom.RandomWisdom"
```

<br>

# <div align="center">

</div>

# 👨‍🔧 Troubleshooting 🧙🏼‍♂️

## 🧱 Firewall settings

If you are using a local emulator or if the device is connected via USB on SURFACE, you don't need to uncheck the box that says, "_Block all incoming connections, including those in the list of allowed apps._" This is because the connection is made directly over USB or through the emulator, which doesn't require incoming network connections. Firewalls almost always permit outgoing connections, so no special configuration is needed on your end.

A timeout error when trying to connect to the Metro bundler usually indicates incoming connections are being blocked.

# <div align="center">

</div>

## 📟 Run the app on a physical device

### Enable Developer Options on your Android phone:

- Go to Settings → About Phone
- Tap "Build Number" 7 times
- Developer Options will appear in Settings

### Enable USB Debugging:

- Settings → Developer Options → USB Debugging (turn on)
- Settings → Developer Options → Verify apps over USB (turn on)

<br>

# <div align="center">

</div>

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

# <div align="center">

</div>
