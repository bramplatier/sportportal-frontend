/**
 * Client-side MAC Address Verification Manager
 * Manages MAC address registration, verification, and policy for admin users
 */

class MacAddressManager {
  constructor(apiBaseUrl = '/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.macAddress = null;
    this.deviceName = null;
  }

  /**
   * Try to get MAC address from localStorage
   */
  async getMacAddressFromSystem() {
    try {
      const storedMac = localStorage.getItem('admin_mac_address');
      if (storedMac) {
        this.macAddress = storedMac;
        return storedMac;
      }
      return null;
    } catch (error) {
      console.error('Error getting MAC address:', error);
      return null;
    }
  }

  /**
   * Validate MAC address format
   */
  _validateMacFormat(mac) {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  /**
   * Normalize MAC address to standard format (uppercase with colons)
   */
  _normalizeMac(mac) {
    return mac.toUpperCase().replace(/-/g, ':');
  }

  /**
   * Prompt user to enter their MAC address
   */
  async requestMacAddressFromUser() {
    return new Promise((resolve) => {
      const mac = prompt(
        'Voer uw MAC-adres in (format: AA:BB:CC:DD:EE:FF of AA-BB-CC-DD-EE-FF):',
        this.macAddress || ''
      );

      if (mac) {
        if (this._validateMacFormat(mac)) {
          this.macAddress = this._normalizeMac(mac);
          resolve(this.macAddress);
        } else {
          alert('Ongeldig MAC-adresindeling. Gebruik alstublieft AA:BB:CC:DD:EE:FF of AA-BB-CC-DD-EE-FF');
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Register a new trusted MAC address
   */
  async registerMacAddress(macAddress, deviceName = null) {
    try {
      const mac = macAddress || this.macAddress;
      if (!mac) {
        throw new Error('Geen MAC-adres opgegeven');
      }

      const response = await fetch(`${this.apiBaseUrl}/admin/mac/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          macAddress: mac,
          deviceName: deviceName || this.deviceName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kan MAC-adres niet registreren');
      }

      const result = await response.json();
      if (result.success) {
        this.macAddress = mac;
        if (deviceName) {
          this.deviceName = deviceName;
        }
        localStorage.setItem('admin_mac_address', mac);
      }
      return result;
    } catch (error) {
      console.error('Error registering MAC address:', error);
      throw error;
    }
  }

  /**
   * Get list of trusted MAC addresses
   */
  async getTrustedMacAddresses() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/mac/trusted`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Kan vertrouwde MAC-adressen niet ophalen');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error getting trusted MAC addresses:', error);
      throw error;
    }
  }

  /**
   * Revoke a MAC address
   */
  async revokeMacAddress(macId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/mac/${macId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Kan MAC-adres niet intrekken');
      }

      return await response.json();
    } catch (error) {
      console.error('Error revoking MAC address:', error);
      throw error;
    }
  }

  /**
   * Get MAC access log
   */
  async getMacAccessLog(limit = 50, offset = 0) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/admin/mac/access-log?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Kan MAC-toegangslogboek niet ophalen');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting MAC access log:', error);
      throw error;
    }
  }

  /**
   * Get MAC policy
   */
  async getMacPolicy() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/mac/policy`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Kan MAC-beleid niet ophalen');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting MAC policy:', error);
      throw error;
    }
  }

  /**
   * Update MAC policy
   */
  async updateMacPolicy(policyUpdates) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/mac/policy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(policyUpdates),
      });

      if (!response.ok) {
        throw new Error('Kan MAC-beleid niet bijwerken');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating MAC policy:', error);
      throw error;
    }
  }

  /**
   * Get current MAC verification status
   */
  async getVerifyStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/mac/verify-status`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Kan MAC-verificatiestatus niet ophalen');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting MAC verification status:', error);
      throw error;
    }
  }

  /**
   * Clear stored MAC address from localStorage
   */
  clearStoredMac() {
    localStorage.removeItem('admin_mac_address');
    this.macAddress = null;
  }
}

export default MacAddressManager;
