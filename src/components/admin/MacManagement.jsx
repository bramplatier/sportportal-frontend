import React, { useState } from 'react';
import useMacVerification from '../../hooks/useMacVerification';
import './MacManagement.css';

/**
 * MAC Address Management Component
 * Allows admins to:
 * - Register new MAC addresses
 * - View trusted devices
 * - Revoke devices
 * - View access logs
 * - Configure MAC policies
 */
const MacManagement = () => {
  const {
    macStatus,
    trustedMacs,
    accessLog,
    policy,
    loading,
    error,
    registerMac,
    revokeMac,
    updatePolicy,
    validateMacFormat,
    loadAccessLog,
  } = useMacVerification();

  const [macForm, setMacForm] = useState({
    address: '',
    deviceName: '',
  });

  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');
  const [policySuccess, setPolicySuccess] = useState('');
  const [logOffset, setLogOffset] = useState(0);
  const [expandedMacId, setExpandedMacId] = useState(null);

  const handleMacInputChange = (e) => {
    const { name, value } = e.target;
    setMacForm(prev => ({
      ...prev,
      [name]: value,
    }));
    setRegistrationError('');
  };

  const handleRegisterMac = async () => {
    setRegistrationError('');
    setRegistrationSuccess('');

    if (!macForm.address.trim()) {
      setRegistrationError('MAC-adres is vereist');
      return;
    }

    if (!validateMacFormat(macForm.address)) {
      setRegistrationError('Ongeldig MAC-adresindeling. Gebruik AA:BB:CC:DD:EE:FF of AA-BB-CC-DD-EE-FF');
      return;
    }

    try {
      await registerMac(macForm.address, macForm.deviceName);
      setRegistrationSuccess('MAC-adres succesvol geregistreerd! 🎉');
      setMacForm({ address: '', deviceName: '' });
      setTimeout(() => setRegistrationSuccess(''), 4000);
    } catch (err) {
      setRegistrationError(err.message || 'Kan MAC-adres niet registreren');
    }
  };

  const handleRevokeMac = async (macId) => {
    if (!window.confirm('Bent u zeker dat u dit apparaat wilt intrekken?')) {
      return;
    }

    try {
      await revokeMac(macId);
    } catch (err) {
      alert(`Fout bij intrekken: ${err.message}`);
    }
  };

  const handlePolicyUpdate = async (policyKey, value) => {
    setPolicySuccess('');
    try {
      const updates = { [policyKey]: value };
      await updatePolicy(updates);
      setPolicySuccess('Beleid bijgewerkt! ✓');
      setTimeout(() => setPolicySuccess(''), 3000);
    } catch (err) {
      alert(`Fout bij beleidupdate: ${err.message}`);
    }
  };

  const handleLoadMoreLogs = async () => {
    const newOffset = logOffset + 50;
    try {
      await loadAccessLog(50, newOffset);
      setLogOffset(newOffset);
    } catch (err) {
      alert(`Fout bij laden logs: ${err.message}`);
    }
  };

  const isVerified = macStatus?.currentMacAddress && macStatus?.isVerified;

  return (
    <div className="mac-management">
      <h2>🔒 MAC-adres apparaatbeheer</h2>
      
      {/* Status Banner */}
      {macStatus?.macVerificationRequired && !isVerified && (
        <div className="warning-banner">
          <strong>⚠️ MAC-verificatie vereist</strong>
          <p>Registreer uw apparaat MAC-adres om gevoelige bewerkingen uit te voeren.</p>
        </div>
      )}

      {isVerified && (
        <div className="success-banner">
          <strong>✓ Apparaat geverifieerd</strong>
          <p>Uw apparaat MAC-adres is geregistreerd: <code>{macStatus?.currentMacAddress}</code></p>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Registration Section */}
      <section className="mac-registration">
        <h3>Nieuw apparaat registreren</h3>
        
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="mac-address">MAC-adres *</label>
            <input
              id="mac-address"
              type="text"
              name="address"
              value={macForm.address}
              onChange={handleMacInputChange}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="mac-input"
            />
            <small className="help-text">
              📍 Zoek uw MAC-adres:<br/>
              Windows: <code>ipconfig /all</code> | 
              Mac: <code>ifconfig</code> | 
              Linux: <code>ip addr show</code>
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="device-name">Apparaatnaam (optioneel)</label>
            <input
              id="device-name"
              type="text"
              name="deviceName"
              value={macForm.deviceName}
              onChange={handleMacInputChange}
              placeholder="bijv. Kantoor Laptop"
              className="device-input"
            />
          </div>

          <button
            onClick={handleRegisterMac}
            disabled={loading || !validateMacFormat(macForm.address)}
            className="btn-register"
          >
            {loading ? 'Registreren...' : 'MAC-adres registreren'}
          </button>
        </div>

        {registrationError && <div className="error-message">{registrationError}</div>}
        {registrationSuccess && <div className="success-message">{registrationSuccess}</div>}
      </section>

      {/* Trusted MACs Section */}
      <section className="trusted-macs">
        <h3>Geregistreerde apparaten ({trustedMacs.length})</h3>
        
        {trustedMacs.length === 0 ? (
          <div className="empty-state">
            <p>Geen apparaten geregistreerd</p>
            <small>Registreer uw eerste apparaat hierboven</small>
          </div>
        ) : (
          <div className="macs-list">
            {trustedMacs.map(mac => (
              <div key={mac.id} className="mac-card">
                <div 
                  className="mac-card-header"
                  onClick={() => setExpandedMacId(expandedMacId === mac.id ? null : mac.id)}
                >
                  <div className="mac-info-main">
                    <strong className="device-name">
                      {mac.device_name || mac.deviceName || 'Naamloos apparaat'}
                    </strong>
                    <code className="mac-address">{mac.mac_address || mac.macAddress}</code>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevokeMac(mac.id || mac.macId);
                    }}
                    className="btn-revoke"
                    title="Dit apparaat intrekken"
                  >
                    ✕ Intrekken
                  </button>
                </div>

                {expandedMacId === mac.id && (
                  <div className="mac-card-details">
                    <div className="detail-row">
                      <span className="detail-label">Geregistreerd:</span>
                      <span className="detail-value">
                        {new Date(mac.created_at || mac.createdAt).toLocaleString('nl-NL')}
                      </span>
                    </div>
                    {mac.last_used_at && (
                      <div className="detail-row">
                        <span className="detail-label">Laatst gebruikt:</span>
                        <span className="detail-value">
                          {new Date(mac.last_used_at).toLocaleString('nl-NL')}
                        </span>
                      </div>
                    )}
                    {mac.verified && (
                      <div className="detail-row">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value verified">✓ Geverifieerd</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Policy Section */}
      <section className="mac-policy">
        <h3>MAC-verificatiebeleid</h3>
        
        {policy ? (
          <div className="policy-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={policy.macVerificationRequired || policy.require_mac_verification || false}
                onChange={(e) => handlePolicyUpdate('macVerificationRequired', e.target.checked)}
                disabled={loading}
              />
              <span>MAC-verificatie verplicht voor alle bewerkingen</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={policy.allowNewMacs || policy.allow_new_macs || false}
                onChange={(e) => handlePolicyUpdate('allowNewMacs', e.target.checked)}
                disabled={loading}
              />
              <span>Nieuwe MAC-adressen registreren toestaan</span>
            </label>

            <div className="policy-number">
              <label>Max. vertrouwde apparaten</label>
              <input
                type="number"
                min="1"
                max="20"
                value={policy.maxTrustedMacs || policy.max_trusted_macs || 5}
                onChange={(e) => handlePolicyUpdate('maxTrustedMacs', parseInt(e.target.value))}
                disabled={loading}
              />
              <small>Huidige: {trustedMacs.length}</small>
            </div>

            {policySuccess && <div className="success-message">{policySuccess}</div>}
          </div>
        ) : (
          <p>Beleid laden...</p>
        )}
      </section>

      {/* Access Log Section */}
      <section className="access-log">
        <h3>Toegangslogboek</h3>
        
        {accessLog.length === 0 ? (
          <div className="empty-state">
            <p>Geen toegangslogboekingangen</p>
          </div>
        ) : (
          <>
            <div className="log-table-wrapper">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Tijd</th>
                    <th>MAC-adres</th>
                    <th>Status</th>
                    <th>IP-adres</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLog.map(log => (
                    <tr key={log.id}>
                      <td className="time-cell">
                        {new Date(log.created_at || log.timestamp).toLocaleString('nl-NL')}
                      </td>
                      <td className="mac-cell">
                        <code>{log.mac_address || log.macAddress}</code>
                      </td>
                      <td className="status-cell">
                        <span className={`badge ${(log.is_trusted || log.isTrusted) ? 'trusted' : 'untrusted'}`}>
                          {(log.is_trusted || log.isTrusted) ? '✓ Vertrouwd' : '✗ Onvertrouwd'}
                        </span>
                      </td>
                      <td className="ip-cell">
                        <code>{log.ip_address || log.ipAddress}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {accessLog.length >= 50 && (
              <button
                onClick={handleLoadMoreLogs}
                disabled={loading}
                className="btn-load-more"
              >
                {loading ? 'Laden...' : 'Meer logboeken laden'}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default MacManagement;
