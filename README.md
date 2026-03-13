# Beth Notes

Beth Notes is a gentle, pink‑themed note‑taking app built with Expo and React Native. It supports tags, pinning, archive/trash flows, search, and optional voice dictation/commands.

## Features
- Create, edit, search, and filter notes
- Pin important notes
- Archive or trash notes, with restore and delete‑forever actions
- Tags with quick filters
- Voice dictation and voice commands (requires dev build)
- Local persistence with AsyncStorage

## Tech Stack
- Expo + React Native
- Expo Router (tabs)
- AsyncStorage for persistence
- Expo Speech Recognition for voice input

## Getting Started

1. Install dependencies
```bash
npm install
```

2. Start the app (Expo Go)
```bash
npx expo start
```

## Voice Input (Dev Build Required)
Expo Go does not include the speech recognition native module.

1. Install the native dependency
```bash
npm install expo-speech-recognition
```

2. Build and run a dev client
```bash
npx expo run:android
```

3. Start Metro with dev client mode
```bash
npx expo start --dev-client
```

## Project Structure
- `app/_layout.jsx` root layout and navigation stack
- `app/(tabs)/index.jsx` main Notes screen + editor
- `app/(tabs)/explore.jsx` Archive/Trash screen
- `lib/notes-store.js` persistence + settings
- `constants/theme.ts` app color theme
- `assets/images` app icons and splash assets

## Scripts
- `npm run start` start Metro
- `npm run android` start on Android
- `npm run ios` start on iOS
- `npm run web` start on web

## Customization
- Update app branding in `app.json`
- Edit icons and splash in `assets/images`
- Adjust colors in `constants/theme.ts`
