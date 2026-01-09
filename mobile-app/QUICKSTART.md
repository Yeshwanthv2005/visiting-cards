# Quick Start Guide - Visiting Card Scanner Mobile App

This guide will help you get the mobile app running quickly.

## Step 1: Install Node.js and Expo

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Choose the LTS version
   - Verify installation: `node --version`

2. **Install Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

## Step 2: Install Dependencies

Navigate to the mobile-app folder and install all required packages:

```bash
cd "e:\visiting card\mobile-app"
npm install
```

This will install all dependencies listed in package.json.

## Step 3: Run the App

### Option A: Using Expo Go (Easiest - No Emulator Needed)

1. **Install Expo Go on your phone**
   - iOS: Download from App Store
   - Android: Download from Play Store

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Scan the QR code**
   - iOS: Use the Camera app to scan the QR code
   - Android: Use the Expo Go app to scan the QR code

### Option B: Using Android Emulator

1. **Install Android Studio** (if not already installed)
   - Download from: https://developer.android.com/studio

2. **Create an Android Virtual Device (AVD)**
   - Open Android Studio
   - Go to Tools → AVD Manager
   - Create a new virtual device

3. **Start the emulator and run the app**
   ```bash
   npm run android
   ```

### Option C: Using iOS Simulator (macOS only)

1. **Install Xcode** from the App Store

2. **Run the app**
   ```bash
   npm run ios
   ```

## Step 4: Configure Google Sheets (Optional)

To enable syncing to Google Sheets:

1. **Open your Google Sheet**
   - Sheet ID is already configured: `1sOYLSNJ9EFkpX2mc3zvQ6uCPjuLTJpGuWRvu0SPoag0`

2. **Create Google Apps Script**
   - In your Google Sheet, go to Extensions → Apps Script
   - Delete any existing code
   - Copy the script from `services/sheetsService.js` (in the comments)
   - Paste it into the Apps Script editor

3. **Deploy as Web App**
   - Click Deploy → New Deployment
   - Select type: Web App
   - Execute as: Me
   - Who has access: Anyone
   - Click Deploy
   - Copy the Web App URL

4. **Configure in the app**
   - Open the mobile app
   - Go to Settings
   - Paste the Web App URL
   - Save settings

## Step 5: Test the App

1. **Scan a visiting card**
   - Tap "Scan Card" on the home screen
   - Point camera at a business card
   - Tap the capture button

2. **View the results**
   - AI will extract information automatically
   - Edit if needed
   - Save to history

3. **Check history**
   - Tap "History" to see all scanned cards
   - Search and filter as needed

## Troubleshooting

### "expo: command not found"
```bash
npm install -g expo-cli
```

### "Cannot find module X"
```bash
cd mobile-app
rm -rf node_modules
npm install
```

### Camera not working
- Grant camera permissions when prompted
- Check device camera settings

### App crashes or won't start
```bash
expo start --clear
```

### Google Sheets sync not working
- Verify Web App URL is correct
- Check Apps Script deployment
- Ensure script has required permissions

## What's Next?

- ✅ Scan visiting cards
- ✅ Edit extracted information
- ✅ View history
- ✅ Sync to Google Sheets
- ✅ Search and filter cards

## Need Help?

- Check the full README.md for detailed documentation
- Review the code comments
- Test with sample visiting cards first

---

**Happy Scanning! 📸**
