# 🦉 RanDOM WisDOM - Build & Release Runbook

⚠️ Commit all changes before building.

# <div align="center">

</div>

## 📝 1. Pre-flight checklist (do this before EVERY build)

```powershell
cd dd54
git ls-files --ignored --exclude-standard -c
cd domdom54-app
```

`README.md` is expected and harmless. It should be the **only** entry.

> This command lists files that are **tracked despite being ignored**. It will
> not flag `.env` — untracked + ignored is the correct state for that file, and
> it's exactly what keeps `APP_VARIANT=development` out of the upload. See the
> production config check below for the guard that *does* matter.

_(Historical note: this step used to warn that `firebaseConfig.ts` must stay
commented out in `.gitignore`. That entry no longer exists, and the file itself
was removed when the Realtime Database was retired — see the token workflow in
`DEV.md`.)_

**💡 Config sanity:**

```powershell
npx expo-doctor
npx expo config
```

⚠️ **`npx expo config` reads `.env`.** Since `.env` sets
`APP_VARIANT=development` for local dev, the bare command reports the **dev**
package (`com.followcrom.domdom.dev`) even when you're about to build
production. To see what production will actually produce:

```powershell
$env:APP_VARIANT='production'; npx expo config
```

Any value other than `"development"` makes `IS_DEV` false, and because the
variable is already set, `dotenv` won't override it. Open a fresh terminal
afterwards so you don't carry it into dev work.

Confirm the output shows `com.followcrom.domdom`, `RanDOM WisDOM`, and scheme
`domdom52`.

**Bump `versionCode`** in `app.config.js` if the current value was already uploaded to Play Console.

Bump `version` (and usually `runtimeVersion`) for a user-facing release.

# <div align="center">

</div>

## 🏗️ 2. Development build (Native changes need a new dev build)

Two options for dev builds: `development` (debuggable, fetches JS from Metro) and `preview` (release-like, embeds JS in the APK). Both install as `RanDEV WisDEV` (`com.followcrom.domdom.dev`) alongside the production app.

```powershell
eas build --profile development --platform android
eas build --profile preview --platform android
```

|                             | development                   | preview             |
| --------------------------- | ----------------------------- | ------------------- |
| Gradle variant              | debug                         | release             |
| R8 minify + resource shrink | off                           | on                  |
| JS bundle                   | fetched from Metro at runtime | embedded in the APK |
| Needs your laptop running   | yes                           | no                  |
| Dev menu, Fast Refresh      | yes                           | no                  |
| Hermes bytecode             | compiled at runtime           | precompiled         |
| Debuggable                  | yes                           | no                  |
| Speed                       | sluggish                      | production-like     |

# <div align="center">

</div>

## 💼 3. Production build → Play Store

- Commit all changes
- Finish the pre-flight checklist above
- Build the production AAB:

```powershell
eas build --profile production --platform android
```

# <div align="center">

</div>

## 📤 4. EAS Submit

The first submission of the app needs to be performed manually. Subsequent submissions can be automated using EAS Submit.

🛤️ Test the AAB on Play Console's INTERNAL TESTING track first:
set `submit.production.android.track to "internal"` in eas.json

Submit the AAB (`playstore_key.json` is saved in eas ecredentials):

```powershell
eas submit --profile production --platform android
```

# <div align="center">

</div>

## 🏪 On the Google Play Store 🔵🔴🟡🟢

If the app was submitted successfully, a new release will be created on the Google Play Console. It will appear in the **Test and release** section -> **Latest releases and bundles**.

Initially the release only goes to whichever track `submit.production.android.track` names in
`eas.json` (currently `internal`) - it is not live to the public yet.

### ⬆️ Promoting the release to Production

Once the internal-track build has been verified, promote that **same AAB** to
Production.

1. Play Console -> your app -> **Testing -> Internal testing**.
2. Find the release you just verified -> **Promote release** -> choose
   **Production** as the target track.
3. This will create a Production release. Review/edit the release notes for the production listing (Play Console pre-fills them from
   the internal release).
4. Choose a rollout: full (100%) or staged.
5. Save release draft and follow prompt to Publishing overview. Some checks seem to run.
6. Submit 1 change for review. You don't need to wait for the checks to finish to be able to send your changes for review. You can send changes at any time, and we'll finish these checks before sending your changes to be reviewed.

Production releases go through Google's review before going live;
internal-track releases don't, which is why internal is the fast loop for verifying a build
before it's public.

# <div align="center">

</div>

## ☁️ On the Google Cloud Platform 🔵🔴🟡🟢

On GCP, I have a project called **Google Play Console Developer**. This is for use on the **Google Play Store**.

Go to GCP -> IAM. Note the long email has **Service Account Token Creator** and **Service Account User** roles. These are added via the **Service Account** (LHM IAM -> Service Accounts). Click on the link (email address) to open the service account details. Roles can be added under the "Permissions" tab. Click "Manage access" and search for "Service Account Token Creator" and "Service Account User". Assign these roles to the service account. (💡 I don't know if I need both, but I was getting a _Invalid JWT Signature error_, and adding the Service Account Token Creator role seemed to solve that.)

My old `playstore_key.json` was returning errors, so I needed to create a new key. Go to LHM IAM -> Service Accounts, click "Keys" on the top menu, "Add Key", "Create new key" and select key tpe "JSON". This will download a JSON file which I saved as `playstore_key.json` and is referenced in the `eas.json` file.

Back on the **Google Play Console**, look for "Users and Permissions" on the LHM. You will see one of the users is the service account email address. Click on it to see the permissions. You need to add the "Releases" role to this user. I gave it admin access, which is all permissions.

## 🔑 Keystore 🔵🔴🟡🟢

A keystore is different from a playstore_key.json file. The keystore (typically a file with a .jks or .keystore extension) is used to sign your Android app, which is a requirement for publishing on the Google Play Store.

When you use EAS, it manages this entire .keystore file and its private key for you. This is why you don't need to manually interact with the file. EAS generates the key, stores it securely, and uses it to sign your builds before submitting them to Google Play.

Download your keystore from Expo’s servers:

```bash
eas credentials -p android --platform android
```

## 🏉 Google Firebase 🔵🔴🟡🟢

I use Firebase for **Cloud Messaging only**. The Realtime Database was retired
in Aug 2026 — push tokens now live in a Google Sheet written by a Google Apps
Script web app (see the token workflow in `DEV.md`).

⚠️ **Do not delete the `domdom-52` Firebase project.** Android push delivery
still depends on it. Only the Realtime Database instance is gone.

The `google-services.json` file contains configuration details such as API keys, project IDs, and other settings needed to connect your app to Firebase services.

`expo-notifications` pulls in `com.google.firebase:firebase-messaging` natively, and Expo's Android push delivery goes through FCM under the hood even though the app only ever touches Expo push tokens in JS. Without it, `FirebaseApp.initializeApp()` fails natively at runtime.

# <div align="center">

</div>

## ♻️ Environment Variables

To manage environment variables using EAS CLI, you can use:

```bash
eas env:create
eas env:update
eas env:list
eas env:delete

# To pull environment variables from EAS servers to your local .env file:
eas env:pull
```

### eas credentials

The three crentials files are:

- `playstore_key.json` - used for EAS Submit to upload the AAB to Google Play Console
- `google-services.json` - used for Firebase Cloud Messaging
- `.jks` keystore file - used to sign the Android app before submission to Google

These are stored in the Expo servers and are not checked into source control. You can download them using `eas credentials -p android --platform android`.

# <div align="center">

</div>

## 🍃 OTA Updates 🌟

Update the production app via EAS Update. This lets you push JS/asset changes to users without rebuilding the native binary - ideal for bug fixes, UI tweaks, or logic changes

- Commit all changes
- Publish the update:

```bash
eas update --branch production --environment production --message "OTA update - Version: 2.1.1, Runtime: 2.1.0" --platform android
```

🔴 **`--environment production` is not optional.** `eas update` bundles the JS
**on your machine**, not on EAS servers — so on SDK 54 it reads your local
`.env` unless told otherwise. Without the flag, an OTA published to the
production branch is built with `APP_VARIANT=development`, and any
`EXPO_PUBLIC_*` values come from `.env` rather than the EAS `production`
environment.

With the flag, EAS environment variables are used and local `.env` files are
ignored entirely — which is also what keeps `EXPO_PUBLIC_TOKEN_ENDPOINT`
consistent between builds and updates. The flag becomes **required** in SDK 55,
so adopting it now costs nothing.

Native config (package name, app name, icon) can't change over OTA, so a
mistake here won't rename the installed app — it quietly ships a bundle built
against the wrong config instead, which is harder to spot.

---

⚠️ If you bump `runtimeVersion`, existing installs on the old runtime will **not**
receive the OTA. They only move forward via a new AAB from the store. For an OTA-only release,
bump `version` but leave `runtimeVersion` unchanged, so the update reaches every install still
on that runtime.

# <div align="center">

</div>

## 🖼️ Screenshots 📸

On an Android device, **push the power and volume button down** to take a screen shot. The screen shot will be saved in the gallery.

🌐 [Add device art](https://developer.android.com/distribute/marketing-tools/device-art-generator) to the screenshot. The `Pixel 6` template will accept screenshots from the Samsung Galaxy A32 5G, aka DJ T's Phone. ☎️

🌐 [Mockup Phone](https://mockuphone.com/) can also be used to create device mockups for your screenshots.

<br>

## Authors

🌐 followCrom: [followcrom online](https://followcrom.com/index.html) 🌐

📫 followCrom: [get in touch](https://followcrom.com/contact/contact.php) 📫

<div align="center">
# 🏁🎉👏🚩📋
</div>
