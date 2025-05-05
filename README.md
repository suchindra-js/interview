# Places Search with Google Maps

A React Native application that allows users to search for places using Google Maps API and displays them on a map.

## Features

- Search for places using Google Places API
- Display search results on Google Maps
- Recent searches history
- Current location detection
- Modern UI with smooth animations

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Google Maps API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your Google Maps API key to the `.env` file:
```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

5. Update the API key in `app.json` for both iOS and Android:
```json
{
  "ios": {
    "config": {
      "googleMapsApiKey": "your_google_maps_api_key_here"
    }
  },
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "your_google_maps_api_key_here"
      }
    }
  }
}
```

## Running the App

1. Start the development server:
```bash
npm start
```

2. Run on iOS:
```bash
npm run ios
```

3. Run on Android:
```bash
npm run android
```

## Project Structure

```
src/
  ├── components/
  │   └── PlacesSearch.tsx    # Search component with autocomplete
  ├── screens/
  │   └── MapScreen.tsx       # Main map screen
  ├── types/
  │   └── env.d.ts           # Environment variable types
  └── assets/                # Images and other static assets
```

## Technologies Used

- React Native
- Expo
- Google Maps API
- Google Places API
- TypeScript
- AsyncStorage for local storage

## License

MIT 