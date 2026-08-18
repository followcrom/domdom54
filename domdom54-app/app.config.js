import "dotenv/config";

// Use a separate Android package, name, and scheme for development builds so a
// dev build can sit alongside the Play Store app on the same device. Toggled by
// the "development" EAS build profile (see eas.json env: APP_VARIANT).
const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "RanDEV WisDEV" : "RanDOM WisDOM",
    description:
      "Find peace in the daily chaos with curated wisdom from mindful minds.",
    slug: "domdom52",
    version: "2.4.0",
    runtimeVersion: "2.4.0",
    orientation: "default",
    icon: IS_DEV ? "./assets/dev_icon.png" : "./assets/icon.png",
    userInterfaceStyle: "automatic", // let the app follow system light/dark mode
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
      dark: {
        backgroundColor: "#000000",
        image: "./assets/splash.png",
      },
    },
    scheme: IS_DEV ? "domdom52dev" : "domdom52",
    android: {
      package: IS_DEV ? "com.followcrom.domdom.dev" : "com.followcrom.domdom",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      versionCode: 8,
      adaptiveIcon: {
        foregroundImage: IS_DEV
          ? "./assets/dev_icon.png"
          : "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,

      // `["expo-audio", { recordAudioAndroid: false }]` is NOT enough on its own.
      //
      // This is the same merger behaviour that forced plugins/withoutAudioRecordingService
      // to exist for the <service> element; blockedPermissions is the first-party
      // equivalent for <uses-permission> and emits the same tools:node="remove".
      //
      // Note this cannot be verified by inspecting the prebuild output alone: prebuild
      // emits the pre-merge app manifest, where the permission is absent either way. The
      // proof is the remove directive being present, and then the merged manifest in the
      // built artifact.
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
    },
    androidStatusBar: {
      // `barStyle` ONLY, and this block must not be deleted. Verified with
      // `expo config --type introspect`, not assumed:
      //
      // 1. `dark-content` is the only key that earns its place. It emits
      //    `android:windowLightStatusBar=true` into styles.xml, which is what makes the
      //    icons dark from process start. <StatusBar style="dark" /> in App.tsx cannot
      //    do that — JS has not mounted yet — so without this the icons are light on a
      //    white header for the whole splash-to-first-render window.
      //
      // 2. Deleting the block does NOT remove `android:statusBarColor` from the theme.
      //    @expo/prebuild-config's withAndroidSplashScreen (line ~66) writes
      //    `androidStatusBar.backgroundColor = splash.backgroundColor || "#ffffff"`
      //    whenever the app has not set one, so the attribute comes back as #ffffff —
      //    by design, so the bar matches the splash — while windowLightStatusBar is lost.
      //    That is strictly worse than what is here.
      //
      // 3. `backgroundColor` and `translucent` are omitted because under edge-to-edge
      //    (android.edgeToEdgeEnabled above) the bar is always transparent and always
      //    translucent. expo-status-bar warns and ignores both at runtime.
      //
      // The deprecated `Window.setStatusBarColor` calls Play flagged are NOT from here —
      // they live in react-native-screens' own dex, not in this block and not in
      // expo-status-bar. Nothing in this config can silence them; they clear when
      // react-native-screens ships a version that stops calling the deprecated API.
      barStyle: "dark-content",
    },
    extra: {
      eas: {
        projectId: "651d92ca-d964-405f-af86-f5c863b3d61e",
      },
    },
    updates: {
      url: "https://u.expo.dev/651d92ca-d964-405f-af86-f5c863b3d61e",
      fallbackToCacheTimeout: 0,
    },
    plugins: [
      // The app plays audio but never records it — nothing imports useAudioRecorder or
      // prepareToRecordAsync. `recordAudioAndroid: false` keeps RECORD_AUDIO out of the
      // manifest. The matching foreground service is stripped by the local plugin below;
      // the expo-audio plugin can only edit permissions, not its own library manifest.
      ["expo-audio", { recordAudioAndroid: false }],
      "./plugins/withoutAudioRecordingService",
      "expo-font",
      "expo-asset",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: "36.0.0",

            // R8. Release variants only — the `development` profile is a debug build and
            // is completely unaffected, so a dev build proves nothing about these two.
            // Test them with `eas build --profile preview` (release variant, EAS internal
            // distribution) before they ever reach a production AAB.
            //
            // Note the key names: SDK 54 renamed these. `enableProguardInReleaseBuilds`
            // still works via a shim, but `enableShrinkResources` is not a real key and
            // the schema uses additionalProperties:false, so a wrong name throws rather
            // than silently doing nothing. Shrink also refuses to run without minify.
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,

            // expo-notifications ships a proguard-rules.pro containing this exact keep,
            // but its build.gradle never wires it up as consumerProguardFiles — so unlike
            // expo, expo-modules-core, expo-updates and react-native, its rules do NOT
            // reach our R8 run. Push is the most important path in the app and the most
            // reflection-heavy, so the rule is restated here by hand.
            extraProguardRules: [
              "# expo-notifications does not ship consumer proguard rules (checked in",
              "# node_modules/expo-notifications/android/build.gradle - no proguard entry).",
              "-keep class expo.modules.notifications.** { *; }",
            ].join("\n"),
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          // "sounds": ["./assets/notification-sound.wav"],
          androidMode: "default",
          androidCollapsedTitle: "Random Wisdom",
        },
      ],
    ],
  },
};
