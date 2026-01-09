# Visiting Card Scanner - Mobile App

A powerful React Native mobile application that uses Google Gemini AI to extract information from visiting cards and automatically syncs to Google Sheets.

## Features

✨ **AI-Powered Extraction**
- Intelligent text recognition using Google Gemini 2.0
- Automatically categorizes organizations (University, Business, NGO, etc.)
- Extracts key information: name, organization, department, location, contact details

📸 **Flexible Scanning**
- Camera capture with real-time preview
- Import from photo gallery
- Grid overlay and guides for perfect alignment

💾 **Smart Storage**
- Local storage for offline access
- Automatic sync to Google Sheets
- Duplicate detection

📊 **Comprehensive History**
- Search and filter scanned cards
- View sync status
- Edit and manage entries

🎨 **Beautiful UI**
- Modern, vibrant design
- Smooth animations
- Intuitive navigation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android) or Xcode (for iOS)
- Google Gemini API key
- Google Sheet with appropriate setup

## Installation

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Configure Environment

Create a `.env` file in the `mobile-app` directory (you can copy from `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

**Note:** The API keys are already configured in `config.js` for quick testing. For production, move these to the `.env` file.

### 3. Setup Google Apps Script

To enable Google Sheets sync, you need to create a Google Apps Script Web App:

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Copy the Apps Script code from `services/sheetsService.js` (found in the comments at the bottom)
4. Paste it into the Apps Script editor
5. Click **Deploy → New Deployment**
6. Choose **Web App**
7. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy**
9. Copy the Web App URL
10. In the mobile app, go to **Settings** and paste the URL

## Running the App

### Development Mode

```bash
# Start the Expo development server
npm start

# Or run on specific platform
npm run android  # Android
npm run ios      # iOS
```

### Using Expo Go

1. Install **Expo Go** on your phone from App Store or Play Store
2. Run `npm start` on your computer
3. Scan the QR code with Expo Go

### Testing on Emulator

#### Android
```bash
npm run android
```

#### iOS (macOS only)
```bash
npm run ios
```

## Project Structure

```
mobile-app/
├── App.js                      # Main app entry with navigation
├── config.js                   # App configuration
├── package.json                # Dependencies
├── app.json                    # Expo configuration
│
├── screens/                    # Screen components
│   ├── HomeScreen.js          # Landing page
│   ├── CameraScreen.js        # Camera/gallery capture
│   ├── ProcessingScreen.js    # AI processing
│   ├── ResultScreen.js        # Display/edit results
│   ├── HistoryScreen.js       # Scanned cards list
│   └── SettingsScreen.js      # App settings
│
├── services/                   # Service modules
│   ├── geminiService.js       # Gemini AI integration
│   ├── sheetsService.js       # Google Sheets sync
│   └── storageService.js      # Local storage
│
├── components/                 # Reusable components
│   ├── CardPreview.js         # Card display
│   ├── LoadingSpinner.js      # Loading states
│   └── ErrorBoundary.js       # Error handling
│
├── styles/                     # Styling
│   └── theme.js               # Colors, typography, spacing
│
└── assets/                     # Images and icons
    ├── icon.png
    ├── splash.png
    └── adaptive-icon.png
```

## Usage Guide

### 1. Scanning a Card

1. Tap **"Scan Card"** on the home screen
2. Point your camera at a visiting card
3. Align the card within the guide frame
4. Tap the capture button
5. Wait for AI to extract the information

### 2. Viewing History

1. Tap **"History"** on the home screen
2. Browse all scanned cards
3. Use the search bar to filter
4. Tap a card to view details

### 3. Editing Card Information

1. Open a card from history or after scanning
2. Tap the **"Edit"** button
3. Modify any fields
4. Tap **"Save"**

### 4. Configuring Google Sheets Sync

1. Go to **Settings**
2. Follow the setup instructions for Google Apps Script
3. Paste your Web App URL
4. Enable **Auto-Sync** if desired
5. Tap **"Save Settings"**

## Features Breakdown

### AI Extraction
The app uses Google Gemini 2.0 to extract:
- Organization name
- Point person (name on card)
- Department/designation
- Location (city/state only)
- Contact number
- Email address
- Organization type (auto-categorized)

### Organization Categories
- **University**: Educational institutions
- **Business**: Companies and corporations
- **Consultancy**: Consulting firms
- **NGO**: Non-profit organizations
- **Startup**: Tech startupsstartups
- **Government**: Government departments

### Duplicate Detection
The app automatically detects duplicates based on:
- Person name
- Contact number
- Email address

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check device camera functionality
- Restart the app

### Google Sheets Sync Failing
- Verify Web App URL is correct
- Check Google Apps Script deployment settings
- Ensure the script has proper permissions
- Test the Web App URL in a browser

### App Crashes on Startup
- Clear Expo cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for React Native compatibility issues

### Image Processing Fails
- Ensure Gemini API key is valid
- Check internet connection
- Verify image quality and clarity
- Try with a different visiting card

## Building for Production

### Android APK

```bash
expo build:android
```

### iOS IPA

```bash
expo build:ios
```

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform android
eas build --platform ios
```

## API Keys Security

⚠️ **Important**: The current implementation includes API keys directly in the code for development purposes. For production:

1. **Never commit API keys** to version control
2. **Use environment variables** properly
3. **Consider a backend API** to proxy Google Sheets and Gemini requests
4. **Implement proper authentication**

## Limitations

- Requires internet connection for AI processing and sync
- Google Sheets sync requires manual Apps Script setup
- Free tier Gemini API has rate limits
- Camera quality affects extraction accuracy

## Future Enhancements

- [ ] Offline AI processing using on-device models
- [ ] Batch scanning mode
- [ ] Export to VCF/CSV
- [ ] Cloud backup integration
- [ ] Multi-language support
- [ ] OCR for handwritten cards
- [ ] Business card templates

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the Google Apps Script setup
- Ensure all dependencies are properly installed
- Verify API keys are valid

## Acknowledgments

- Google Gemini AI for intelligent text extraction
- Expo for cross-platform development
- React Navigation for smooth navigation
- React Native community for excellent libraries

---

**Built with ❤️ using React Native and Google Gemini AI**
