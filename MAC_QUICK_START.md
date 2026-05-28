# Quick Start Guide - MAC-Based Identity Control

## For Users (Admins)

### First Time Setup
1. Log in to your admin account
2. Go to Admin Control Center (`/admin`)
3. You'll see a warning banner: "⚠️ MAC-verificatie vereist"
4. Click the **"🔒 MAC Beheer"** tab
5. Enter your device MAC address:
   - **Windows**: Open CMD, run: `ipconfig /all` → Find "Physical Address"
   - **Mac**: Open Terminal, run: `ifconfig` → Find "ether"
   - **Linux**: Open Terminal, run: `ip addr show` → Find "link/ether"
6. (Optional) Enter device name (e.g., "Work Laptop")
7. Click **"MAC-adres registreren"**
8. Success! Your device is now trusted

### Managing Your Devices
- **View registered devices**: All devices appear in "Geregistreerde apparaten" section
- **Revoke a device**: Click "✕ Intrekken" button on any device card
- **See device details**: Click on device card to expand and see registration date

### Access Logs
- View all your verification attempts in "Toegangslogboek" section
- See timestamps, MAC addresses, and verification status
- Click "Meer logboeken laden" for older entries

### Policy Settings
- Adjust your own MAC verification requirements
- Set maximum number of devices you can register
- Toggle whether new devices can be added

## For Developers

### Add MAC Verification to a Component

```javascript
import useMacVerification from '../hooks/useMacVerification';

function MyAdminComponent() {
  const { macStatus, loading } = useMacVerification();
  
  if (macStatus?.macVerificationRequired && !macStatus?.isVerified) {
    return <div className="warning">Register your device first</div>;
  }
  
  return <div>Your content here</div>;
}
```

### Handle MAC Errors in API Calls

```javascript
import { isMacError, handleMacError } from '../utils/macErrorHandler';

try {
  await adminApi.updateUser({ ... });
} catch (error) {
  if (isMacError(error)) {
    const errorInfo = handleMacError(error);
    showModal(errorInfo.title, errorInfo.message);
    if (errorInfo.shouldNavigate) {
      navigateToMacManagement();
    }
  }
}
```

### Get MAC Status Anywhere

```javascript
import { macApi } from '../services/apiClient';

const status = await macApi.getVerifyStatus();
console.log(status.data.currentMacAddress);
console.log(status.data.macVerificationRequired);
console.log(status.data.isVerified);
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/mac/register` | Register new MAC address |
| GET | `/api/admin/mac/trusted` | Get list of trusted devices |
| POST | `/api/admin/mac/{id}/revoke` | Remove trusted device |
| GET | `/api/admin/mac/access-log` | Get verification history |
| GET | `/api/admin/mac/policy` | Get current policy |
| PATCH | `/api/admin/mac/policy` | Update policy settings |
| GET | `/api/admin/mac/verify-status` | Check verification status |

## File Locations

```
Frontend Components:
- Component: src/components/admin/MacManagement.jsx
- Styling: src/components/admin/MacManagement.css
- Hook: src/hooks/useMacVerification.js
- Services: src/services/macAddressManager.js
- Utils: src/utils/macErrorHandler.js
- API: src/services/apiClient.js (macApi object)
```

## Common MAC Error Messages

### ⚠️ "MAC-verificatie vereist"
**What**: Your MAC address isn't registered
**Solution**: Register your device in MAC Beheer tab

### ⚠️ "Apparaat niet geautoriseerd"  
**What**: Your MAC address exists but isn't trusted
**Solution**: Register it in MAC Beheer tab

### ❌ "Ongeldig MAC-adres"
**What**: The MAC format is wrong
**Solution**: Use format AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF

### ❌ "MAC-verificatie fout"
**What**: Server-side error
**Solution**: Try again later or contact support

## Environment Setup

No special environment variables needed. The frontend uses:
- `VITE_API_BASE_URL` - Existing environment variable for API base

## Testing

### Test MAC Registration
```javascript
// In browser console:
const manager = new MacAddressManager('/api');
await manager.registerMacAddress('AA:BB:CC:DD:EE:FF', 'Test Device');
```

### Test Verification Status
```javascript
// In browser console:
const status = await fetch('/api/admin/mac/verify-status', { credentials: 'include' }).then(r => r.json());
console.log(status);
```

### Test Trusted Devices
```javascript
// In browser console:
const devices = await fetch('/api/admin/mac/trusted', { credentials: 'include' }).then(r => r.json());
console.log(devices.data);
```

## Troubleshooting

### MAC not showing as verified
- Check that browser is sending cookies (credentials: 'include')
- Verify the MAC address matches what backend has registered
- Check access logs to see verification attempts

### Can't register MAC
- Verify MAC format is correct (AA:BB:CC:DD:EE:FF)
- Check internet connection
- Look at browser console for API errors
- Ensure you're logged in as admin

### Access denied on admin operations
- Register your device in MAC Beheer
- Refresh the page
- Check that your MAC policy allows operations

## Performance Notes

- MAC status is checked on component mount
- Trusted devices list is cached in state
- Access logs paginate by 50 entries
- All requests use credentials: include

## Support

For issues:
1. Check browser console for API errors
2. View access logs in MAC Beheer section
3. Verify MAC address format
4. Check network tab in DevTools
5. Contact system administrator if issue persists

---

**Version**: 1.0.0  
**Last Updated**: May 28, 2026
