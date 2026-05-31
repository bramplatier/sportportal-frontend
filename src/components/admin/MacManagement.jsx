import React, { useState } from 'react';
import useMacVerification from '../../hooks/useMacVerification';
import './MacManagement.css';

/**
 * MAC Address Management Component
 * Redesigned for SportPortal Cockpit
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
    registerCurrentDevice,
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
  const [isRegisteringCurrent, setIsRegisteringCurrent] = useState(false);
  const [policySuccess, setPolicySuccess] = useState('');
  const [logOffset, setLogOffset] = useState(0);
  const [expandedMacId, setExpandedMacId] = useState(null);

  const handleRegisterCurrent = async () => {
    setIsRegisteringCurrent(true);
    setRegistrationError('');
    setRegistrationSuccess('');
    try {
      await registerCurrentDevice(`Mijn Computer (${new Date().toLocaleDateString('nl-NL')})`);
      setRegistrationSuccess('Dit apparaat is nu geregistreerd! ✓');
      setTimeout(() => setRegistrationSuccess(''), 5000);
    } catch (err) {
      setRegistrationError(err.message || 'Registratie mislukt');
    } finally {
      setIsRegisteringCurrent(false);
    }
  };

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
      setRegistrationError('Ongeldig MAC-adres. Gebruik AA:BB:CC:DD:EE:FF');
      return;
    }

    try {
      await registerMac(macForm.address, macForm.deviceName);
      setRegistrationSuccess('MAC-adres geregistreerd! ✓');
      setMacForm({ address: '', deviceName: '' });
      setTimeout(() => setRegistrationSuccess(''), 4000);
    } catch (err) {
      setRegistrationError(err.message || 'Registratie mislukt');
    }
  };

  const handleRevokeMac = async (macId) => {
    if (!window.confirm('Apparaat intrekken?')) return;
    try {
      await revokeMac(macId);
    } catch (err) {
      alert(`Fout: ${err.message}`);
    }
  };

  const handlePolicyUpdate = async (policyKey, value) => {
    setPolicySuccess('');
    try {
      await updatePolicy({ [policyKey]: value });
      setPolicySuccess('Bijgewerkt! ✓');
      setTimeout(() => setPolicySuccess(''), 3000);
    } catch (err) {
      alert(`Fout: ${err.message}`);
    }
  };

  const handleLoadMoreLogs = async () => {
    const newOffset = logOffset + 50;
    try {
      await loadAccessLog(50, newOffset);
      setLogOffset(newOffset);
    } catch (err) {
      alert(`Fout: ${err.message}`);
    }
  };

  const isVerified = macStatus?.currentMacAddress && macStatus?.isVerified;

  return (
    <div className="mac-management-container">
      {/* Status Section */}
      <div className="mac-status-grid">
        <div className={`status-card ${isVerified ? 'verified' : 'unverified'}`}>
          <div className="status-header">
            <h3>Huidige Status</h3>
            <span className={`status-pill ${isVerified ? 'active' : 'inactive'}`}>
              {isVerified ? 'GEVERIFIEERD' : 'NIET GEVERIFIEERD'}
            </span>
          </div>
          {isVerified ? (
            <p>Uw apparaat <code>{macStatus.currentMacAddress}</code> is herkend en vertrouwd.</p>
          ) : (
            <>
              <p>Dit apparaat is nog niet geregistreerd voor beheer-toegang.</p>
              <button 
                className="btn btn-primary" 
                style={{marginTop: '1rem'}} 
                onClick={handleRegisterCurrent}
                disabled={isRegisteringCurrent || loading}
              >
                {isRegisteringCurrent ? 'Bezig met registreren...' : 'Dit apparaat registreren'}
              </button>
            </>
          )}
          {error && <div className="error-pill">{error}</div>}
        </div>

        {policy && (
          <div className="status-card policy">
            <h3>Beleid</h3>
            <div className="policy-toggles">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={policy.macVerificationRequired || policy.require_mac_verification || false}
                  onChange={(e) => handlePolicyUpdate('macVerificationRequired', e.target.checked)}
                />
                <span>Verplichte Verificatie</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={policy.allowNewMacs || policy.allow_new_macs || false}
                  onChange={(e) => handlePolicyUpdate('allowNewMacs', e.target.checked)}
                />
                <span>Zelfregistratie toestaan</span>
              </label>
            </div>
            {policySuccess && <div className="success-pill-mini">{policySuccess}</div>}
          </div>
        )}
      </div>

      <div className="mac-main-grid">
        {/* Registration */}
        <section className="admin-card mac-form-section">
          <h3>Apparaat Toevoegen</h3>
          <div className="mac-form">
            <div className="form-field">
              <label>MAC-Adres</label>
              <input
                type="text"
                name="address"
                value={macForm.address}
                onChange={handleMacInputChange}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
            </div>
            <div className="form-field">
              <label>Naam (optioneel)</label>
              <input
                type="text"
                name="deviceName"
                value={macForm.deviceName}
                onChange={handleMacInputChange}
                placeholder="bijv. Laptop"
              />
            </div>
            <button
              onClick={handleRegisterMac}
              disabled={loading || !macForm.address}
              className="btn btn-primary btn-full"
            >
              {loading ? 'Bezig...' : 'Registreren'}
            </button>
          </div>
          {registrationError && <div className="error-pill" style={{marginTop:'1rem'}}>{registrationError}</div>}
          {registrationSuccess && <div className="success-pill" style={{marginTop:'1rem'}}>{registrationSuccess}</div>}
        </section>

        {/* Devices List */}
        <section className="admin-card mac-list-section">
          <h3>Vertrouwde Apparaten ({trustedMacs.length})</h3>
          <div className="mac-cards">
            {trustedMacs.length === 0 ? (
              <p className="empty-text">Geen apparaten geregistreerd.</p>
            ) : (
              trustedMacs.map(mac => (
                <div key={mac.id} className={`device-card ${expandedMacId === mac.id ? 'expanded' : ''}`} onClick={() => setExpandedMacId(expandedMacId === mac.id ? null : mac.id)}>
                  <div className="device-header">
                    <div>
                      <strong>{mac.device_name || 'Naamloos'}</strong>
                      <code>{mac.mac_address || mac.macAddress}</code>
                    </div>
                    <button
                      className="btn-icon-danger"
                      onClick={(e) => { e.stopPropagation(); handleRevokeMac(mac.id || mac.macId); }}
                      title="Intrekken"
                    >
                      ✕
                    </button>
                  </div>
                  {expandedMacId === mac.id && (
                    <div className="device-details">
                      <div><span>Geregistreerd:</span> {new Date(mac.created_at || mac.createdAt).toLocaleDateString()}</div>
                      {mac.last_used_at && <div><span>Laatst gebruikt:</span> {new Date(mac.last_used_at).toLocaleDateString()}</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Access Log */}
      <section className="admin-card mac-log-section">
        <h3>Toegangslogboek</h3>
        <div className="table-shell">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Tijd</th>
                <th>Apparaat / MAC</th>
                <th>Status</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {accessLog.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at || log.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                  <td><code>{log.mac_address || log.macAddress}</code></td>
                  <td>
                    <span className={`status-pill-mini ${(log.is_trusted || log.isTrusted) ? 'trusted' : 'untrusted'}`}>
                      {(log.is_trusted || log.isTrusted) ? 'VERTROUWD' : 'ONBEKEND'}
                    </span>
                  </td>
                  <td><code>{log.ip_address}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {accessLog.length >= 50 && (
            <button onClick={handleLoadMoreLogs} className="btn btn-outline btn-full" style={{marginTop:'1rem'}}>Laden meer...</button>
          )}
        </div>
      </section>
    </div>
  );
};

export default MacManagement;
