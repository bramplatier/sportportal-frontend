/**
 * Utility functions for handling MAC-related errors
 * Provides standardized error handling for MAC verification failures
 */

export const MacErrorCode = {
  MAC_REQUIRED: 'MAC_REQUIRED',
  MAC_UNTRUSTED: 'MAC_UNTRUSTED',
  MAC_INVALID: 'MAC_INVALID',
  MAC_ERROR: 'MAC_ERROR',
};

/**
 * Check if an API error is MAC-related
 */
export const isMacError = (error) => {
  if (!error || !error.details) return false;
  const code = error.details?.code || error.details?.error?.code;
  return Object.values(MacErrorCode).includes(code);
};

/**
 * Get MAC error details
 */
export const getMacErrorDetails = (error) => {
  if (!error) return null;

  const details = error.details || {};
  const code = details.code || details.error?.code || 'MAC_ERROR';
  const message = details.error || details.message || 'MAC-verificatie mislukt';

  return {
    code,
    message,
    details,
  };
};

/**
 * Get user-friendly MAC error message
 */
export const getMacErrorMessage = (code) => {
  const messages = {
    [MacErrorCode.MAC_REQUIRED]: {
      title: '🔐 MAC-verificatie vereist',
      message: 'Voer uw MAC-adres in en registreer uw apparaat om door te gaan.',
      action: 'MAC beheren',
    },
    [MacErrorCode.MAC_UNTRUSTED]: {
      title: '⚠️ Apparaat niet geautoriseerd',
      message: 'Uw MAC-adres is niet geregistreerd. Registreer het eerst in MAC-beheer.',
      action: 'MAC beheren',
    },
    [MacErrorCode.MAC_INVALID]: {
      title: '❌ Ongeldig MAC-adres',
      message: 'Het MAC-adres is ongeldig of verloopt is. Voer een nieuw MAC-adres in.',
      action: 'MAC opnieuw registreren',
    },
    [MacErrorCode.MAC_ERROR]: {
      title: '❌ MAC-verificatie fout',
      message: 'Er is een fout opgetreden bij de MAC-verificatie. Probeer het later opnieuw.',
      action: 'Opnieuw proberen',
    },
  };

  return messages[code] || messages[MacErrorCode.MAC_ERROR];
};

/**
 * Handle MAC verification error and show appropriate modal/toast
 * This is a helper that returns action information
 */
export const handleMacError = (error, onNavigateToMac = null) => {
  const errorDetails = getMacErrorDetails(error);
  const errorMessage = getMacErrorMessage(errorDetails.code);

  return {
    ...errorMessage,
    code: errorDetails.code,
    shouldNavigate: [
      MacErrorCode.MAC_REQUIRED,
      MacErrorCode.MAC_UNTRUSTED,
    ].includes(errorDetails.code),
    onNavigate: onNavigateToMac,
  };
};

/**
 * Wrapper for admin API calls that handles MAC verification errors
 * Returns a function that wraps the actual API call
 */
export const withMacErrorHandling = (apiCall, onMacError = null) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      if (error.status === 403 && isMacError(error)) {
        const errorInfo = handleMacError(error, onMacError);
        
        if (onMacError) {
          onMacError(errorInfo);
        }
        
        throw {
          ...error,
          isMacError: true,
          macErrorInfo: errorInfo,
        };
      }
      throw error;
    }
  };
};

export default {
  MacErrorCode,
  isMacError,
  getMacErrorDetails,
  getMacErrorMessage,
  handleMacError,
  withMacErrorHandling,
};
