import React, { useState, useEffect } from 'react';
import './Audit.css';
import { IconHash, IconClock, IconShield, IconDocument, IconDownload } from '../components/Icons';

const generateHash = () => {
  return '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

const generateTimestamp = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

function AuditEntry({ type, title, status, hash, timestamp, details, onVerify, onDownloadProof }) {
  return (
    <div className={`audit-entry ${status.toLowerCase()}`}>
      <div className="entry-header">
        <div className="entry-title">
          <span className="entry-type">{type}</span>
          <span className="entry-status">{status}</span>
        </div>
        <div className="entry-actions">
          {status === 'PENDING' && (
            <button className="verify-btn" onClick={onVerify}>
              Verify
            </button>
          )}
          <button className="proof-btn" onClick={onDownloadProof}>
            <IconDownload />
            <span>Proof</span>
          </button>
        </div>
      </div>
      
      <div className="entry-content">
        <div className="entry-description">{title}</div>
        <div className="entry-details">
          <div className="timestamp">
            <i className="icon-time"></i>
            {timestamp}
          </div>
          <div className="hash">
            <i className="icon-hash"></i>
            {hash}
          </div>
          {details && (
            <div className="additional-info">{details}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Audit() {
  const [metrics, setMetrics] = useState({
    total: 4,
    verified: 3,
    pending: 1,
    integrity: 100
  });

  const [auditTrail, setAuditTrail] = useState([
    {
      id: 1,
      type: 'Defense Activated',
      title: 'Blocked MEV frontrunning attack on transaction',
      status: 'VERIFIED',
      hash: generateHash(),
      timestamp: generateTimestamp(),
      details: 'Attack vector: flash loan manipulation'
    },
    {
      id: 2,
      type: 'Contract Analysis',
      title: 'Smart contract vulnerability scan completed - Score: 95/100',
      status: 'VERIFIED',
      hash: generateHash(),
      timestamp: generateTimestamp(),
      details: 'No critical vulnerabilities found'
    },
    {
      id: 3,
      type: 'Insurance Claim',
      title: 'Claim approved for MEV attack - Payout: 8.5 ETH',
      status: 'VERIFIED',
      hash: generateHash(),
      timestamp: generateTimestamp(),
      details: 'Compensation processed'
    },
    {
      id: 4,
      type: 'Mempool Detection',
      title: 'Suspicious transaction flagged in mempool - Risk score: 92',
      status: 'PENDING',
      hash: generateHash(),
      timestamp: generateTimestamp(),
      details: 'Awaiting verification'
    }
  ]);

  const handleVerify = (id) => {
    setAuditTrail(trail => 
      trail.map(entry => 
        entry.id === id 
          ? {...entry, status: 'VERIFIED'} 
          : entry
      )
    );
    setMetrics(m => ({
      ...m,
      verified: m.verified + 1,
      pending: m.pending - 1
    }));
  };

  const handleDownloadProof = (entry) => {
    // In a real app, this would generate and download a cryptographic proof
    const proofData = {
      type: entry.type,
      timestamp: entry.timestamp,
      hash: entry.hash,
      title: entry.title,
      status: entry.status,
      signature: generateHash() // This would be a real digital signature
    };

    const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proof-${entry.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullReport = () => {
    const report = {
      metrics,
      auditTrail,
      generatedAt: new Date().toISOString(),
      signature: generateHash() // This would be a real digital signature
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audit-page">
      <div className="audit-hero">
        <h1>
          <i className="icon-audit"></i>
          Audit & Proof
        </h1>
        <p className="sub">Immutable audit trail with cryptographic proof of all defense actions</p>
      </div>

      <div className="metrics-grid">
        <div className="metric total">
          <div className="metric-icon">
            <IconDocument />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Actions</div>
            <div className="metric-value">{metrics.total}</div>
          </div>
        </div>

        <div className="metric verified">
          <div className="metric-icon">
            <IconShield />
          </div>
          <div className="metric-content">
            <div className="metric-label">Verified</div>
            <div className="metric-value">{metrics.verified}</div>
          </div>
        </div>

        <div className="metric pending">
          <div className="metric-icon">
            <IconClock />
          </div>
          <div className="metric-content">
            <div className="metric-label">Pending</div>
            <div className="metric-value">{metrics.pending}</div>
          </div>
        </div>

        <div className="metric integrity">
          <div className="metric-icon">
            <IconHash />
          </div>
          <div className="metric-content">
            <div className="metric-label">Integrity</div>
            <div className="metric-value">{metrics.integrity}%</div>
          </div>
        </div>
      </div>

      <div className="audit-actions">
        <button className="download-btn" onClick={handleDownloadFullReport}>
          <i className="icon-download"></i>
          Download Full Report
        </button>
        <button className="verify-all-btn">
          <i className="icon-verify"></i>
          Verify All
        </button>
      </div>

      <div className="audit-container">
        <h2>Audit Trail</h2>
        <div className="audit-list">
          {auditTrail.map(entry => (
            <AuditEntry
              key={entry.id}
              {...entry}
              onVerify={() => handleVerify(entry.id)}
              onDownloadProof={() => handleDownloadProof(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}