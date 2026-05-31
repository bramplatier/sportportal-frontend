import { useState, useEffect, useCallback } from 'react';
import { macApi } from '../services/apiClient';

/**
 * Hook for managing MAC address verification
 * Provides methods to check status, register MACs, manage trusted devices, etc.
 */
export const useMacVerification = () => {
  const [macStatus, setMacStatus] = useState(null);
  const [trustedMacs, setTrustedMacs] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Check MAC verification status
   */
  const checkMacStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.getVerifyStatus();
      if (result.success || result.data) {
        setMacStatus(result.data || result);
        return result.data || result;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error checking MAC status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load trusted MAC addresses
   */
  const loadTrustedMacs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.getTrustedMacAddresses();
      const macs = result.data || result || [];
      setTrustedMacs(Array.isArray(macs) ? macs : []);
      return macs;
    } catch (err) {
      setError(err.message);
      console.error('Error loading trusted MACs:', err);
      setTrustedMacs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load MAC access log
   */
  const loadAccessLog = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.getMacAccessLog({ limit, offset });
      const logs = result.data || result || [];
      setAccessLog(Array.isArray(logs) ? logs : []);
      return logs;
    } catch (err) {
      setError(err.message);
      console.error('Error loading access log:', err);
      setAccessLog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load MAC policy
   */
  const loadPolicy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.getMacPolicy();
      const policyData = result.data || result || {};
      setPolicy(policyData);
      return policyData;
    } catch (err) {
      setError(err.message);
      console.error('Error loading policy:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register a new MAC address
   */
  const registerMac = useCallback(async (macAddress, deviceName) => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.registerMacAddress({ 
        macAddress, 
        deviceName: deviceName || `Device ${new Date().toLocaleDateString('nl-NL')}`
      });
      
      if (result.success) {
        await loadTrustedMacs();
      }
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error registering MAC:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadTrustedMacs]);

  /**
   * Revoke a MAC address
   */
  const revokeMac = useCallback(async (macId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.revokeMacAddress({ macId });
      if (result.success) {
        await loadTrustedMacs();
      }
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error revoking MAC:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadTrustedMacs]);

  /**
   * Update MAC policy
   */
  const updatePolicy = useCallback(async (policyUpdates) => {
    setLoading(true);
    setError(null);
    try {
      const result = await macApi.updateMacPolicy({ payload: policyUpdates });
      if (result.success) {
        await loadPolicy();
      }
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error updating policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPolicy]);

  /**
   * Validate MAC address format
   */
  const validateMacFormat = useCallback((mac) => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }, []);

  /**
   * Register the current device (auto-detects MAC/Cookie on backend)
   */
  const registerCurrentDevice = useCallback(async (deviceName) => {
    setLoading(true);
    setError(null);
    try {
      // We send a special placeholder or just the device name.
      // The backend will use the detected MAC from headers or set a new one if allowed.
      const result = await macApi.registerMacAddress({ 
        macAddress: 'auto', // Backend logic should handle 'auto' or we can leave it to the user's IP
        deviceName: deviceName || `Mijn Apparaat (${new Date().toLocaleDateString('nl-NL')})`
      });
      
      if (result.success) {
        await Promise.all([
          checkMacStatus(),
          loadTrustedMacs()
        ]);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkMacStatus, loadTrustedMacs]);

  // Load data on mount
  useEffect(() => {
    checkMacStatus();
    loadTrustedMacs();
    loadPolicy();
    loadAccessLog();
  }, [checkMacStatus, loadTrustedMacs, loadPolicy, loadAccessLog]);

  return {
    // State
    macStatus,
    trustedMacs,
    accessLog,
    policy,
    loading,
    error,

    // Methods
    checkMacStatus,
    loadTrustedMacs,
    loadAccessLog,
    loadPolicy,
    registerMac,
    registerCurrentDevice,
    revokeMac,
    updatePolicy,
    validateMacFormat,
  };
};

export default useMacVerification;
