# Assets Placeholder

This directory should contain the following image files for the mobile app:

## Required Assets

### 1. icon.png
- **Size**: 1024x1024 pixels
- **Purpose**: App icon shown on device home screen
- **Design**: A modern business card with a camera/scan symbol
- **Colors**: Use the app's primary color (#6366f1)

### 2. splash.png
- **Size**: 1080x1920 pixels (portrait)
- **Purpose**: Splash screen shown when app launches
- **Design**: Gradient background with app name and icon
- **Colors**: Gradient from #6366f1 to #4f46e5

### 3. adaptive-icon.png
- **Size**: 1024x1024 pixels
- **Purpose**: Android adaptive icon (foreground layer)
- **Design**: Same as icon.png but optimized for Android

### 4. favicon.png
- **Size**: 48x48 pixels
- **Purpose**: Web app favicon
- **Design**: Simplified version of the app icon

## Generating Assets

You can create these assets using:

1. **Figma** or **Adobe Illustrator** for vector designs
2. **Canva** for quick templates
3. **Online icon generators** like:
   - https://www.appicon.co/
   - https://makeappicon.com/
   - https://icon.kitchen/

## Design Guidelines

- Use modern, flat design style
- Maintain consistent color scheme
- Ensure icons are recognizable at small sizes
- Follow platform-specific design guidelines (Material Design for Android, Human Interface Guidelines for iOS)

## Temporary Solution

For testing purposes, you can use placeholder images or generate simple colored squares with the app icon color.

To generate temporary placeholder icons, run:

```bash
# This will create basic placeholder icons
mkdir -p assets
# Then add your actual icons when ready
```

The app will still work without custom icons - Expo provides default icons during development.
