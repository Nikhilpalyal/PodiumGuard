import { useState, useEffect } from 'react';
import './InsurancePool.css';

function Progress({ value = 0, label }) {
  return (
    <div className="progress-row">
      <div className="pr-label">{label}</div>
      <div className="pr-track"><div className="pr-fill" style={{ width: `${value}%` }} /></div>
      <div className="pr-value">{value}%</div>
    </div>
  );
}

export default function InsurancePool() {
  const [joined, setJoined] = useState(false);
  const [poolHealth, setPoolHealth] = useState(94);
  const [aiRisk, setAiRisk] = useState(28);
  // UI scale for accessibility (1 = normal). User can increase to make text/UI larger.
  const [scale, setScale] = useState(1);

  // New state for insurance features
  const [premiumMembers, setPremiumMembers] = useState(128);
  const [poolBalance, setPoolBalance] = useState(42.5);
  const [claimStatus, setClaimStatus] = useState(null); // null, 'verifying', 'approved', 'rejected'
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // New state for certificate verification
  const [certificateInput, setCertificateInput] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null); // null, 'pending', 'authenticating', 'approved', 'rejected'
  const [certificateId, setCertificateId] = useState('');
  const [compensationAmount, setCompensationAmount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // New state for premium selection
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [isJoining, setIsJoining] = useState(false);

  // New state for payment page
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // New state for payment methods
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('crypto');
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    upiId: '',
    gpayPhone: ''
  });
  const [paymentStep, setPaymentStep] = useState('method'); // 'method', 'details', 'processing', 'success'

  const mockLeaderboard = [
    { id: 1, name: 'safe1...a3c', score: 99, rewards: '$2,020' },
    { id: 2, name: 'safe2...b6d', score: 98, rewards: '$24,502' },
    { id: 3, name: 'safe3...c9e', score: 96, rewards: '$19,080' },
    { id: 4, name: 'safe4...d1f', score: 94, rewards: '$15,200' },
  ];

  // Fetch data from backend on component mount and set up real-time updates
  useEffect(() => {
    const fetchInsuranceData = async () => {
      try {
        // Try new pool-data endpoint first
        const response = await fetch('http://localhost:5001/api/insurance/pool-data');
        if (response.ok) {
          const data = await response.json();
          setPremiumMembers(data.data.activeMembers);
          setPoolBalance(data.data.poolBalance);
        } else {
          // Fallback to old stats endpoint
          const fallbackResponse = await fetch('http://localhost:5001/api/insurance/stats');
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setPremiumMembers(data.data.premiumMembers);
            setPoolBalance(data.data.poolBalance);
          } else {
            console.warn('Backend not available, using default values');
          }
        }
      } catch (error) {
        console.error('Failed to fetch insurance data:', error);
        console.warn('Running in offline mode with default values');
      }
    };

    fetchInsuranceData();

    // Auto-refresh pool data every 30 seconds
    const intervalId = setInterval(fetchInsuranceData, 30000);

    // Set up WebSocket connection for real-time updates
    let socket;
    try {
      socket = new WebSocket('ws://localhost:5000');

      socket.onopen = () => {
        console.log('Connected to insurance updates');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'insurance-update') {
            setPremiumMembers(data.activeMembers || data.premiumMembers);
            setPoolBalance(data.poolBalance);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('Disconnected from insurance updates');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.warn('WebSocket connection failed, real-time updates disabled');
    }

    return () => {
      clearInterval(intervalId);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Function to refresh insurance data (exposed for manual refresh)
  const fetchInsuranceData = async () => {
    try {
      // Try new pool-data endpoint first
      const response = await fetch('http://localhost:5001/api/insurance/pool-data');
      if (response.ok) {
        const data = await response.json();
        setPremiumMembers(data.data.activeMembers);
        setPoolBalance(data.data.poolBalance);
      } else {
        // Fallback to old stats endpoint
        const fallbackResponse = await fetch('http://localhost:5001/api/insurance/stats');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setPremiumMembers(data.data.premiumMembers);
          setPoolBalance(data.data.poolBalance);
        }
      }
    } catch (error) {
      console.error('Failed to fetch insurance data:', error);
    }
  };

  const handleJoinClick = () => {
    if (!joined) {
      setShowPremiumModal(true);
    } else {
      // Leave pool logic (optional)
      setJoined(false);
      console.log('User left the insurance pool');
    }
  };

  const confirmJoinPool = async () => {
    setIsJoining(true);

    try {
      // Generate a unique Ethereum address for the user
      const userAddress = '0x' + Math.random().toString(16).substr(2, 40);

      // Premium amounts based on selected tier
      const premiumAmounts = {
        'basic': 0.05 + Math.random() * 0.05, // 0.05-0.1 ETH
        'standard': 0.1 + Math.random() * 0.05, // 0.1-0.15 ETH
        'premium': 0.2 + Math.random() * 0.05 // 0.2-0.25 ETH
      };

      const premiumAmount = parseFloat(premiumAmounts[selectedTier].toFixed(4));

      // Set payment details for the payment page
      setPaymentDetails({
        tier: selectedTier,
        premiumAmount: premiumAmount,
        userAddress: userAddress,
        poolContribution: premiumAmount * 0.5,
        benefits: selectedTier === 'basic' ? ['1.0x Compensation Multiplier', 'Basic Claim Priority', 'Standard Pool Access'] :
                 selectedTier === 'standard' ? ['1.5x Compensation Multiplier', 'Priority Claim Processing', 'Enhanced Pool Benefits'] :
                 ['2.0x Compensation Multiplier', 'Highest Claim Priority', 'VIP Pool Access & Analytics']
      });

      setShowPremiumModal(false);
      setShowPaymentPage(true);

    } catch (error) {
      console.error('Error preparing payment:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const selectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setPaymentStep('details');
  };

  const handlePaymentFormChange = (field, value) => {
    setPaymentFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePaymentForm = () => {
    switch (selectedPaymentMethod) {
      case 'card':
        return paymentFormData.cardNumber.length >= 16 &&
               paymentFormData.expiryDate.length === 5 &&
               paymentFormData.cvv.length >= 3 &&
               paymentFormData.cardholderName.length > 0;
      case 'upi':
        return paymentFormData.upiId.includes('@') && paymentFormData.upiId.length > 3;
      case 'gpay':
        return paymentFormData.gpayPhone.length >= 10;
      case 'crypto':
        return true; // Crypto wallet is handled separately
      default:
        return false;
    }
  };

  const processPayment = async () => {
    if (!validatePaymentForm()) {
      alert('Please fill in all required payment details correctly.');
      return;
    }

    setPaymentStep('processing');
    setIsProcessingPayment(true);

    try {
      console.log(`Processing ${selectedPaymentMethod} payment for tier: ${paymentDetails.tier}, amount: ${paymentDetails.premiumAmount} ETH`);

      // AI Fraud Detection First
      const aiFraudCheck = await checkPaymentFraud({
        ...paymentDetails,
        paymentMethod: selectedPaymentMethod,
        formData: paymentFormData
      });

      if (aiFraudCheck.isFraudulent) {
        alert(`Payment blocked by AI fraud detection: ${aiFraudCheck.reason}`);
        setPaymentStep('details');
        setIsProcessingPayment(false);
        return;
      }

      // Payment Method Processing
      const paymentResult = await processPaymentMethod();

      if (paymentResult.success) {
        // Record transaction on blockchain
        const txHash = await simulateBlockchainTransaction({
          ...paymentDetails,
          paymentMethod: selectedPaymentMethod,
          paymentId: paymentResult.paymentId
        });

        // Join insurance pool
        await joinInsurancePool(txHash);

        setPaymentStep('success');

        // Auto-close after success
        setTimeout(() => {
          setJoined(true);
          setShowPaymentPage(false);
          setPaymentDetails(null);
          setPaymentStep('method');
          setPaymentFormData({
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: '',
            upiId: '',
            gpayPhone: ''
          });
          // Update UI with new data
          fetchInsuranceData();
        }, 3000);

      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      alert(`Payment failed: ${error.message}`);
      setPaymentStep('details');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const processPaymentMethod = async () => {
    // Simulate payment processing for different methods
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    switch (selectedPaymentMethod) {
      case 'card':
        // Simulate card payment processing
        console.log('Processing credit card payment...');
        return { success: true, paymentId };

      case 'upi':
        // Simulate UPI payment
        console.log('Processing UPI payment...');
        return { success: true, paymentId };

      case 'gpay':
        // Simulate Google Pay
        console.log('Processing Google Pay...');
        return { success: true, paymentId };

      case 'crypto':
        // Crypto payment (already handled)
        console.log('Crypto payment confirmed...');
        return { success: true, paymentId };

      default:
        return { success: false, error: 'Invalid payment method' };
    }
  };

  const joinInsurancePool = async (txHash) => {
    try {
      const response = await fetch('http://localhost:5001/api/insurance/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: paymentDetails.userAddress,
          premiumAmount: paymentDetails.premiumAmount,
          name: `User_${paymentDetails.userAddress.substring(0, 8)}`,
          tier: paymentDetails.tier,
          paymentMethod: selectedPaymentMethod,
          transactionHash: txHash,
          paymentId: 'PAY_' + Date.now()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Successfully joined insurance pool:', result);
        return result;
      } else {
        // Fallback: simulate joining even if backend fails
        console.warn('Backend join failed, using simulation');
        return { success: true, simulated: true };
      }
    } catch (error) {
      console.warn('Backend join error, using simulation:', error.message);
      return { success: true, simulated: true };
    }
  };

  // AI-powered fraud detection for payments
  const checkPaymentFraud = async (paymentData) => {
    try {
      // Simulate AI analysis with pre-trained model
      const fraudScore = Math.random(); // In real system, this would use trained ML model

      // Check against known fraudulent patterns
      const isFraudulent = fraudScore > 0.85; // 15% fraud detection rate

      return {
        isFraudulent,
        fraudScore: (fraudScore * 100).toFixed(1),
        reason: isFraudulent ? 'Suspicious transaction pattern detected' : null,
        confidence: Math.abs(fraudScore - 0.5) * 2
      };
    } catch (error) {
      console.error('AI fraud check error:', error);
      return { isFraudulent: false, fraudScore: '0.0', reason: null };
    }
  };

  // Simulate blockchain transaction recording
  const simulateBlockchainTransaction = async (paymentData) => {
    console.log('Recording transaction on blockchain...');

    // Simulate blockchain confirmation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const txHash = '0x' + Math.random().toString(16).substr(2, 64);
    console.log(`Transaction recorded: ${txHash}`);
    console.log(`Amount: ${paymentData.premiumAmount} ETH`);
    console.log(`From: ${paymentData.userAddress}`);

    return txHash;
  };

  const contribute = async (amount) => {
    try {
      // Update pool health locally for immediate feedback
      const delta = Math.max(-10, Math.min(10, Math.round(amount / 10)));
      setPoolHealth((h) => Math.max(0, Math.min(100, h + delta)));

      // If backend is available, update pool data
      if (amount > 0) {
        const response = await fetch('http://localhost:5001/api/insurance/update-pool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Pool updated:', result);
          // Refresh pool data
          fetchInsuranceData();
        }
      }
    } catch (error) {
      console.error('Error updating pool:', error);
    }
  };

  const submitClaim = async () => {
    setIsSubmittingClaim(true);
    setClaimStatus('verifying');

    try {
      // Simulate certificate hash - in real app this would come from user input
      const certificateHash = '0x' + Math.random().toString(16).substr(2, 64);

      const response = await fetch('http://localhost:5001/api/insurance/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ certificateHash }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success) {
          setClaimStatus('approved');
          // Update pool balance after compensation
          setPoolBalance(result.newPoolBalance);
        } else {
          setClaimStatus('rejected');
        }
      } else {
        console.warn('Backend not available, simulating claim process');
        // Simulate claim process when backend is not available
        setTimeout(() => {
          const isApproved = Math.random() < 0.8; // 80% success rate
          if (isApproved) {
            setClaimStatus('approved');
            setPoolBalance(prev => Math.max(0, prev - 1.0)); // Deduct 1 ETH
          } else {
            setClaimStatus('rejected');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Claim submission failed:', error);
      console.warn('Backend not available, simulating claim process');
      // Fallback simulation when backend is completely unavailable
      setTimeout(() => {
        const isApproved = Math.random() < 0.8;
        if (isApproved) {
          setClaimStatus('approved');
          setPoolBalance(prev => Math.max(0, prev - 1.0));
        } else {
          setClaimStatus('rejected');
        }
      }, 2000);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const submitCertificateForVerification = async () => {
    const trimmedInput = certificateInput.trim();

    if (!trimmedInput) {
      alert('Please enter a blockchain transaction hash or address');
      return;
    }

    // Validate format before submission
    const cleanId = trimmedInput.toLowerCase().replace(/^0x/, '');
    if (cleanId.length !== 64 && cleanId.length !== 40) {
      alert('Invalid format: Must be 64 characters (transaction hash) or 40 characters (address)');
      return;
    }

    if (!/^[0-9a-f]+$/.test(cleanId)) {
      alert('Invalid characters: Only hexadecimal characters (0-9, a-f) are allowed');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('pending');
    setCertificateId(trimmedInput);

    try {
      const response = await fetch('http://localhost:5001/api/insurance/verify-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateHash: trimmedInput,
          userAddress: '0x' + Math.random().toString(16).substr(2, 40) // Simulate user address
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.data.verified) {
          setVerificationStatus('approved');
          setCompensationAmount(result.data.compensation);
          // Update pool balance
          setPoolBalance(result.data.newPoolBalance);
        } else {
          setVerificationStatus('rejected');
        }
      } else {
        console.warn('Backend not available, simulating verification');
        // Simulate verification process
        setVerificationStatus('authenticating');
        setTimeout(() => {
          const isValid = Math.random() < 0.85; // 85% success rate for certificates
          if (isValid) {
            setVerificationStatus('approved');
            const compensation = (Math.random() * 2 + 0.5).toFixed(2); // 0.5-2.5 ETH
            setCompensationAmount(parseFloat(compensation));
            setPoolBalance(prev => Math.max(0, prev - parseFloat(compensation)));
          } else {
            setVerificationStatus('rejected');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Certificate verification failed:', error);
      // Fallback simulation
      setVerificationStatus('authenticating');
      setTimeout(() => {
        const isValid = Math.random() < 0.85;
        if (isValid) {
          setVerificationStatus('approved');
          const compensation = (Math.random() * 2 + 0.5).toFixed(2);
          setCompensationAmount(parseFloat(compensation));
          setPoolBalance(prev => Math.max(0, prev - parseFloat(compensation)));
        } else {
          setVerificationStatus('rejected');
        }
      }, 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  const increaseScale = () => setScale((s) => Math.min(1.6, +(s + 0.05).toFixed(2)));
  const decreaseScale = () => setScale((s) => Math.max(0.8, +(s - 0.05).toFixed(2)));
  const onScaleChange = (e) => setScale(parseFloat(e.target.value));

  return (
    <div className="insurance-page" style={{ ['--page-scale']: scale }}>
      <div className="insurance-hero">
        <div className="scale-controls" aria-hidden={false}>
          <button className="scale-btn" onClick={decreaseScale} aria-label="Decrease text size">A-</button>
          <input className="scale-range" type="range" min="0.8" max="1.6" step="0.05" value={scale} onChange={onScaleChange} aria-label="Adjust page scale" />
          <button className="scale-btn" onClick={increaseScale} aria-label="Increase text size">A+</button>
        </div>
        <h1>Predictive Insurance Pool</h1>
        <p className="subtitle">NEO-PIT GARAGE · AI-DRIVEN RISK ANALYTICS</p>

        <div className="metrics-row">
          <div className="metric"> <div className="m-label">Total Premium Members</div><div className="m-value">{premiumMembers}</div></div>
          <div className="metric"> <div className="m-label">Insurance Pool Balance</div><div className="m-value">{poolBalance} ETH</div></div>
          <div className="metric"> <div className="m-label">Premium Collected</div><div className="m-value">$18,492</div></div>
          <div className="metric"> <div className="m-label">Active Policies</div><div className="m-value">1,848</div></div>
        </div>

        {/* Blockchain Certificate Verification Section */}
        <div className="certificate-verification">
          <h3>Blockchain Certificate Verification</h3>
          <div className="verification-input">
            <input
              type="text"
              placeholder="Enter blockchain transaction hash or address (0x...)"
              value={certificateInput}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow hexadecimal characters and 0x prefix
                if (value === '' || /^0x[a-fA-F0-9]*$/.test(value) || /^[a-fA-F0-9]*$/.test(value)) {
                  setCertificateInput(value);
                }
              }}
              className="certificate-input"
              pattern="^0x[a-fA-F0-9]{40}|^0x[a-fA-F0-9]{64}|^[a-fA-F0-9]{40}|^[a-fA-F0-9]{64}"
              title="Enter a valid Ethereum transaction hash (64 chars) or address (40 chars) with optional 0x prefix"
            />
            <button
              className="verify-btn"
              onClick={submitCertificateForVerification}
              disabled={isVerifying || !certificateInput.trim()}
            >
              {isVerifying ? 'VERIFYING...' : 'SUBMIT FOR VERIFICATION'}
            </button>
          </div>

          {/* Verification Status Display */}
          {verificationStatus && (
            <div className="verification-status-card">
              <div className="status-header">
                <span className="status-label">Certificate ID:</span>
                <span className="certificate-hash">{certificateId}</span>
              </div>

              <div className="status-content">
                {verificationStatus === 'pending' && (
                  <>
                    <div className="status-icon pending">🕓</div>
                    <div className="status-text">Pending Verification</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '25%' }}></div>
                    </div>
                  </>
                )}
                {verificationStatus === 'authenticating' && (
                  <>
                    <div className="status-icon authenticating">🔍</div>
                    <div className="status-text">Authenticating Blockchain Source</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                  </>
                )}
                {verificationStatus === 'approved' && (
                  <>
                    <div className="status-icon approved">✅</div>
                    <div className="status-text">Verified & Approved</div>
                    <div className="compensation-info">
                      <span className="compensation-label">Compensation Amount:</span>
                      <span className="compensation-amount">{compensationAmount} ETH</span>
                    </div>
                  </>
                )}
                {verificationStatus === 'rejected' && (
                  <>
                    <div className="status-icon rejected">❌</div>
                    <div className="status-text">Rejected - Fake or Invalid Certificate</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legacy Claim Status Display */}
        {claimStatus && (
          <div className="claim-status">
            <div className="claim-status-content">
              {claimStatus === 'verifying' && (
                <>
                  <div className="status-icon verifying">⏳</div>
                  <div className="status-text">Verifying Blockchain Certificate...</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '60%' }}></div>
                  </div>
                </>
              )}
              {claimStatus === 'approved' && (
                <>
                  <div className="status-icon approved">✅</div>
                  <div className="status-text">Approved — Compensation Released</div>
                </>
              )}
              {claimStatus === 'rejected' && (
                <>
                  <div className="status-icon rejected">❌</div>
                  <div className="status-text">Rejected — Invalid Certificate</div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="pool-health">
          <div className="health-left">
            <div className="health-label">Insurance Pool Health</div>
            <div className="health-value">{poolHealth}%</div>
          </div>
          <div className="health-bar"><div className="health-fill" style={{ width: `${poolHealth}%` }} /></div>
        </div>

        <div className="hero-actions">
          <button className={`join-btn ${joined ? 'joined' : ''}`} onClick={handleJoinClick}>
            {joined ? 'IN POOL' : 'JOIN POOL'}
          </button>
          <button
            className={`claim-btn ${isSubmittingClaim ? 'submitting' : ''}`}
            onClick={submitClaim}
            disabled={isSubmittingClaim}
          >
            {isSubmittingClaim ? 'SUBMITTING...' : 'SUBMIT CLAIM'}
          </button>
          <div className="contrib-controls">
            <button onClick={() => contribute(50)} className="small" title="Contribute to pool health">+50</button>
            <button onClick={() => contribute(200)} className="small" title="Contribute to pool health">+200</button>
            <button onClick={() => contribute(-100)} className="small danger" title="Simulate pool loss">-100</button>
          </div>
          <button className="refresh-btn" onClick={fetchInsuranceData} title="Refresh pool data">
            🔄
          </button>
        </div>

        {/* Premium Selection Modal */}
        {showPremiumModal && (
          <div className="premium-modal-overlay">
            <div className="premium-modal">
              <h3>Select Your Premium Tier</h3>
              <p>Choose your membership level to join the Predictive Insurance Pool</p>

              <div className="premium-tiers">
                <div
                  className={`premium-tier ${selectedTier === 'basic' ? 'selected' : ''}`}
                  onClick={() => setSelectedTier('basic')}
                >
                  <div className="tier-header">
                    <h4>Basic</h4>
                    <span className="tier-price">0.05 - 0.10 ETH</span>
                  </div>
                  <div className="tier-features">
                    <div className="feature">• 1.0x Compensation Multiplier</div>
                    <div className="feature">• Basic Claim Priority</div>
                    <div className="feature">• Standard Pool Access</div>
                  </div>
                </div>

                <div
                  className={`premium-tier ${selectedTier === 'standard' ? 'selected' : ''}`}
                  onClick={() => setSelectedTier('standard')}
                >
                  <div className="tier-header">
                    <h4>Standard</h4>
                    <span className="tier-price">0.10 - 0.15 ETH</span>
                  </div>
                  <div className="tier-features">
                    <div className="feature">• 1.5x Compensation Multiplier</div>
                    <div className="feature">• Priority Claim Processing</div>
                    <div className="feature">• Enhanced Pool Benefits</div>
                  </div>
                </div>

                <div
                  className={`premium-tier ${selectedTier === 'premium' ? 'selected' : ''}`}
                  onClick={() => setSelectedTier('premium')}
                >
                  <div className="tier-header">
                    <h4>Premium</h4>
                    <span className="tier-price">0.20 - 0.25 ETH</span>
                  </div>
                  <div className="tier-features">
                    <div className="feature">• 2.0x Compensation Multiplier</div>
                    <div className="feature">• Highest Claim Priority</div>
                    <div className="feature">• VIP Pool Access & Analytics</div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowPremiumModal(false)}
                  disabled={isJoining}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={confirmJoinPool}
                  disabled={isJoining}
                >
                  {isJoining ? 'JOINING...' : `JOIN WITH ${selectedTier.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Professional Payment Processing Page */}
        {showPaymentPage && paymentDetails && (
          <div className="payment-modal-overlay">
            <div className="payment-modal">
              {/* Payment Step Indicator */}
              <div className="payment-steps">
                <div className={`step ${paymentStep === 'method' ? 'active' : paymentStep === 'details' || paymentStep === 'processing' || paymentStep === 'success' ? 'completed' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-label">Method</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${paymentStep === 'details' ? 'active' : paymentStep === 'processing' || paymentStep === 'success' ? 'completed' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">Details</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${paymentStep === 'processing' ? 'active' : paymentStep === 'success' ? 'completed' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-label">Process</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${paymentStep === 'success' ? 'completed' : ''}`}>
                  <span className="step-number">4</span>
                  <span className="step-label">Success</span>
                </div>
              </div>

              {/* Step 1: Payment Method Selection */}
              {paymentStep === 'method' && (
                <>
                  <div className="payment-header">
                    <h3>💳 Choose Payment Method</h3>
                    <p>Select your preferred payment option to join the insurance pool</p>
                  </div>

                  <div className="payment-methods">
                    <div
                      className={`payment-method ${selectedPaymentMethod === 'crypto' ? 'selected' : ''}`}
                      onClick={() => selectPaymentMethod('crypto')}
                    >
                      <div className="method-icon">₿</div>
                      <div className="method-info">
                        <h4>Cryptocurrency</h4>
                        <p>ETH, USDC, DAI</p>
                      </div>
                      <div className="method-check">✓</div>
                    </div>

                    <div
                      className={`payment-method ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}
                      onClick={() => selectPaymentMethod('card')}
                    >
                      <div className="method-icon">💳</div>
                      <div className="method-info">
                        <h4>Credit/Debit Card</h4>
                        <p>Visa, Mastercard, Amex</p>
                      </div>
                      <div className="method-check">✓</div>
                    </div>

                    <div
                      className={`payment-method ${selectedPaymentMethod === 'upi' ? 'selected' : ''}`}
                      onClick={() => selectPaymentMethod('upi')}
                    >
                      <div className="method-icon">📱</div>
                      <div className="method-info">
                        <h4>UPI</h4>
                        <p>Paytm, PhonePe, GPay</p>
                      </div>
                      <div className="method-check">✓</div>
                    </div>

                    <div
                      className={`payment-method ${selectedPaymentMethod === 'gpay' ? 'selected' : ''}`}
                      onClick={() => selectPaymentMethod('gpay')}
                    >
                      <div className="method-icon">🎯</div>
                      <div className="method-info">
                        <h4>Google Pay</h4>
                        <p>Direct GPay integration</p>
                      </div>
                      <div className="method-check">✓</div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Payment Details */}
              {paymentStep === 'details' && (
                <>
                  <div className="payment-header">
                    <h3>Enter Payment Details</h3>
                    <p>Securely enter your {selectedPaymentMethod.toUpperCase()} information</p>
                  </div>

                  <div className="payment-form">
                    {selectedPaymentMethod === 'crypto' && (
                      <div className="crypto-payment">
                        <div className="crypto-notice">
                          <div className="crypto-icon">₿</div>
                          <div className="crypto-text">
                            <h4>Cryptocurrency Payment</h4>
                            <p>Your wallet will be prompted to send {paymentDetails.premiumAmount} ETH to the insurance pool contract.</p>
                          </div>
                        </div>
                        <div className="wallet-address">
                          <label>Recipient Address:</label>
                          <div className="address-display">
                            0x742d35Cc6634C0532925a3b844Bc454e4438f44e
                            <button className="copy-btn" onClick={() => navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')}>📋</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === 'card' && (
                      <div className="card-payment">
                        <div className="form-group">
                          <label htmlFor="cardNumber">Card Number</label>
                          <input
                            type="text"
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={paymentFormData.cardNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '');
                              if (/^\d*$/.test(value) && value.length <= 16) {
                                handlePaymentFormChange('cardNumber', value.replace(/(\d{4})/g, '$1 ').trim());
                              }
                            }}
                            maxLength="19"
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="expiryDate">Expiry Date</label>
                            <input
                              type="text"
                              id="expiryDate"
                              placeholder="MM/YY"
                              value={paymentFormData.expiryDate}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 4) {
                                  const formatted = value.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                                  handlePaymentFormChange('expiryDate', formatted);
                                }
                              }}
                              maxLength="5"
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="cvv">CVV</label>
                            <input
                              type="text"
                              id="cvv"
                              placeholder="123"
                              value={paymentFormData.cvv}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 4) {
                                  handlePaymentFormChange('cvv', value);
                                }
                              }}
                              maxLength="4"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="cardholderName">Cardholder Name</label>
                          <input
                            type="text"
                            id="cardholderName"
                            placeholder="John Doe"
                            value={paymentFormData.cardholderName}
                            onChange={(e) => handlePaymentFormChange('cardholderName', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === 'upi' && (
                      <div className="upi-payment">
                        <div className="form-group">
                          <label htmlFor="upiId">UPI ID</label>
                          <input
                            type="text"
                            id="upiId"
                            placeholder="yourname@paytm"
                            value={paymentFormData.upiId}
                            onChange={(e) => handlePaymentFormChange('upiId', e.target.value)}
                          />
                        </div>
                        <div className="upi-apps">
                          <p>Supported UPI apps:</p>
                          <div className="app-icons">
                            <span className="app-icon">📱 Paytm</span>
                            <span className="app-icon">📱 PhonePe</span>
                            <span className="app-icon">📱 GPay</span>
                            <span className="app-icon">📱 Amazon Pay</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === 'gpay' && (
                      <div className="gpay-payment">
                        <div className="form-group">
                          <label htmlFor="gpayPhone">Phone Number</label>
                          <input
                            type="tel"
                            id="gpayPhone"
                            placeholder="+91 98765 43210"
                            value={paymentFormData.gpayPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 12) {
                                handlePaymentFormChange('gpayPhone', value);
                              }
                            }}
                          />
                        </div>
                        <div className="gpay-notice">
                          <div className="gpay-icon">🎯</div>
                          <p>You'll receive a payment request on Google Pay</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Processing */}
              {paymentStep === 'processing' && (
                <div className="payment-processing">
                  <div className="processing-header">
                    <h3>🔄 Processing Payment</h3>
                    <p>Please wait while we securely process your payment...</p>
                  </div>

                  <div className="processing-steps">
                    <div className="processing-step active">
                      <div className="step-icon">🔍</div>
                      <div className="step-text">AI Fraud Detection</div>
                      <div className="step-status">✓ Completed</div>
                    </div>
                    <div className="processing-step active">
                      <div className="step-icon">💳</div>
                      <div className="step-text">Payment Authorization</div>
                      <div className="step-status">⏳ Processing...</div>
                    </div>
                    <div className="processing-step">
                      <div className="step-icon">⛓️</div>
                      <div className="step-text">Blockchain Recording</div>
                      <div className="step-status">⏳ Pending</div>
                    </div>
                    <div className="processing-step">
                      <div className="step-icon">✅</div>
                      <div className="step-text">Pool Membership</div>
                      <div className="step-status">⏳ Pending</div>
                    </div>
                  </div>

                  <div className="processing-spinner-large">
                    <div className="spinner"></div>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {paymentStep === 'success' && (
                <div className="payment-success">
                  <div className="success-header">
                    <div className="success-icon">🎉</div>
                    <h3>Payment Successful!</h3>
                    <p>Welcome to the Predictive Insurance Pool</p>
                  </div>

                  <div className="success-details">
                    <div className="success-item">
                      <span className="success-label">Membership Tier:</span>
                      <span className="success-value">{paymentDetails.tier.toUpperCase()}</span>
                    </div>
                    <div className="success-item">
                      <span className="success-label">Amount Paid:</span>
                      <span className="success-value">{paymentDetails.premiumAmount} ETH</span>
                    </div>
                    <div className="success-item">
                      <span className="success-label">Pool Contribution:</span>
                      <span className="success-value">{paymentDetails.poolContribution} ETH</span>
                    </div>
                    <div className="success-item">
                      <span className="success-label">Transaction ID:</span>
                      <span className="success-value">TXN_{Date.now()}</span>
                    </div>
                  </div>

                  <div className="success-benefits">
                    <h4>Your Membership Benefits:</h4>
                    <ul>
                      {paymentDetails.benefits.map((benefit, index) => (
                        <li key={index}>✓ {benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="success-message">
                    <p>You are now part of the collective protection network. Your premium helps fund the insurance pool for all members.</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {paymentStep === 'method' && (
                <div className="payment-actions">
                  <button
                    className="back-btn"
                    onClick={() => {
                      setShowPaymentPage(false);
                      setShowPremiumModal(true);
                    }}
                  >
                    ← Back to Selection
                  </button>
                </div>
              )}

              {paymentStep === 'details' && (
                <div className="payment-actions">
                  <button
                    className="back-btn"
                    onClick={() => setPaymentStep('method')}
                    disabled={isProcessingPayment}
                  >
                    ← Back
                  </button>
                  <button
                    className="pay-btn"
                    onClick={processPayment}
                    disabled={isProcessingPayment || !validatePaymentForm()}
                  >
                    {isProcessingPayment ? (
                      <>
                        <span className="processing-spinner">⏳</span>
                        PROCESSING...
                      </>
                    ) : (
                      `PAY ${paymentDetails.premiumAmount} ETH`
                    )}
                  </button>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="payment-actions">
                  <p className="processing-note">Please do not close this window while processing...</p>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="payment-actions">
                  <button
                    className="success-btn"
                    onClick={() => {
                      setJoined(true);
                      setShowPaymentPage(false);
                      setPaymentDetails(null);
                      setPaymentStep('method');
                      setPaymentFormData({
                        cardNumber: '',
                        expiryDate: '',
                        cvv: '',
                        cardholderName: '',
                        upiId: '',
                        gpayPhone: ''
                      });
                      fetchInsuranceData();
                    }}
                  >
                    CONTINUE TO DASHBOARD →
                  </button>
                </div>
              )}

              {/* Payment Summary (shown in all steps except success) */}
              {paymentStep !== 'success' && (
                <div className="payment-summary-sidebar">
                  <h4>Order Summary</h4>
                  <div className="summary-item">
                    <span>Tier:</span>
                    <span>{paymentDetails.tier.toUpperCase()}</span>
                  </div>
                  <div className="summary-item">
                    <span>Premium:</span>
                    <span>{paymentDetails.premiumAmount} ETH</span>
                  </div>
                  <div className="summary-item total">
                    <span>Total:</span>
                    <span>{paymentDetails.premiumAmount} ETH</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pool Status Indicator */}
        {joined && (
          <div className="pool-status-indicator">
            <div className="status-indicator-content">
              <span className="status-icon">✅</span>
              <span className="status-text">Successfully joined the Predictive Insurance Pool</span>
              <span className="status-detail">Your premium contributes to collective protection</span>
            </div>
          </div>
        )}
      </div>

      <div className="analytics">
        <h3>AI Risk Analytics</h3>
        <Progress label="Wallets Risk Assessment" value={aiRisk} />
        <Progress label="Payout Likelihood" value={72} />
        <Progress label="Pool Loss Ratio" value={8} />
      </div>

      <div className="leaderboard">
        <h3>Safety Leaderboard</h3>
        <div className="leaders">
          {mockLeaderboard.map((p, i) => (
            <div className="leader" key={p.id} style={{ ['--i']: i }}>
              <div className="leader-left"> <div className="rank">{i+1}</div> <div className="name">{p.name}</div></div>
              <div className="leader-right"> <div className="score">{p.score}</div> <div className="rewards">{p.rewards}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="roi-row">
        <div className="roi-box"> <div className="r-label">30 Day ROI</div><div className="r-value">+18.4%</div></div>
        <div className="roi-box"> <div className="r-label">Total Premiums</div><div className="r-value">$847,392</div></div>
        <div className="roi-box"> <div className="r-label">Your Rewards</div><div className="r-value">$0</div></div>
        <div className="roi-box"> <div className="r-label">Insurance Status</div><div className="r-value">Healthy</div></div>
      </div>
    </div>
  );
}
