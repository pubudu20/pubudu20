/**
 * Config plugin: sign release builds with Pubu's own keystore.
 *
 * `expo prebuild` generates android/app/build.gradle with release builds signed
 * by the public debug key. This plugin adds a "release" signing config that
 * reads the keystore location and passwords from environment variables, which
 * the GitHub Actions workflow fills from repository secrets:
 *
 *   BW_KEYSTORE_PATH, BW_KEYSTORE_PASSWORD, BW_KEY_ALIAS, BW_KEY_PASSWORD
 *
 * Without those variables (e.g. a local test build) it falls back to the
 * debug key so the build still works.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (System.getenv("BW_KEYSTORE_PATH")) {
                storeFile file(System.getenv("BW_KEYSTORE_PATH"))
                storePassword System.getenv("BW_KEYSTORE_PASSWORD")
                keyAlias System.getenv("BW_KEY_ALIAS")
                keyPassword System.getenv("BW_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('BW_KEYSTORE_PATH')) return cfg; // already applied

    // 1. Add signingConfigs.release next to signingConfigs.debug
    const before = gradle;
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_SIGNING}`);
    if (gradle === before) throw new Error('withReleaseSigning: could not find signingConfigs in build.gradle');

    // 2. Make the release build type use it
    const releaseBlock = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseBlock.test(gradle)) throw new Error('withReleaseSigning: could not find release signingConfig');
    gradle = gradle.replace(
      releaseBlock,
      `$1signingConfig System.getenv("BW_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
