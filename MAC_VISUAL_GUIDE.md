# Visual Guide: MAC-Based Identity-Centric Access Control

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         ADMIN USER                                  │
│                   (Your Laptop/Desktop)                             │
│                      MAC: AA:BB:CC:..                               │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ 1. Logs in with username/password
             │
             ↓
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ App.jsx                                                       │  │
│  │ → Routes to /admin                                           │  │
│  │ → Loads AdminPanel.jsx                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ AdminPanel.jsx                                               │  │
│  │ → Calls: useMacVerification()                                │  │
│  │ → Checks: Is MAC verification required?                     │  │
│  │ → Decision: Show MacManagement or AdminPanel                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│          ↓ (if not verified)           ↓ (if verified)             │
│  ┌──────────────────┐         ┌──────────────────────────────┐    │
│  │ MacManagement.jsx│         │ Full Admin Panel Visible    │    │
│  │ - Register MAC   │         │ - Users                    │    │
│  │ - View Devices   │         │ - Activities               │    │
│  │ - Manage Policy  │         │ - Voting                   │    │
│  │ - Access Log     │         │ - Settings                 │    │
│  └────────┬─────────┘         └──────────────────────────────┘    │
│           │                                                         │
│           │ 2. User enters MAC: AA:BB:CC:DD:EE:FF                │
│           │ 3. Clicks: Register                                  │
│           │                                                         │
│           ↓                                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ useMacVerification Hook                                       │  │
│  │ - Validates MAC format (regex)                                │  │
│  │ - Calls: registerMac(macAddress, deviceName)                 │  │
│  │ - Updates state                                               │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                  │
│                   ↓                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ apiClient.js (macApi)                                        │  │
│  │ POST /api/admin/mac/register                                 │  │
│  │ {                                                             │  │
│  │   macAddress: "AA:BB:CC:DD:EE:FF",                           │  │
│  │   deviceName: "Work Laptop"                                  │  │
│  │ }                                                             │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
└────────────────────┼──────────────────────────────────────────────┘
                     │ 4. HTTPS POST Request
                     │ (with session cookie)
                     ↓
┌────────────────────────────────────────────────────────────────────┐
│                        BACKEND API                                  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Route: POST /admin/mac/register                              │  │
│  │ - Verify authentication (session/JWT)                        │  │
│  │ - Validate MAC format again                                  │  │
│  │ - Check max_trusted_macs policy                              │  │
│  │ - Prevent duplicates                                         │  │
│  │ - Generate error if policy violated                          │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                  │
│                   ↓                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Database Operations                                           │  │
│  │ INSERT INTO admin_mac_addresses                              │  │
│  │ VALUES (user_id, "AA:BB:CC:DD:EE:FF", "Work Laptop",         │  │
│  │         0, NOW(), NULL)                                      │  │
│  │                                                               │  │
│  │ INSERT INTO mac_access_log                                   │  │
│  │ VALUES (user_id, "AA:BB:CC:DD:EE:FF", "192.168.1.100",       │  │
│  │         1, "success", NOW())                                 │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                  │
│                   ↓                                                  │
│  Response: {                                                        │
│    "success": true,                                                 │
│    "message": "MAC address registered successfully"                │
│  }                                                                  │
└────────────────────┬──────────────────────────────────────────────┘
                     │ 5. HTTPS Response
                     │
                     ↓
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ apiClient receives: { success: true, ... }                   │  │
│  │ Returns result to hook                                       │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                  │
│                   ↓                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ useMacVerification Hook                                       │  │
│  │ - Sets: registrationSuccess = true                            │  │
│  │ - Calls: loadTrustedMacs()                                    │  │
│  │ - Updates state: trustedMacs = [...]                          │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                  │
│                   ↓                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ MacManagement.jsx                                             │  │
│  │ Re-renders with:                                              │  │
│  │ - Success message: "✓ MAC registered!"                        │  │
│  │ - Clear form: MAC address field empty                         │  │
│  │ - Update list: New device appears                             │  │
│  │                                                               │  │
│  │ Device Card:                                                  │  │
│  │ ┌────────────────────────────────────┐                       │  │
│  │ │ Work Laptop                        │                       │  │
│  │ │ AA:BB:CC:DD:EE:FF                  │                       │  │
│  │ │ Registered: 2026-05-28 14:30       │                       │  │
│  │ │              [✕ Revoke]            │                       │  │
│  │ └────────────────────────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  6. Admin sees success, MAC is now registered                       │
│  7. Admin can now access admin features                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram: Complete Admin Operation

```
Timeline: 1 min after MAC registration

User            Frontend         Backend DB        Backend API
│                   │               │                   │
│ Clicks            │               │                   │
│ "Approve User"    │               │                   │
├──────────────────→│               │                   │
│                   │ POST /admin/users/{id}/approve    │
│                   ├───────────────────────────────────→│
│                   │               │                   │
│                   │               │ Check policy:    │
│                   │               │ MAC verification?│
│                   │               │ YES              │
│                   │               │                  │ Query: SELECT * FROM
│                   │               │←─────────────────┤ admin_mac_addresses
│                   │               │ Policy check:    │ WHERE user_id=123
│                   │               │ MAC required     │
│                   │               │                  │ Result: Found MAC
│                   │               │                  │ AA:BB:CC:DD:EE:FF
│                   │               │                  │
│                   │               │ Verify MAC:      │ Query: SELECT * FROM
│                   │               │ Is current MAC   │ MAC_ACCESS_LOG
│                   │               │ on trusted list? │ WHERE user_id=123
│                   │               │ YES ✓            │ AND is_trusted=1
│                   │               │←─────────────────┤
│                   │               │                  │
│                   │               │ Log access       │ INSERT INTO
│                   │               │                  │ mac_access_log
│                   │               │←─────────────────┤ (user_id, MAC, IP,
│                   │               │ Entry logged     │  is_trusted=1, ...)
│                   │               │                  │
│                   │               │ Execute:         │
│                   │               │ Approve user     │
│                   │               │←─────────────────┤
│                   │               │ Success          │
│                   │←─────────────────────────────────│
│ ✓ User approved  │ 200 OK                            │
│                   │               │                  │

Alternative Path (If MAC verification fails):

User             Frontend         Backend DB        Backend API
│                   │               │                   │
│ Clicks            │               │                   │
│ "Approve User"    │               │                   │
├──────────────────→│               │                   │
│                   │ POST /admin/users/{id}/approve    │
│                   ├───────────────────────────────────→│
│                   │               │                   │
│                   │               │ Check policy:    │
│                   │               │ MAC required: YES│
│                   │               │                  │
│                   │               │ MAC registered?: │
│                   │               │                  │ Query: SELECT * FROM
│                   │               │←─────────────────┤ admin_mac_addresses
│                   │               │ NOT FOUND        │
│                   │               │                  │
│                   │←─────────────────────────────────│
│ ✗ MAC_UNTRUSTED  │ 403 Forbidden                     │
│   Error shown     │ { code: "MAC_UNTRUSTED" }         │
│                   │                                   │
│ Message:          │                                   │
│ "Register your    │                                   │
│  device first"    │                                   │
```

---

## State Flow in Component

```
MacManagement.jsx State Variables:

┌─────────────────────────────────────┐
│ React State (Local)                 │
│                                     │
│ macForm = {                         │
│   address: "AA:BB:CC:DD:EE:FF"     │
│   deviceName: "Work Laptop"         │
│ }                                   │
│                                     │
│ registrationError = ""              │
│ registrationSuccess = ""            │
│ policySuccess = ""                  │
│ loading = false                     │
│ expandedMacId = null                │
└─────────────────────────────────────┘
         ↑
         │ From useMacVerification Hook
         │
┌─────────────────────────────────────┐
│ Hook State (Shared)                 │
│                                     │
│ macStatus = {                       │
│   macVerificationRequired: true,    │
│   isVerified: true,                 │
│   currentMacAddress: "AA:BB:..."    │
│ }                                   │
│                                     │
│ trustedMacs = [                     │
│   {                                 │
│     id: 1,                          │
│     mac_address: "AA:BB:CC:...",    │
│     device_name: "Work Laptop",     │
│     created_at: "2026-05-28...",    │
│     last_used_at: "2026-05-28..."   │
│   }                                 │
│ ]                                   │
│                                     │
│ accessLog = [                       │
│   {                                 │
│     timestamp: "2026-05-28 14:30",  │
│     mac_address: "AA:BB:CC:...",    │
│     status: "trusted",              │
│     ip_address: "192.168.1.100"     │
│   }                                 │
│ ]                                   │
│                                     │
│ policy = {                          │
│   macVerificationRequired: true,    │
│   allowNewMacs: false,              │
│   maxTrustedMacs: 5                 │
│ }                                   │
│                                     │
│ loading = false                     │
│ error = null                        │
└─────────────────────────────────────┘
```

---

## API Endpoint Flow

```
Frontend calls these endpoints in sequence:

1. Component mounts
   └─→ useEffect runs
       └─→ Hook methods called:
           ├─ checkMacStatus()      → GET /api/admin/mac/verify-status
           ├─ loadTrustedMacs()     → GET /api/admin/mac/trusted
           ├─ loadPolicy()          → GET /api/admin/mac/policy
           └─ loadAccessLog()       → GET /api/admin/mac/access-log

2. User registers MAC
   └─→ handleRegisterMac() called
       └─→ registerMac(mac, name)
           └─→ POST /api/admin/mac/register
               └─→ loadTrustedMacs() (reload list)
                   └─→ GET /api/admin/mac/trusted

3. User changes policy
   └─→ handlePolicyUpdate() called
       └─→ updatePolicy(updates)
           └─→ PATCH /api/admin/mac/policy
               └─→ loadPolicy() (reload)
                   └─→ GET /api/admin/mac/policy

4. User revokes device
   └─→ handleRevokeMac() called
       └─→ revokeMac(macId)
           └─→ POST /api/admin/mac/{macId}/revoke
               └─→ loadTrustedMacs() (reload list)
                   └─→ GET /api/admin/mac/trusted

5. User loads more logs
   └─→ handleLoadMoreLogs() called
       └─→ loadAccessLog(50, offset)
           └─→ GET /api/admin/mac/access-log?limit=50&offset=50
```

---

## MAC Validation Pipeline

```
User enters: "aA-bB-Cc-Dd-Ee-Ff"
                     ↓
Frontend Validation:
  ├─ Not empty? ✓
  ├─ Format matches regex? ✓
  │  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  └─ Shows: "✓ Valid MAC format"
                     ↓
User clicks Register
                     ↓
Frontend converts:
  └─ Uppercase + normalize separators
     "AA:BB:CC:DD:EE:FF"
                     ↓
Send to Backend:
  POST /api/admin/mac/register
  {
    macAddress: "AA:BB:CC:DD:EE:FF",
    deviceName: "Work Laptop"
  }
                     ↓
Backend Validation:
  ├─ Authenticated? ✓
  ├─ Format valid? ✓
  ├─ Not already registered? ✓
  ├─ Under max_trusted_macs? ✓
  └─ No errors? ✓
                     ↓
Backend stores:
  INSERT INTO admin_mac_addresses
  VALUES (..., "AA:BB:CC:DD:EE:FF", "Work Laptop", ...)
                     ↓
Response: { success: true, ... }
                     ↓
Frontend shows:
  "✓ MAC registered successfully!"
                     ↓
MAC appears in trusted devices list
```

---

## Error Handling Flow

```
User tries admin action without MAC registered:

POST /api/admin/users/123/approve
(with auth but no MAC)
        ↓
Backend checks MAC policy
        ├─ Is MAC verification required? YES
        ├─ Is MAC registered? NO
        └─ Return error
        ↓
HTTP 403 Forbidden
{
  "code": "MAC_REQUIRED",
  "error": "MAC address verification required"
}
        ↓
Frontend receives 403
        ├─ Check error.code
        ├─ If "MAC_REQUIRED"
        │   ├─ Show modal:
        │   │  "MAC Verification Required"
        │   │  "Please register your device MAC"
        │   ├─ Add button: "Go to MAC Management"
        │   └─ On click: Navigate to MacManagement
        │
        └─ If "MAC_UNTRUSTED"
            ├─ Show modal:
            │  "Device Not Authorized"
            │  "Your MAC is not on trusted list"
            ├─ Add button: "Manage Devices"
            └─ User redirects to review trusted MACs
        ↓
User registers MAC
        ↓
User tries action again
        ↓
Backend finds MAC in database
        ├─ Verification passes ✓
        └─ Action executed
        ↓
Success!
```

---

## User Journey Map

```
┌─────────────────────────────────────────────────────────┐
│ FIRST TIME ADMIN                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Login                                                │
│    └─ Enters credentials                                │
│       └─ Gets session cookie                            │
│          └─ Redirected to /admin                        │
│                                                         │
│ 2. See warning: "MAC Verification Required"             │
│    └─ Can't see admin features                          │
│       └─ Must register MAC first                        │
│                                                         │
│ 3. Find MAC address                                     │
│    └─ Windows: ipconfig /all                            │
│    └─ Mac: ifconfig                                     │
│    └─ Linux: ip addr show                               │
│    └─ Gets: AA:BB:CC:DD:EE:FF                           │
│                                                         │
│ 4. Register MAC in form                                 │
│    └─ Input: AA:BB:CC:DD:EE:FF                          │
│    └─ Input: "Work Laptop" (optional)                   │
│    └─ Click: "Register"                                 │
│                                                         │
│ 5. Success!                                             │
│    └─ See: "✓ MAC registered!"                          │
│    └─ Device appears in trusted list                    │
│    └─ Full admin panel now visible                      │
│       └─ Can manage users                               │
│       └─ Can approve activities                         │
│       └─ Can see voting results                         │
│       └─ Can manage other admins                        │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ RETURNING ADMIN (New Device)                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Login from new laptop                                │
│    └─ New device = different MAC                        │
│                                                         │
│ 2. Try admin operation                                  │
│    └─ Get error: "MAC_UNTRUSTED"                        │
│    └─ See modal: "Device not authorized"                │
│       └─ Can't proceed                                  │
│                                                         │
│ 3. Go to MAC Management                                 │
│    └─ View registered devices                           │
│    └─ See old laptop MAC still there                    │
│    └─ Enter new laptop MAC                              │
│    └─ Click Register                                    │
│                                                         │
│ 4. Now have 2 devices registered                        │
│    └─ Both MACs are trusted                             │
│    └─ Can use from either device                        │
│                                                         │
│ 5. Later: Old laptop no longer used                     │
│    └─ Go to MAC Management                              │
│    └─ Find old MAC in list                              │
│    └─ Click "Revoke"                                    │
│    └─ Confirm                                           │
│    └─ Only new laptop MAC remains                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Status Indicators

```
┌─────────────────────────────────────────────────┐
│ BANNER STATES                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⚠️ WARNING BANNER (Red)                        │
│ "MAC Verification Required"                     │
│ Shown when:                                     │
│  - Policy requires MAC verification             │
│  - AND MAC not registered                       │
│  - AND admin tries to access features           │
│                                                 │
│ ✓ SUCCESS BANNER (Green)                       │
│ "Device Verified - AA:BB:CC:DD:EE:FF"          │
│ Shown when:                                     │
│  - Policy requires MAC verification             │
│  - AND MAC is registered                        │
│  - AND MAC is on trusted list                   │
│                                                 │
│ ℹ️ INFO BANNER (Blue)                          │
│ "MAC Verification Optional"                     │
│ Shown when:                                     │
│  - Policy does NOT require MAC verification     │
│  - MAC verification is disabled                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Integration Points

```
MacManagement component accesses:

┌─────────────────────────────────────────────────────────┐
│                useMacVerification Hook                  │
├─────────────────────────────────────────────────────────┤
│ Provides:                                               │
│  • macStatus         ← Check verification required     │
│  • trustedMacs       ← Display device list             │
│  • accessLog         ← Show access attempts            │
│  • policy            ← Display policies                │
│  • loading           ← Show loading states             │
│  • error             ← Handle errors                   │
│  • registerMac()     ← Called on form submit           │
│  • revokeMac()       ← Called on revoke button         │
│  • updatePolicy()    ← Called on policy checkbox      │
│  • loadAccessLog()   ← Called on load more            │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│              apiClient.js (macApi)                      │
├─────────────────────────────────────────────────────────┤
│ Provides API calls to:                                  │
│  • POST   /admin/mac/register                          │
│  • GET    /admin/mac/trusted                           │
│  • POST   /admin/mac/{id}/revoke                       │
│  • GET    /admin/mac/verify-status                     │
│  • GET    /admin/mac/policy                            │
│  • PATCH  /admin/mac/policy                            │
│  • GET    /admin/mac/access-log                        │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│               Backend /api/admin/mac/*                  │
├─────────────────────────────────────────────────────────┤
│ Handles database operations:                            │
│  • Store MAC addresses                                  │
│  • Verify MAC ownership                                │
│  • Update policies                                      │
│  • Log access attempts                                  │
└─────────────────────────────────────────────────────────┘
```

---

This visual guide helps understand how all the pieces fit together in the MAC-based access control system!
