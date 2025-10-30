from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import json
import logging
import time
from datetime import datetime
import hashlib
import re

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class MEVDetectionEngine:
    def __init__(self):
        # Known MEV bot addresses (this would be populated from a database in production)
        self.known_mev_bots = set([
            "0x0000000000000000000000000000000000000000",  # Example addresses
            "0x1111111111111111111111111111111111111111",
        ])
        
        # Known DEX addresses
        self.dex_addresses = set([
            "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",  # Uniswap V2 Router
            "0xe592427a0aece92de3edee1f18e0157c05861564",  # Uniswap V3 Router
            "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",  # Sushiswap Router
            "0x1111111254fb6c44bac0bed2854e76f90643097d",  # 1inch V4 Router
        ])
        
        # MEV patterns and signatures
        self.mev_patterns = {
            'sandwich_attack': {
                'gas_multiplier_threshold': 2.0,
                'value_threshold': 0.1,
                'time_window': 30  # seconds
            },
            'frontrunning': {
                'gas_multiplier_threshold': 1.5,
                'similar_tx_threshold': 0.8
            },
            'arbitrage': {
                'profit_threshold': 0.01,
                'multi_dex_pattern': True
            }
        }
        
        # Transaction cache for pattern analysis
        self.recent_transactions = []
        self.max_cache_size = 1000
        
    def analyze_transaction(self, tx_data):
        """Main analysis function that returns risk score and details"""
        try:
            risk_score = 0
            risk_factors = []
            category = "normal"
            
            # Individual risk checks
            gas_risk = self._analyze_gas_patterns(tx_data)
            address_risk = self._analyze_addresses(tx_data)
            value_risk = self._analyze_value_patterns(tx_data)
            timing_risk = self._analyze_timing_patterns(tx_data)
            data_risk = self._analyze_transaction_data(tx_data)
            
            # Aggregate risk scores
            risk_score += gas_risk['score']
            risk_score += address_risk['score']
            risk_score += value_risk['score']
            risk_score += timing_risk['score']
            risk_score += data_risk['score']
            
            # Collect risk factors
            risk_factors.extend(gas_risk['factors'])
            risk_factors.extend(address_risk['factors'])
            risk_factors.extend(value_risk['factors'])
            risk_factors.extend(timing_risk['factors'])
            risk_factors.extend(data_risk['factors'])
            
            # Determine category based on risk factors
            category = self._determine_category(risk_factors, risk_score)
            
            # Cap risk score at 100
            risk_score = min(risk_score, 100)
            
            # Cache transaction for pattern analysis
            self._cache_transaction(tx_data, risk_score)
            
            return {
                'riskScore': round(risk_score, 2),
                'category': category,
                'riskFactors': risk_factors,
                'timestamp': datetime.now().isoformat(),
                'analysis_details': {
                    'gas_analysis': gas_risk,
                    'address_analysis': address_risk,
                    'value_analysis': value_risk,
                    'timing_analysis': timing_risk,
                    'data_analysis': data_risk
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing transaction: {str(e)}")
            return {
                'riskScore': 0,
                'category': 'error',
                'riskFactors': ['analysis_error'],
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }
    
    def _analyze_gas_patterns(self, tx_data):
        """Analyze gas price patterns for MEV indicators"""
        risk_score = 0
        factors = []
        
        try:
            gas_price = float(tx_data.get('gasPrice', 0))
            max_fee = float(tx_data.get('maxFeePerGas', gas_price))
            priority_fee = float(tx_data.get('maxPriorityFeePerGas', 0))
            
            # Check for extremely high gas prices (frontrunning indicator)
            if gas_price > 100:  # > 100 gwei
                risk_score += 25
                factors.append('high_gas_price')
                
            if max_fee > 200:  # > 200 gwei
                risk_score += 30
                factors.append('extremely_high_gas')
                
            # Check for high priority fees (MEV bot behavior)
            if priority_fee > 50:  # > 50 gwei priority fee
                risk_score += 20
                factors.append('high_priority_fee')
                
            # Check gas limit patterns
            gas_limit = int(tx_data.get('gasLimit', 0))
            if gas_limit > 500000:  # High gas limit transactions
                risk_score += 10
                factors.append('high_gas_limit')
                
        except (ValueError, TypeError):
            factors.append('invalid_gas_data')
            
        return {'score': risk_score, 'factors': factors}
    
    def _analyze_addresses(self, tx_data):
        """Analyze from/to addresses for known MEV patterns"""
        risk_score = 0
        factors = []
        
        from_addr = tx_data.get('from', '').lower()
        to_addr = tx_data.get('to', '').lower()
        
        # Check against known MEV bot addresses
        if from_addr in self.known_mev_bots:
            risk_score += 40
            factors.append('known_mev_bot_sender')
            
        if to_addr in self.known_mev_bots:
            risk_score += 30
            factors.append('known_mev_bot_recipient')
            
        # Check if interacting with DEX contracts
        if to_addr in self.dex_addresses:
            risk_score += 5
            factors.append('dex_interaction')
            
        # Check for contract addresses (higher risk)
        if self._is_contract_address(to_addr):
            risk_score += 5
            factors.append('contract_interaction')
            
        # Check for new/suspicious addresses
        if self._is_suspicious_address(from_addr):
            risk_score += 15
            factors.append('suspicious_sender')
            
        return {'score': risk_score, 'factors': factors}
    
    def _analyze_value_patterns(self, tx_data):
        """Analyze transaction value patterns"""
        risk_score = 0
        factors = []
        
        try:
            value = float(tx_data.get('value', 0))
            
            # Very high value transactions
            if value > 100:  # > 100 ETH
                risk_score += 15
                factors.append('high_value_transaction')
            elif value > 10:  # > 10 ETH
                risk_score += 5
                factors.append('medium_value_transaction')
                
            # Check for round numbers (bot behavior)
            if value > 0 and value == int(value):
                risk_score += 5
                factors.append('round_number_value')
                
        except (ValueError, TypeError):
            factors.append('invalid_value_data')
            
        return {'score': risk_score, 'factors': factors}
    
    def _analyze_timing_patterns(self, tx_data):
        """Analyze timing patterns for MEV behavior"""
        risk_score = 0
        factors = []
        
        # Check for rapid-fire transactions from same address
        from_addr = tx_data.get('from', '')
        current_time = time.time()
        
        recent_from_same = [
            tx for tx in self.recent_transactions 
            if tx.get('from') == from_addr and 
            (current_time - tx.get('processed_time', 0)) < 60  # Within 1 minute
        ]
        
        if len(recent_from_same) > 5:
            risk_score += 20
            factors.append('rapid_fire_transactions')
        elif len(recent_from_same) > 2:
            risk_score += 10
            factors.append('frequent_transactions')
            
        return {'score': risk_score, 'factors': factors}
    
    def _analyze_transaction_data(self, tx_data):
        """Analyze transaction data/input for MEV patterns"""
        risk_score = 0
        factors = []
        
        data = tx_data.get('data', '0x')
        
        # Check for complex transaction data (smart contract interactions)
        if len(data) > 10:  # More than just "0x"
            risk_score += 5
            factors.append('complex_transaction_data')
            
        # Check for common MEV function signatures
        mev_signatures = [
            '0xa9059cbb',  # transfer
            '0x095ea7b3',  # approve
            '0x38ed1739',  # swapExactTokensForTokens
            '0x7ff36ab5',  # swapExactETHForTokens
        ]
        
        for sig in mev_signatures:
            if data.startswith(sig):
                risk_score += 10
                factors.append(f'mev_function_signature_{sig}')
                break
                
        return {'score': risk_score, 'factors': factors}
    
    def _determine_category(self, risk_factors, risk_score):
        """Determine MEV category based on risk factors"""
        if 'known_mev_bot_sender' in risk_factors:
            return 'mev_bot'
        elif 'high_gas_price' in risk_factors and 'dex_interaction' in risk_factors:
            return 'frontrunning'
        elif 'rapid_fire_transactions' in risk_factors:
            return 'sandwich_attack'
        elif risk_score > 50:
            return 'high_risk'
        elif risk_score > 25:
            return 'medium_risk'
        else:
            return 'normal'
    
    def _is_contract_address(self, address):
        """Simple heuristic to check if address might be a contract"""
        # This is a simplified check - in production, you'd query the blockchain
        return len(address) == 42 and address.startswith('0x')
    
    def _is_suspicious_address(self, address):
        """Check if address shows suspicious patterns"""
        # Check for patterns like many zeros or repeated digits
        if address.count('0') > 30:
            return True
        
        # Check for very new addresses (simplified)
        address_hash = hashlib.md5(address.encode()).hexdigest()
        return int(address_hash, 16) % 100 < 10  # 10% random chance for demo
    
    def _cache_transaction(self, tx_data, risk_score):
        """Cache transaction for pattern analysis"""
        cached_tx = {
            **tx_data,
            'risk_score': risk_score,
            'processed_time': time.time()
        }
        
        self.recent_transactions.append(cached_tx)
        
        # Keep cache size manageable
        if len(self.recent_transactions) > self.max_cache_size:
            self.recent_transactions = self.recent_transactions[-self.max_cache_size:]

# Initialize the detection engine
detection_engine = MEVDetectionEngine()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/detect', methods=['POST'])
def detect_mev():
    """Main endpoint for MEV detection"""
    try:
        # Validate request
        if not request.json:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        tx_data = request.json
        
        # Validate required fields
        required_fields = ['txHash', 'from', 'to', 'value']
        missing_fields = [field for field in required_fields if field not in tx_data]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {missing_fields}'
            }), 400
        
        # Perform MEV analysis
        analysis_result = detection_engine.analyze_transaction(tx_data)
        
        # Log the analysis
        logger.info(f"Analyzed transaction {tx_data.get('txHash')} - Risk Score: {analysis_result['riskScore']}%")
        
        return jsonify(analysis_result)
        
    except Exception as e:
        logger.error(f"Error in detect endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get detection engine statistics"""
    try:
        recent_analyses = detection_engine.recent_transactions
        
        stats = {
            'total_analyzed': len(recent_analyses),
            'high_risk_count': len([tx for tx in recent_analyses if tx.get('risk_score', 0) > 75]),
            'medium_risk_count': len([tx for tx in recent_analyses if 25 < tx.get('risk_score', 0) <= 75]),
            'low_risk_count': len([tx for tx in recent_analyses if tx.get('risk_score', 0) <= 25]),
            'avg_risk_score': np.mean([tx.get('risk_score', 0) for tx in recent_analyses]) if recent_analyses else 0,
            'cache_size': len(recent_analyses),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error in stats endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/update_mev_bots', methods=['POST'])
def update_mev_bots():
    """Update known MEV bot addresses"""
    try:
        data = request.json
        if 'addresses' in data:
            detection_engine.known_mev_bots.update(
                addr.lower() for addr in data['addresses']
            )
            return jsonify({
                'message': f'Updated {len(data["addresses"])} MEV bot addresses',
                'total_known_bots': len(detection_engine.known_mev_bots)
            })
        else:
            return jsonify({'error': 'No addresses provided'}), 400
            
    except Exception as e:
        logger.error(f"Error updating MEV bots: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)