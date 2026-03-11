<div align="center">
  <p>
    <strong>أبصرني · Abserny</strong><br />
    AI-powered vision assistant for the visually impaired
  </p>
  <p>
    <img src="https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white" />
    <img src="https://img.shields.io/badge/built%20with-Expo-000020?style=flat-square&logo=expo&logoColor=white" />
    <img src="https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=flat-square&logo=google&logoColor=white" />
    <img src="https://img.shields.io/badge/language-Arabic%20%2B%20English-00BFFF?style=flat-square" />
    <img src="https://img.shields.io/badge/license-MIT-A78BFA?style=flat-square" />
  </p>
  <p>
    <a href="https://abserny.github.io/abserny.com/">Website</a> ·
    <a href="https://github.com/abserny/Abserny-Mobile/releases/latest">Download APK</a> ·
    <a href="#gestures">Gestures</a> ·
    <a href="#setup">Setup</a>
  </p>
</div>

---

## What is Abserny?

Abserny is a fully gesture-driven mobile assistant that uses your phone's camera and AI to describe the world around you — out loud, in real time. It requires no reading, no menus, no buttons. Everything is controlled through simple touch gestures designed to be learned in under two minutes.

Built for Arabic and English speakers. Works offline when internet is unavailable.

---

## How it works

Point your camera at anything. Double tap. Abserny speaks.

The app captures an image, sends it to Gemini 2.0 Flash Lite for a concise spoken description, and reads it aloud. If there's no internet connection, it falls back to on-device ML Kit processing automatically — no configuration needed.

---

## Gestures

Everything in Abserny is controlled without looking at the screen.

| Gesture | Action |
|---|---|
| **Double tap** | Scan and describe what the camera sees |
| **Long press** | Repeat the last result |
| **Swipe right / left** | Switch between modes |
| **Triple tap** | Open settings |

A spoken tutorial walks through every gesture on first launch.

---

## Modes

| Mode | What it does |
|---|---|
| **Scene** | Describes your full surroundings — obstacles, people, spaces |
| **Object** | Identifies a specific object held close to the camera |
| **Read** | Reads all visible text exactly as written |
| **People** | Detects and describes people nearby |

---

## Language support

Full bilingual support for **Arabic (العربية)** and **English**. Language is chosen through a gesture-driven onboarding screen on first launch. Can be changed at any time from settings.

- Arabic: right-to-left layout, `ar-SA` speech synthesis at natural rate
- English: standard layout, `en-US` speech synthesis

---

## Setup

### Requirements

- Android device running Android 8.0 or later
- A free [Gemini API key](https://aistudio.google.com) from Google AI Studio

### Install from APK

1. Download the latest APK from [Releases](https://github.com/abserny/Abserny-Mobile/releases/latest)
2. On your Android device, allow installation from unknown sources if prompted
3. Open the APK and install
4. Launch Abserny

### Add your Gemini API key

Open `hooks/useDetection.js` and replace the placeholder:

```js
const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';
```

Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for the free tier.

> Without a key, the app works fully using on-device ML Kit. Online mode just gives better, more natural descriptions.

---

## Build from source

### Prerequisites

- Node.js 18+
- Expo CLI
- EAS CLI
- Android device or emulator

### Install

```bash
git clone https://github.com/abserny/Abserny-Mobile.git
cd Abserny-Mobile
npm install --legacy-peer-deps
```

### Run in development

```bash
npx expo start
```

### Build standalone APK

```bash
eas build --platform android --profile preview
```

The EAS build produces a standalone APK you can distribute directly. No Play Store required.

---

## Project structure

```
Abserny-Mobile/
├── App.js                  # Root component, main camera screen
├── OnboardingScreen.js     # First-launch gesture tutorial
├── LanguagePicker.js       # Language selection (standalone)
├── SettingsOverlay.js      # Settings sheet
├── AbsernyIcons.js         # Custom drawn vector icons
├── assets/
│   └── logo.png
└── hooks/
    ├── useDetection.js     # Gemini + ML Kit detection logic
    ├── useGestures.js      # PanResponder gesture handler
    ├── useLanguage.js      # Strings, translations, AsyncStorage
    ├── useModes.js         # Scene / Object / Read / People modes
    └── useVoice.js         # Queued TTS speech engine
```

---

## Tech stack

| | |
|---|---|
| Framework | React Native via Expo SDK 54 |
| Build | EAS (Expo Application Services) |
| Online AI | Gemini 2.0 Flash Lite |
| Offline AI | ML Kit Image Labeling + Text Recognition |
| Speech | expo-speech (ar-SA / en-US) |
| Camera | expo-camera |
| Storage | AsyncStorage |
| Haptics | expo-haptics |

---

## Accessibility design principles

Abserny is built screen-first, not sight-first. Every design decision assumes the user cannot see the screen.

- Zero required visual interaction — all navigation is gesture-based
- Speech is always the primary output, never supplemental
- Haptic feedback confirms every action before speech responds
- No menus, no buttons, no text the user needs to read
- Offline fallback ensures the app never silently fails

---

## Contributing

Issues and pull requests are welcome. If you're working on something significant, open an issue first to discuss.

Areas where contributions are especially helpful:
- Improving ML Kit offline accuracy
- Additional language support
- Accessibility testing with screen readers
- TFLite model integration (see `AbsernyVision` branch)

---

## License

This project is intended for educational purposes as a graduation project.

---

<div align="center">
  <sub>Built for people who deserve technology that works for them.</sub>
</div>
