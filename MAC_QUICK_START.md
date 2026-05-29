# MAC-Based Identity-Centric Access Control - Quick Start Guide

## 🎯 What You Have

Your SportPortal frontend now has **Identity-Centric Access Control with MAC address verification**. This means admin users must register their device's MAC address to perform sensitive admin operations.

---

## 🚀 For Admin Users - First Time Setup

### Step 1: Find Your Device's MAC Address

#### Windows
```powershell
# Open PowerShell and run:
ipconfig /all

# Look for "Physical Address" under your network adapter
# Example: AA-BB-CC-DD-EE-FF
```

#### Mac
```bash
# Open Terminal and run:
ifconfig

# Look for "ether" (wireless) or "lladdr" (ethernet)
# Example: aa:bb:cc:dd:ee:ff
```

#### Linux
```bash
# Run:
ip addr show

# Look for "link/ether"
# Example: aa:bb:cc:dd:ee:ff
```

### Step 2: Register Your Device

1. Log in to SportPortal as an admin
2. Go to **Admin Panel** (`/admin`)
3. You'll see the **MAC Address Management** interface
4. Enter your MAC address in format: `AA:BB:CC:DD:EE:FF`
5. (Optional) Enter device name: "Work Laptop"
6. Click **"Register MAC Address"**
7. ✅ Your device is now trusted!

---

## 📋 Managing Your Devices

### View Registered Devices
- All your devices appear in **"Geregistreerde apparaten"** (Registered Devices) section
- Shows device name and MAC address
- Shows when each device was last used

### Add Another Device
- Got a new laptop or working from home?
- Go to **MAC Management** and register the new device's MAC
- You can have multiple devices registered

### Remove a Device (Revoke)
- Click **"✕ Intrekken"** (Revoke) button on any device card
- Confirm the action
- That device can no longer access admin features
- ⚠️ **Don't revoke all devices if MAC verification is required!**

### View Device Details
- Click on a device card to expand and see:
  - Registration date
  - Last used date
  - Verification status

---

## 🔐 Understanding How It Works

### Simple Explanation

```
You (Admin) with your laptop
    ↓
Enter MAC: AA:BB:CC:DD:EE:FF
    ↓
System stores this MAC in database
    ↓
Later, when you try to do admin action:
    ↓
System checks: "Is your MAC AA:BB:CC:DD:EE:FF registered?"
    ↓
✓ Yes → Allows the action
✗ No  → Denies the action with error
```

### What Gets Checked

1. **Is MAC registered?** - System finds your MAC in your device list
2. **Is MAC trusted?** - Your MAC is on the approved list
3. **Is policy enabled?** - You have MAC verification turned on
4. **Log everything** - All access attempts recorded for audit trail

---

## ⚙️ Policy Settings

Go to **MAC Management** → **"MAC Verification Policy"** section:

### Option 1: Require MAC Verification
```
☑ Require MAC Verification for all operations
```
- When enabled: You MUST have registered MAC to do admin actions
- When disabled: MAC verification is optional

### Option 2: Allow New MACs
```
☑ Allow registering new MACs
```
- When enabled: You can add new devices anytime
- When disabled: You can't register more devices (security measure)

### Option 3: Max Trusted Devices
```
Max Trusted Devices: [5]
```
- Prevents registering unlimited devices
- Keep this low (1-5 devices is recommended)
- Shows current usage: "2 / 5"

---

## 📊 Monitoring Access

### Access Log Section

Shows all MAC verification attempts:

```
Timestamp            MAC Address        Status      IP Address
─────────────────    ──────────────────  ──────────  ──────────
2026-05-28 14:30     AA:BB:CC:DD:EE:FF  ✓ OK        192.168.1.100
2026-05-28 14:25     AA:BB:CC:DD:EE:FF  ✓ OK        192.168.1.100
2026-05-28 13:50     FF:EE:DD:CC:BB:AA  ✗ FAIL      10.0.0.50
```

- ✓ OK = MAC was trusted, access granted
- ✗ FAIL = MAC was untrusted, access denied

**Review regularly!** Look for suspicious activity like:
- Unknown MAC addresses accessing
- Many failed attempts
- Access from unexpected IP addresses

---

## 📱 Real-World Scenarios

### Scenario 1: New Laptop

```
You: "Got a new work laptop!"
System: "This MAC is not registered"
You: → Register new MAC in MAC Management
System: "Both laptops now work!"
```

### Scenario 2: Lost Device

```
Your laptop was stolen
You: → Go to MAC Management
You: → Find that laptop's MAC
You: → Click "Revoke"
System: "That MAC is no longer trusted"
Attacker: "Can't access admin features now! 😞"
```

### Scenario 3: Working From Different Locations

```
Scenario A: Different WiFi
You: "Changed to home WiFi"
MAC Address: No change (MAC is part of your device, not WiFi)
System: "MAC is still registered, access granted"

Scenario B: Different Device
You: "Using work desktop instead of laptop"
MAC Address: Different (different device)
System: "MAC not found, access denied"
You: → Register home desktop's MAC
System: "Now you can use both!"
```

---

## ⚠️ Common Issues & Solutions

### Issue: "⚠️ MAC-verificatie vereist" Warning

**Cause:** You haven't registered a MAC yet
**Solution:**
1. Find your device's MAC (see "Getting Started" section)
2. Enter it in MAC Management
3. Click "Register"
4. Warning should disappear

---

### Issue: "MAC_UNTRUSTED - Device not authorized"

**Cause:** 
- You're using a different device than the registered one
- Your network card was replaced
- MAC wasn't registered correctly

**Solution:**
1. Check which device/MAC caused the error
2. Register that device's MAC in MAC Management
3. Or revoke old device if not needed anymore

---

### Issue: "Can't add new MAC - policy prevents it"

**Cause:** "Allow registering new MACs" is disabled

**Solution:**
1. Go to MAC Management
2. Find policy settings
3. Enable: "☑ Allow registering new MACs"
4. Now you can add new devices

---

### Issue: Completely Locked Out

**Cause:** Revoked all devices while MAC verification is required

**Solution:** 
- Contact your backend/system administrator
- They can temporarily disable MAC verification
- Or manually add your MAC to the database

**Prevention:** Always keep at least 1 device registered!

---

## 🛡️ Security Best Practices

### ✅ DO

- Register your primary work device
- Register your home device for remote work
- Check access log regularly for suspicious activity
- Revoke devices when you replace equipment or sell them
- Enable MAC verification if you're a sensitive admin role
- Keep 1-3 devices maximum

### ❌ DON'T

- Share your MAC address with others
- Register devices you don't own
- Revoke all devices (you'll lock yourself out)
- Ignore suspicious entries in access log
- Register 10+ devices ("security through trust" doesn't work)
- Assume MAC is 100% foolproof (it's one layer, not the only one)

---

## 🎓 How the System Works (Detailed)

### Architecture

```
┌──────────────────┐
│   Your Device    │
│  (with MAC:      │
│   AA:BB:CC:...)  │
└────────┬─────────┘
         │
         │ 1. You register MAC
         ↓
┌──────────────────┐
│  Frontend        │ 2. Validates format
│  (Browser)       │ 3. Sends to backend
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Backend API     │ 4. Verifies in database
│ /admin/mac/...   │ 5. Stores if valid
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Database        │ 6. Stores:
│                  │    • Your MAC address
└──────────────────┘    • Device name
                        • Registration time
                        • Last used
```

### When You Perform Admin Action

```
You: "Approve user"
     ↓
System checks:
  1. Is MAC verification required? (from policy)
  2. Do you have a registered MAC? (from database)
  3. Is current MAC on trusted list? (from database)
     ↓
  ✓ YES to all → Action allowed
  ✗ NO to any → Action denied (error code returned)
```

### Backend Endpoints Called

```
Frontend calls these API endpoints:

POST   /api/admin/mac/register           → Register new MAC
GET    /api/admin/mac/trusted            → Get your devices
POST   /api/admin/mac/{id}/revoke        → Remove device
GET    /api/admin/mac/verify-status      → Check status
GET    /api/admin/mac/policy             → Get your policy
PATCH  /api/admin/mac/policy             → Update policy
GET    /api/admin/mac/access-log         → View access log
```

---

## 📂 Where To Find Things

### In This Repository

```
src/components/admin/
  └─ MacManagement.jsx        ← Main interface you see
  
src/hooks/
  └─ useMacVerification.js    ← The logic behind everything
  
src/services/
  ├─ apiClient.js             ← API endpoint calls
  └─ macAddressManager.js      ← MAC utility functions

Documentation:
  ├─ MAC_QUICK_START.md       ← This file
  ├─ MAC_ACCESS_CONTROL_GUIDE.md  ← Detailed technical guide
  └─ FRONTEND_IMPLEMENTATION_GUIDE.md ← Backend integration
```

---

## 🎯 MAC Format Reference

### Valid Formats
```
✓ AA:BB:CC:DD:EE:FF    (uppercase with colons)
✓ aa:bb:cc:dd:ee:ff    (lowercase with colons)  
✓ AA-BB-CC-DD-EE-FF    (uppercase with dashes)
✓ aa-bb-cc-dd-ee-ff    (lowercase with dashes)
```

### Invalid Formats
```
✗ AABBCCDDEEFF         (missing separators)
✗ AA:BB:CC:DD:EE:GG    (non-hexadecimal character 'G')
✗ AA:BB:CC:DD:EE       (too short)
✗ AA:BB:CC:DD:EE:FF:AA (too long)
```

The system automatically accepts both `:` and `-` separators and converts everything to uppercase for consistency.

---

## 💡 FAQ

**Q: Is my MAC address private?**
A: Yes. It's stored securely in your database and only transmitted over HTTPS to your own backend.

**Q: Can someone access my admin account if they're on my WiFi?**
A: No. They'd still need your username and password. MAC just adds an extra verification layer.

**Q: What happens if I move to a different internet provider?**
A: No issue. Your MAC address is part of your device hardware, not your internet connection.

**Q: Why did I get "MAC_UNTRUSTED" error?**
A: You're trying to access from a device whose MAC isn't registered. Register it in MAC Management.

**Q: Can I have multiple accounts with the same MAC?**
A: Each admin has their own separate MAC list. Same MAC on different admin accounts is fine.

**Q: What if my laptop breaks?**
A: Old MAC becomes useless. Just don't register it again. Register your replacement device instead.

---

## 📞 Need Help?

### For Admin Users
- **Can't find MAC address?** → See "Finding Your MAC Address" section
- **Can't register?** → Check MAC format (should be AA:BB:CC:DD:EE:FF)
- **Completely locked out?** → Contact your system administrator

### For Developers
- **How to integrate MAC into other endpoints?** → See FRONTEND_IMPLEMENTATION_GUIDE.md
- **Want to understand the architecture?** → See MAC_ACCESS_CONTROL_GUIDE.md
- **How to test?** → See MAC_ACCESS_CONTROL_GUIDE.md "Testing" section

---

## 🚀 What's Next?

1. ✅ Go to Admin Panel
2. ✅ Find your device's MAC address (Windows/Mac/Linux instructions above)
3. ✅ Register your MAC in MAC Management
4. ✅ Review your access log
5. ✅ Share this guide with other admins
6. ✅ Monitor for suspicious activity

---

**Happy secure admin-ing! 🔒**
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
