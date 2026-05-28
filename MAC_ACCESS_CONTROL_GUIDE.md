# Identity-Centric Access Control with MAC Address Verification

## Overview

This document explains how MAC (Media Access Control) address-based identity-centric access control works in the SportPortal frontend application. This security feature allows administrators to register and verify devices by their MAC addresses, ensuring that only trusted devices can perform sensitive admin operations.

---

## How It Works: The Complete Flow

### 1. **What is a MAC Address?**

A MAC address is a unique identifier assigned to every network interface on a device. Format: `AA:BB:CC:DD:EE:FF`

- **Why MAC?** Provides device-level identity that's harder to spoof than IP addresses
- **Frontend Limitation:** Browsers cannot directly access MAC addresses due to security restrictions
- **Solution:** Admins manually enter their device MAC address, which is then verified server-side

---

### 2. **System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (This Application)                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MacManagement.jsx                                          │  │
│  │  - MAC Registration Form                                    │  │
│  │  - Trusted Devices List                                     │  │
│  │  - Access Log Viewer                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│          ↓ (uses)                      ↑ (receives data)         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  useMacVerification Hook                                    │  │
│  │  - Manages MAC verification state                           │  │
│  │  - Calls MAC API endpoints                                  │  │
│  │  - Handles loading/error states                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│          ↓ (sends requests)            ↑ (receives responses)    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  apiClient.js (macApi)                                      │  │
│  │  - POST /admin/mac/register                                 │  │
│  │  - GET /admin/mac/trusted                                   │  │
│  │  - POST /admin/mac/{id}/revoke                              │  │
│  │  - GET /admin/mac/verify-status                             │  │
│  │  - GET /admin/mac/policy                                    │  │
│  │  - GET /admin/mac/access-log                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        ↓ HTTPS ↑
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MAC Verification Middleware                                │  │
│  │  - Intercepts sensitive admin requests                      │  │
│  │  - Checks MAC address against trusted list                  │  │
│  │  - Returns 403 if MAC not trusted                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│          ↓ (if verified)                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Admin Operations                                            │  │
│  │  - User management, activity approval, etc.                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        ↓ SQL ↑
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE                                     │
│  - MAC addresses table                                            │
│  - MAC verification log                                          │
│  - MAC policies per admin                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components Explained

### A. **MacManagement Component** (`src/components/admin/MacManagement.jsx`)

The main UI interface for managing MAC addresses. Features:

#### 1. **Registration Section**
```jsx
// Step 1: Admin enters their MAC address
<input placeholder="AA:BB:CC:DD:EE:FF" />

// Step 2: Optionally name the device
<input placeholder="e.g., Work Laptop" />

// Step 3: Click register
<button onClick={handleRegisterMac}>Register MAC Address</button>
```

**What happens:**
1. Validates MAC format using regex: `/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/`
2. Sends to backend: `POST /api/admin/mac/register`
3. Backend stores MAC address in database
4. Backend adds entry to MAC verification log

#### 2. **Trusted Devices List**
```jsx
// Shows all registered MAC addresses for this admin user
{trustedMacs.map(mac => (
  <div className="mac-card">
    <strong>{mac.device_name}</strong>
    <code>{mac.mac_address}</code>
    <small>Last used: {mac.last_used_at}</small>
    <button onClick={handleRevokeMac}>Revoke</button>
  </div>
))}
```

**Features:**
- View all registered devices
- See when each device was last used
- Revoke/unregister devices when they're no longer trusted
- Expandable details for each device

#### 3. **MAC Policy Controls**
```jsx
// Admins can control their own MAC requirements
<checkbox> Require MAC Verification for all operations
<checkbox> Allow registering new MACs
<number>   Maximum Trusted Devices (1-20)
```

**Policy impacts:**
- If enabled: backend enforces MAC verification on all admin requests
- If disabled: MAC verification is optional for that admin

#### 4. **Access Log**
```jsx
// Shows detailed log of all MAC verification attempts
| Timestamp | MAC Address | Status | IP Address |
|-----------|------------|--------|------------|
| 12:34:56  | AA:BB:..   | ✓ OK   | 192.168... |
| 12:33:45  | CC:DD:..   | ✗ Fail | 10.0...    |
```

Shows audit trail of device access attempts.

---

### B. **useMacVerification Hook** (`src/hooks/useMacVerification.js`)

Custom React hook that manages MAC verification state and provides methods:

```javascript
const {
  // State variables
  macStatus,        // Current MAC verification status
  trustedMacs,      // Array of registered MAC addresses
  accessLog,        // Array of access log entries
  policy,           // MAC policy settings
  loading,          // Loading state
  error,            // Error state

  // Methods
  checkMacStatus,   // Check if MAC verification is required/active
  loadTrustedMacs,  // Load list of trusted MAC addresses
  registerMac,      // Register a new MAC address
  revokeMac,        // Revoke/unregister a MAC address
  updatePolicy,     // Update MAC policy settings
  loadAccessLog,    // Load MAC access log
  loadPolicy,       // Load MAC policy
  validateMacFormat // Validate MAC address format
} = useMacVerification();
```

**Hook lifecycle:**
1. **On mount:** Automatically loads status, trusted MACs, policy, and access log
2. **On action:** Updates relevant state and re-fetches data
3. **Error handling:** Sets error state if any API call fails

---

### C. **API Client** (`src/services/apiClient.js`)

The `macApi` object provides methods to communicate with backend:

```javascript
export const macApi = {
  // Register a new MAC address
  registerMacAddress: ({ macAddress, deviceName }) => 
    POST /api/admin/mac/register

  // Get all trusted MAC addresses for current user
  getTrustedMacAddresses: () => 
    GET /api/admin/mac/trusted

  // Revoke/unregister a MAC address
  revokeMacAddress: ({ macId }) => 
    POST /api/admin/mac/{macId}/revoke

  // Get verification status
  getVerifyStatus: () => 
    GET /api/admin/mac/verify-status

  // Get MAC policy
  getMacPolicy: () => 
    GET /api/admin/mac/policy

  // Update MAC policy
  updateMacPolicy: ({ payload }) => 
    PATCH /api/admin/mac/policy

  // Get access log
  getMacAccessLog: ({ limit, offset }) => 
    GET /api/admin/mac/access-log
}
```

---

## Authentication Flow Step-by-Step

### Step 1: Admin Logs In
```
Admin → Frontend (Login Form) → Backend Auth Endpoint
↓
Backend validates credentials, issues session token
↓
Frontend stores token in secure HTTP-only cookie
↓
Admin is redirected to dashboard
```

### Step 2: MAC Verification Check
```
Frontend loads MacManagement component
↓
useMacVerification hook calls macApi.getVerifyStatus()
↓
Backend checks:
  - Is MAC verification enabled for this admin? (policy setting)
  - Is a MAC address registered? (in database)
  - Is the current MAC in the trusted list? (database lookup)
↓
Backend returns:
  {
    macVerificationRequired: true/false,
    currentMacAddress: "AA:BB:CC:DD:EE:FF" | null,
    isVerified: true/false,
    clientIp: "192.168.1.100"
  }
↓
Frontend displays appropriate warning/success banner
```

### Step 3: Admin Registers a New Device
```
Admin enters MAC address (AA:BB:CC:DD:EE:FF) and device name
↓
Frontend validates:
  - MAC format matches regex
  - Not empty
↓
Frontend sends: POST /api/admin/mac/register
  {
    macAddress: "AA:BB:CC:DD:EE:FF",
    deviceName: "Work Laptop"
  }
↓
Backend:
  1. Validates MAC format again (server-side security)
  2. Checks max_trusted_macs policy (prevent too many devices)
  3. Inserts into database
  4. Logs to MAC_ACCESS_LOG
↓
Frontend receives success response:
  {
    success: true,
    message: "MAC address registered successfully"
  }
↓
Frontend reloads trusted MACs list
↓
New device appears in "Geregistreerde apparaten" list
```

### Step 4: Admin Performs Sensitive Operation
```
Admin clicks "Approve User" button in AdminPanel
↓
Frontend intercepts the request in apiClient.js:
  if (response.status === 403) {
    const data = await response.json()
    if (data.code === 'MAC_REQUIRED') {
      // Handle: MAC not registered yet
      redirectToMacManagement()
    } else if (data.code === 'MAC_UNTRUSTED') {
      // Handle: MAC registered but not on trusted list
      showError("Device not authorized")
    }
  }
↓
Alternatively, backend allows operation if:
  - MAC verification is disabled for that admin, OR
  - Current request MAC matches a trusted entry
↓
Backend executes the operation and returns result
```

### Step 5: Admin Revokes a Device
```
Admin clicks "Intrekken" (revoke) button on a trusted device
↓
Frontend shows confirmation dialog
↓
Frontend sends: POST /api/admin/mac/{macId}/revoke
↓
Backend:
  1. Verifies ownership (user can only revoke their own MACs)
  2. Deletes from database or marks as revoked
  3. Logs to MAC_ACCESS_LOG
↓
Frontend receives success response
↓
Frontend reloads trusted MACs list
↓
Device disappears from "Geregistreerde apparaten"
↓
If this was the only trusted device: Mac verification now fails
```

---

## Error Codes and Handling

The backend returns specific error codes to help frontend handle different scenarios:

| Code | HTTP Status | Meaning | Frontend Action |
|------|-------------|---------|-----------------|
| `MAC_REQUIRED` | 403 | MAC verification is enabled but no MAC found | Show warning, redirect to MAC Management |
| `MAC_UNTRUSTED` | 403 | MAC was provided but not on trusted list | Show "Device not authorized" message |
| `MAC_INVALID` | 403 | MAC format is invalid | Show error, guide user to correct format |
| `MAC_ERROR` | 500 | Server-side error in MAC verification | Show generic error |
| `MAC_POLICY_EXCEEDED` | 400 | Already have max number of trusted MACs | Show error, ask to revoke another device |

**Example: Frontend handling MAC_REQUIRED error**
```javascript
async function callAdminApi(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, { ...options, credentials: 'include' });
    
    if (response.status === 403) {
      const data = await response.json();
      
      if (data.code === 'MAC_REQUIRED') {
        // Show user-friendly message
        showModal({
          title: 'MAC Verification Required',
          message: 'Please register your device MAC address first',
          action: 'Go to MAC Management'
        }).then(() => {
          router.push('/admin/settings/mac');
        });
        return null;
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}
```

---

## Security Considerations

### 1. **What Makes This Secure?**

- **Device-Level Identity:** MAC addresses are tied to physical hardware
- **Server-Side Validation:** All MAC checks happen on backend (can't bypass in frontend)
- **HTTPS Only:** MAC addresses transmitted only over encrypted connections
- **Database Storage:** MAC addresses stored securely in database
- **Access Logging:** Every MAC verification attempt logged for audit trail
- **User-Scoped:** Admin can only manage their own MAC addresses

### 2. **What It's NOT**

- **Not a replacement for passwords:** MAC + password = secure
- **Not foolproof:** Advanced attackers could spoof MAC addresses
- **Not automatic:** Requires manual registration by each admin
- **Not invisible:** Users must enter their MAC addresses

### 3. **Best Practices**

```
✅ DO:
  - Register MAC from devices you frequently use
  - Review access log regularly for suspicious activity
  - Revoke devices when you switch equipment
  - Enable MAC verification policy for maximum security

❌ DON'T:
  - Share your MAC address with others
  - Register devices you don't own
  - Leave access log unchecked
  - Register too many devices (keep it to 3-5)
```

---

## Integration with Admin Panel

The MAC verification system is integrated into the admin panel as follows:

### In AdminPanel.jsx:
```javascript
import useMacVerification from '../../hooks/useMacVerification';

const AdminPanel = () => {
  const { macStatus } = useMacVerification();

  // If MAC verification is required and not verified,
  // the user cannot perform admin operations
  if (macStatus?.macVerificationRequired && !macStatus?.isVerified) {
    return <MacManagement />; // Force MAC registration first
  }

  // Otherwise show full admin panel
  return (
    <div className="admin-panel">
      {/* Admin operations */}
    </div>
  );
};
```

### Warning Banner:
If MAC verification is required but not set up, a warning banner appears:
```jsx
{macStatus?.macVerificationRequired && !isVerified && (
  <div className="warning-banner">
    ⚠️ MAC Verification Required
    <p>Register your device to perform admin operations</p>
  </div>
)}
```

### Status Indicator:
Shows current verification status:
```jsx
{macStatus?.isVerified ? (
  <span className="verified">🔒 Device Verified</span>
) : (
  <span className="warning">⚠️ Register Device</span>
)}
```

---

## Data Flow Example: Register MAC

```
┌─ User enters MAC: AA:BB:CC:DD:EE:FF ─┐
│  User enters name: "Work Laptop"    │
│  User clicks: "Register"            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ MacManagement.jsx                    │
│ handleRegisterMac() called           │
│ Validates: MAC format, not empty    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ useMacVerification Hook              │
│ registerMac(mac, name)               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ apiClient.js                         │
│ macApi.registerMacAddress({...})    │
│ Sends: POST /api/admin/mac/register │
│ Body: {                             │
│   macAddress: "AA:BB:CC:DD:EE:FF",  │
│   deviceName: "Work Laptop"         │
│ }                                   │
└─────────────────────────────────────┘
           ↓ (HTTPS)
┌─────────────────────────────────────┐
│ Backend: POST /admin/mac/register    │
│ 1. Verify authentication (session)  │
│ 2. Validate MAC format              │
│ 3. Check policy: max_trusted_macs   │
│ 4. Insert into database             │
│ 5. Log to MAC_ACCESS_LOG            │
│ 6. Return success                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Response: {                         │
│   "success": true,                  │
│   "message": "MAC registered"       │
│ }                                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ macApi callback                      │
│ Returns result                      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ useMacVerification Hook              │
│ Shows success message               │
│ Reloads trustedMacs list            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ MacManagement.jsx                    │
│ Updates UI:                         │
│ - Clear form                        │
│ - Show success: "✓ Registered!"     │
│ - Add to trusted list               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ User sees new device in list        │
└─────────────────────────────────────┘
```

---

## Testing MAC Verification

### Test Scenario 1: Register and Verify MAC
1. Log in as admin
2. Go to MAC Management (in Admin Panel)
3. Find your MAC address:
   - **Windows:** Open PowerShell, run `ipconfig /all`, find "Physical Address"
   - **Mac:** Open Terminal, run `ifconfig`, look for "ether"
   - **Linux:** Run `ip addr show`, find "link/ether"
4. Enter MAC in format `AA:BB:CC:DD:EE:FF`
5. Enter device name
6. Click "Register"
7. Verify MAC appears in "Geregistreerde apparaten"

### Test Scenario 2: Perform Admin Operation
1. With MAC registered and policy enabled
2. Try to approve a user or perform another admin action
3. Verify request succeeds (backend accepts the MAC)

### Test Scenario 3: Unauthorized Device
1. Register Device A's MAC
2. Try to access from Device B (different MAC)
3. Verify 403 error with `MAC_UNTRUSTED` code
4. Verify frontend shows "Device not authorized"

### Test Scenario 4: Revoke Device
1. Go to MAC Management
2. Click "Intrekken" on a trusted device
3. Confirm the revocation
4. Verify device is removed from list
5. Try to access from that device
6. Verify access is denied (if policy requires MAC)

---

## Viewing Stored MACs

To see what's being tracked:

**Database Schema (approx.):**
```sql
-- Table: admin_mac_addresses
mac_id (PRIMARY KEY)
user_id (FOREIGN KEY to admin user)
mac_address (the MAC: AA:BB:CC:DD:EE:FF)
device_name (friendly name: "Work Laptop")
is_revoked (0 or 1)
created_at (timestamp)
last_used_at (timestamp)

-- Table: mac_access_log
log_id (PRIMARY KEY)
user_id
mac_address
ip_address
is_trusted (0 or 1)
result (success, invalid_format, not_trusted, etc.)
created_at (timestamp)

-- Table: admin_mac_policies
policy_id (PRIMARY KEY)
user_id (scoped to individual admin)
mac_verification_required (0 or 1)
allow_new_macs (0 or 1)
max_trusted_macs (integer: 1-20)
created_at
updated_at
```

---

## Summary

The MAC-based Identity-Centric Access Control system:

1. **Registers** device MAC addresses per admin user
2. **Verifies** that requests come from registered devices
3. **Logs** all verification attempts for audit trail
4. **Manages** policies and trusted device limits
5. **Prevents** unauthorized access from unknown devices

**Flow:**
```
Admin enters MAC → Frontend validates → Sends to backend → Backend stores → 
Backend verifies on subsequent requests → Allows/denies based on trust → 
Logs all attempts
```

This provides a strong identity-centric access control layer that complements traditional username/password authentication.

---

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `src/components/admin/MacManagement.jsx` | Main UI component |
| `src/components/admin/MacManagement.css` | Styling |
| `src/hooks/useMacVerification.js` | React hook for MAC logic |
| `src/services/macAddressManager.js` | MAC address utility class |
| `src/services/apiClient.js` | API endpoints (`macApi`) |
| `src/components/admin/AdminPanel.jsx` | Integration point |

---

## For Backend Developers

The backend needs to implement these endpoints:

```
POST   /api/admin/mac/register              - Register a MAC address
GET    /api/admin/mac/trusted               - Get user's trusted MACs
POST   /api/admin/mac/{macId}/revoke       - Revoke a MAC address
GET    /api/admin/mac/verify-status        - Check current MAC status
GET    /api/admin/mac/policy               - Get MAC policy
PATCH  /api/admin/mac/policy               - Update MAC policy
GET    /api/admin/mac/access-log           - Get access log
[AUTH] - Middleware to verify MAC on sensitive endpoints
```

See `FRONTEND_IMPLEMENTATION_GUIDE.md` for complete backend contract details.
