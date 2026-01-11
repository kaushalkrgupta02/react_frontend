# PWA Setup & Permissions Guide

## Overview
This app is configured as a Progressive Web App (PWA) to function like a native mobile application with access to device features like camera and location.

## Requirements for Full PWA Functionality

### 1. HTTPS Connection (Critical)
- **Development**: Use `localhost` or `127.0.0.1` (works without HTTPS)
- **Production**: MUST use HTTPS connection
  - Camera and location require secure context
  - Service workers require HTTPS
  - Push notifications require HTTPS

### 2. Supported Browsers

#### Mobile
- **Android**: Chrome 67+, Edge 79+, Samsung Internet 8.2+
- **iOS**: Safari 11.3+ (iOS 11.3+)
  - Note: iOS has more restrictions on PWA features
  - Camera access works best in Safari
  - Chrome/Firefox on iOS use Safari engine

#### Desktop
- Chrome 67+, Edge 79+, Firefox 97+, Safari 11.1+

## Camera Permission Setup

### For Users (First Time Setup)

#### Android (Chrome/Samsung Internet)
1. When prompted, tap "Allow" for camera access
2. If denied, tap the lock icon in address bar
3. Tap "Permissions"
4. Enable "Camera"
5. Refresh the page

#### iOS (Safari)
1. When prompted, tap "Allow"
2. If denied:
   - Go to Settings > Safari
   - Scroll to "Settings for Websites"
   - Tap "Camera"
   - Find your website and select "Allow"
3. Refresh the page

#### Desktop
1. Click "Allow" when browser prompts
2. If denied, click the lock/info icon in address bar
3. Find "Camera" permission
4. Change to "Allow"
5. Refresh the page

### Common Issues & Solutions

#### Issue: "Camera requires HTTPS"
- **Cause**: Not using secure connection
- **Solution**: Deploy to HTTPS or use localhost for development

#### Issue: "Camera permission denied"
- **Cause**: User previously denied permission
- **Solution**: Follow browser-specific steps above to re-enable

#### Issue: "Camera already in use"
- **Cause**: Another app/tab is using the camera
- **Solution**: Close other apps/tabs using camera

#### Issue: "No camera found"
- **Cause**: Device doesn't have a camera or it's not detected
- **Solution**: Use manual entry mode instead

## Location Permission Setup

### For Users

#### Android
1. Tap "Allow" when prompted
2. If denied:
   - Tap lock icon → Permissions → Location → Allow

#### iOS
1. Tap "Allow" when prompted
2. If denied:
   - Settings → Safari → Location → Allow

#### Desktop
1. Click "Allow" when prompted
2. If denied:
   - Lock icon → Site Settings → Location → Allow

## App Installation

### Android
1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home Screen"
3. Or tap the "Install App" banner when prompted
4. The app will appear on your home screen like a native app

### iOS
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. The app will appear on your home screen

### Desktop
1. Look for the install icon in the address bar
2. Click "Install" or use browser menu → "Install [App Name]"

## Testing PWA Features

### Check PWA Status
```javascript
// In browser console
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Secure Context:', window.isSecureContext);
console.log('Standalone Mode:', window.matchMedia('(display-mode: standalone)').matches);
```

### Check Camera Support
```javascript
// In browser console
console.log('Camera:', 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);
```

### Check Location Support
```javascript
// In browser console
console.log('Location:', 'geolocation' in navigator);
```

## Development Tips

### Local Development with HTTPS (Optional)
If you need HTTPS for local development:

```bash
# Using Vite with HTTPS
npm install @vitejs/plugin-basic-ssl --save-dev
```

Add to `vite.config.ts`:
```typescript
import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  plugins: [basicSsl()],
  server: { https: true }
}
```

### Testing on Mobile Device

1. **Same Network Method**:
   - Connect mobile and dev machine to same WiFi
   - Find dev machine's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Access on mobile: `http://[IP]:5173`

2. **Using ngrok** (for HTTPS):
   ```bash
   npm install -g ngrok
   ngrok http 5173
   ```
   - Use the HTTPS URL on mobile

## Production Deployment Checklist

- [ ] Deploy to HTTPS hosting (Netlify, Vercel, etc.)
- [ ] Verify service worker is registered
- [ ] Test camera access on mobile
- [ ] Test location access on mobile
- [ ] Test app installation
- [ ] Verify offline functionality
- [ ] Check push notifications (if implemented)
- [ ] Test on both iOS and Android

## Troubleshooting

### Service Worker Not Updating
- Clear site data in browser
- Unregister service worker in DevTools
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Permissions Not Working
1. Check if HTTPS is enabled
2. Clear browser cache and data for the site
3. Try in incognito/private mode
4. Check browser console for errors

### App Not Installing
- Verify manifest.webmanifest is accessible
- Check that all required manifest fields are present
- Ensure service worker is registered
- Clear browser cache

## Additional Resources

- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Can I Use - PWA](https://caniuse.com/?search=pwa)
- [Web.dev - PWA Guide](https://web.dev/progressive-web-apps/)

## Support

For browser-specific permission issues, users should:
1. Check browser version (update if needed)
2. Check device settings (camera/location enabled for browser)
3. Try clearing browser cache and site data
4. Try in a different browser
