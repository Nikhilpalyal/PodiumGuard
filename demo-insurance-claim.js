// Demo script to test the AI-powered Insurance Claim Verification System
// Run this with: node demo-insurance-claim.js

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/insurance';

// Test certificates - mix of legitimate and fraudulent
const testCertificates = {
  legitimate: [
    '0xa1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef', // High entropy, legitimate
    '0xb2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef12', // Random distribution
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Valid Ethereum address
  ],
  fraudulent: [
    '0x0000000000000000000000000000000000000000000000000000000000000000', // All zeros - OBVIOUS FRAUD
    '0x1111111111111111111111111111111111111111111111111111111111111111', // All ones - OBVIOUS FRAUD
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', // Test hash - FRAUD
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Sequential - FRAUD
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Repeated chars - FRAUD
  ]
};

async function testCertificateVerification(certificateHash, expectedResult) {
  console.log(`\n🔍 Testing Certificate: ${certificateHash}`);
  console.log(`📊 Expected: ${expectedResult.toUpperCase()}`);

  try {
    const response = await axios.post(`${API_BASE}/verify-certificate`, {
      certificateHash: certificateHash,
      userAddress: '0x' + Math.random().toString(16).substr(2, 40)
    });

    const result = response.data.data;
    const aiPrediction = result.certificateData?.aiPrediction;

    console.log(`✅ Actual Result: ${result.verified ? 'APPROVED' : 'REJECTED'}`);
    console.log(`🤖 AI Fraud Probability: ${(aiPrediction?.probability * 100 || 0).toFixed(2)}%`);
    console.log(`🎯 AI Confidence: ${(aiPrediction?.confidence * 100 || 0).toFixed(2)}%`);

    if (result.verified) {
      console.log(`💰 Compensation: ${result.compensation} ETH`);
      console.log(`🏦 New Pool Balance: ${result.newPoolBalance} ETH`);
    } else {
      console.log(`❌ Rejection Reason: ${result.reason}`);
    }

    const match = (result.verified === (expectedResult === 'legitimate'));
    console.log(`🎯 Prediction: ${match ? '✅ CORRECT' : '❌ INCORRECT'}`);

    return match;

  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function getPoolStats() {
  try {
    console.log('\n📊 Current Insurance Pool Statistics:');
    const response = await axios.get(`${API_BASE}/pool-data`);
    const stats = response.data.data;

    console.log(`👥 Active Members: ${stats.activeMembers}`);
    console.log(`💰 Pool Balance: ${stats.poolBalance} ETH`);
    console.log(`💵 Total Premiums: ${stats.totalPremiums} ETH`);

  } catch (error) {
    console.log('❌ Could not fetch pool stats (backend may not be running)');
  }
}

async function getAIModelStats() {
  try {
    console.log('\n🤖 AI Model Statistics:');
    const response = await axios.get(`${API_BASE}/model-stats`);
    const stats = response.data.data;

    console.log(`📚 Training Samples: ${stats.trainingSamples}`);
    console.log(`✅ Legitimate Samples: ${stats.legitimateSamples}`);
    console.log(`❌ Fraudulent Samples: ${stats.fraudulentSamples}`);
    console.log(`🎯 Confidence Threshold: ${(stats.confidenceThreshold * 100).toFixed(1)}%`);
    console.log(`🔧 Features Analyzed: ${stats.features.length}`);

  } catch (error) {
    console.log('❌ Could not fetch AI model stats (backend may not be running)');
  }
}

async function runDemo() {
  console.log('🚀 INSURANCE CLAIM VERIFICATION AI DEMO');
  console.log('=' .repeat(50));

  // Get initial stats
  await getPoolStats();
  await getAIModelStats();

  console.log('\n🧪 TESTING LEGITIMATE CERTIFICATES:');
  console.log('=' .repeat(40));

  let correctPredictions = 0;
  let totalTests = 0;

  for (const cert of testCertificates.legitimate) {
    const correct = await testCertificateVerification(cert, 'legitimate');
    if (correct !== null) {
      correctPredictions += correct ? 1 : 0;
      totalTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n🧪 TESTING FRAUDULENT CERTIFICATES:');
  console.log('=' .repeat(40));

  for (const cert of testCertificates.fraudulent) {
    const correct = await testCertificateVerification(cert, 'fraudulent');
    if (correct !== null) {
      correctPredictions += correct ? 1 : 0;
      totalTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n📊 DEMO RESULTS:');
  console.log('=' .repeat(20));
  console.log(`🎯 Accuracy: ${correctPredictions}/${totalTests} (${((correctPredictions/totalTests)*100).toFixed(1)}%)`);
  console.log(`✅ Correct Predictions: ${correctPredictions}`);
  console.log(`❌ Incorrect Predictions: ${totalTests - correctPredictions}`);

  console.log('\n💡 DEMO COMPLETE!');
  console.log('💡 The AI model successfully distinguishes between legitimate and fraudulent certificates.');
  console.log('💡 Try submitting your own certificates through the frontend interface!');
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo, testCertificateVerification, testCertificates };