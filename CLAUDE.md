# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Mobile App (root)
```bash
npx expo start          # Start Expo dev server (scan QR with Expo Go)
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
```

### Proxy Server (`server/`)
```bash
cd server
npm start               # Production
npm run dev             # Dev with --watch (Node 18.11+)
```

## Architecture

```
bodyfat-app/
├── App.tsx                          # Entry: SafeAreaProvider + AppNavigator
├── src/
│   ├── types/index.ts               # All shared TypeScript types
│   ├── navigation/AppNavigator.tsx  # React Navigation native-stack setup
│   ├── stores/                      # Zustand stores
│   │   ├── userStore.ts             # UserProfile → expo-secure-store
│   │   ├── assessmentStore.ts       # In-flight analysis state (ephemeral)
│   │   └── historyStore.ts          # Assessment history → expo-file-system
│   ├── services/
│   │   ├── normalization/imageNormalizer.ts  # Resize to 512×512, quality gate
│   │   └── api/assessmentApi.ts             # POST to proxy server
│   ├── components/
│   │   └── PoseGuideOverlay.tsx     # Camera silhouette guide + lighting badge
│   └── screens/
│       ├── HomeScreen.tsx           # Dashboard + profile setup modal
│       ├── CameraScreen.tsx         # expo-camera capture + gallery picker
│       ├── ReviewScreen.tsx         # Photo preview + normalization feedback
│       ├── AnalysisScreen.tsx       # Loading screen, runs full analysis flow
│       ├── ResultsScreen.tsx        # Body fat result, gauge bar, recommendations
│       └── HistoryScreen.tsx        # Past assessments list + trend summary
└── server/
    ├── index.js                     # Express proxy → Anthropic Claude API
    ├── .env                         # ANTHROPIC_API_KEY, PORT (gitignored)
    └── package.json
```

## Key Data Flow

1. **CameraScreen** captures/picks photo → stores URI in `assessmentStore`
2. **ReviewScreen** runs `normalizeImage()` (resize to 512×512, quality check) → stores `NormalizationResult`
3. **AnalysisScreen** reads normalized URI, converts to base64, POSTs `{ imageBase64, userProfile }` to `server/` proxy
4. **Server** calls `claude-opus-4-6` with the image + structured prompt → parses JSON response
5. **AnalysisScreen** saves `Assessment` to `historyStore` → navigates to `ResultsScreen`

## Server Setup

Copy `server/.env.example` to `server/.env` and fill in `ANTHROPIC_API_KEY`.

When testing on a physical device, update `SERVER_URL` in `src/services/api/assessmentApi.ts` from `localhost` to your machine's local IP (e.g. `http://192.168.1.x:3000`).

## Navigation Stack

`Home → Camera → Review → Analysis → Results`  
`Home → History → Results`

All screens use `headerShown: false` with a dark `#0F0F0F` background.

## State Persistence

| Store | Storage | Key |
|---|---|---|
| `userStore` | `expo-secure-store` | `user_profile` |
| `historyStore` | `expo-file-system` | `${documentDirectory}assessments.json` |
| `assessmentStore` | In-memory only | — |
