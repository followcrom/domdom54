const { withGradleProperties } = require("expo/config-plugins");

/**
 * Sets `android.r8.optimizedResourceShrinking=true` in android/gradle.properties.
 *
 * Why this exists
 * ---------------
 * Play flagged "Optimised resource shrinking isn't enabled" against 2.4.1
 * (versionCode 8). With this flag, R8 shrinks code and resources together in one
 * pass instead of AAPT2 guessing which resources are reachable, so it removes more.
 * It is opt-in on AGP 8.6+ (React Native 0.81 pins AGP 8.11) and the default from
 * AGP 9.0, so this plugin becomes redundant after an upgrade that brings in AGP 9.
 *
 * It only has any effect when resource shrinking is on, which needs
 * enableMinifyInReleaseBuilds + enableShrinkResourcesInReleaseBuilds in the
 * expo-build-properties block of app.config.js. Release variants only, so test with
 * `eas build --profile preview`, never a dev build.
 *
 * expo-build-properties has no option for this key, hence a config plugin.
 */

const KEY = "android.r8.optimizedResourceShrinking";
const VALUE = "true";

const withR8OptimizedResourceShrinking = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find((p) => p.type === "property" && p.key === KEY);

    if (existing) {
      existing.value = VALUE;
    } else {
      props.push({ type: "property", key: KEY, value: VALUE });
    }

    return config;
  });

module.exports = withR8OptimizedResourceShrinking;
