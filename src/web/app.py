"""
Web Application Module

This module provides a web interface for the Options-Technical Hybrid Scanner.
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS

from src.modules.market_context import MarketContextAnalyzer
from src.modules.key_levels import KeyLevelsMapper
from src.modules.trade_setup import TradeSetupEngine
from src.modules.confirmation import ConfirmationModule
from src.modules.risk_management import RiskManager
from src.modules.scanner import StockScanner

logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    # Create Flask app
    app = Flask(__name__, 
                static_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static'),
                template_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'templates'))
    
    # Enable CORS
    CORS(app)
    
    # Create scanner instance
    scanner = StockScanner()
    
    @app.route('/')
    def index():
        """Render the main dashboard page"""
        return render_template('index.html')
    
    @app.route('/api/scan', methods=['POST'])
    def scan():
        """Run the scanner with custom filters"""
        try:
            # Get filter parameters from request
            filters = request.json.get('filters', {})
            
            # Update scanner config with filters
            scanner.config['filters'].update(filters)
            
            # Run the scan
            results = scanner.scan()
            
            return jsonify({
                'success': True,
                'count': len(results),
                'results': results
            })
        except Exception as e:
            logger.error(f"Error running scan: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/analyze/<symbol>', methods=['GET'])
    def analyze(symbol):
        """Analyze a specific symbol"""
        try:
            # Initialize modules
            market_context = MarketContextAnalyzer(symbol)
            key_levels = KeyLevelsMapper(symbol)
            trade_setup = TradeSetupEngine(symbol)
            confirmation = ConfirmationModule(symbol)
            risk_manager = RiskManager(symbol)
            
            # Analyze market context
            context_results = market_context.analyze()
            if not context_results['success']:
                return jsonify({
                    'success': False,
                    'error': f"Failed to analyze market context for {symbol}"
                }), 400
            
            # Map key levels
            levels_results = key_levels.map_levels()
            if not levels_results['success']:
                return jsonify({
                    'success': False,
                    'error': f"Failed to map key levels for {symbol}"
                }), 400
            
            # Determine trade setup
            setup_results = trade_setup.determine_setup(context_results, levels_results)
            
            # Get confirmation signals
            confirmation_results = confirmation.get_signals(setup_results)
            
            # Get risk management recommendations
            risk_results = risk_manager.get_recommendations(setup_results)
            
            # Combine results
            result = {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'setup': setup_results['setup'],
                'confidence': setup_results['confidence'],
                'reasons': setup_results['reasons'],
                'entry_signal': confirmation_results['entry']['signal'],
                'entry_strength': confirmation_results['entry']['strength'],
                'entry_reasons': confirmation_results['entry']['reasons'],
                'exit_signal': confirmation_results['exit']['signal'],
                'exit_strength': confirmation_results['exit']['strength'],
                'exit_reasons': confirmation_results['exit']['reasons'],
                'position_size': risk_results['position_size']['recommended'],
                'stop_loss': risk_results['stop_loss']['technical'],
                'risk_reward': risk_results['risk_reward']['ratio'],
                'target_price': risk_results['risk_reward'].get('target_price', 0),
                'current_price': levels_results['current_price'],
                'market_context': {
                    'trend': context_results['trend'],
                    'sentiment': context_results['sentiment'],
                    'momentum': context_results['momentum'],
                    'pcr': context_results['pcr'],
                    'rsi': context_results['rsi'],
                    'stoch_rsi': context_results['stoch_rsi'],
                    'ema10': context_results['ema10'],
                    'ema20': context_results['ema20'],
                    'ema50': context_results['ema50']
                },
                'key_levels': {
                    'support': levels_results['support'],
                    'resistance': levels_results['resistance'],
                    'max_pain': levels_results['max_pain'],
                    'high_gamma': levels_results['high_gamma']
                }
            }
            
            return jsonify({
                'success': True,
                'result': result
            })
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/results', methods=['GET'])
    def get_results():
        """Get the latest scan results"""
        try:
            # Get results from scanner
            results = scanner.results
            
            # If no results, try to load from file
            if not results:
                output_dir = scanner.config['output_dir']
                if os.path.exists(output_dir):
                    # Get the latest results file
                    files = [f for f in os.listdir(output_dir) if f.startswith('scan_results_') and f.endswith('.json')]
                    if files:
                        latest_file = max(files)
                        with open(os.path.join(output_dir, latest_file), 'r') as f:
                            results = json.load(f)
            
            return jsonify({
                'success': True,
                'count': len(results),
                'results': results
            })
        except Exception as e:
            logger.error(f"Error getting results: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/symbols', methods=['GET'])
    def get_symbols():
        """Get the list of symbols to scan"""
        try:
            return jsonify({
                'success': True,
                'count': len(scanner.symbols),
                'symbols': scanner.symbols
            })
        except Exception as e:
            logger.error(f"Error getting symbols: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/static/<path:path>')
    def serve_static(path):
        """Serve static files"""
        return send_from_directory(app.static_folder, path)
    
    return app