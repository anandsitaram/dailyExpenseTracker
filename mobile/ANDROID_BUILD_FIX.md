# Android build fix

The Android release build was failing in `react-native-svg` because the project uses
React Native `0.74.5`, while the installed `react-native-svg` `15.15.5` contains
native Android code that expects newer React Native APIs.

The dependency has been pinned to `react-native-svg` `15.8.0`, which is compatible
with React Native 0.73+.

After extracting the project:

```powershell
cd mobile
npm ci
cd android
.\gradlew clean
.\gradlew assembleRelease
```

If Android Studio reports a Gradle JDK issue, use the Android Studio Embedded JDK
or JDK 17 as appropriate for the installed Android Studio/Gradle setup.

## Additional fix

`react-native-svg@15.8.0` imports `warn-once`; the mobile project now declares `warn-once@^0.1.1` explicitly and pins it in `package-lock.json`.
