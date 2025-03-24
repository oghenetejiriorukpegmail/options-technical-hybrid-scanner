"""
Scanner Module

This module filters stocks and delivers actionable insights.
"""

import logging
import json
import os
import pandas as pd
import yfinance as yf
import concurrent.futures
from datetime import datetime
from tqdm import tqdm

from src.modules.market_context import MarketContextAnalyzer
from src.modules.key_levels import KeyLevelsMapper
from src.modules.trade_setup import TradeSetupEngine
from src.modules.confirmation import ConfirmationModule
from src.modules.risk_management import RiskManager

logger = logging.getLogger(__name__)

class StockScanner:
    """
    Filters stocks and delivers actionable insights
    
    Features:
    - Custom Filters
    - Real-Time Alerts
    - Visualizations
    """
    
    def __init__(self, config_file=None):
        """
        Initialize the Stock Scanner
        
        Args:
            config_file (str, optional): Path to configuration file
        """
        if config_file is None:
            config_file = 'config.json'  # Default to config.json in the root directory
        
        self.config = self._load_config(config_file)
        self.symbols = self._load_symbols()
        self.results = []
    
    def _load_config(self, config_file):
        """Load scanner configuration"""
        default_config = {
            'max_workers': 5,
            'filters': {
                'trend': ['bullish', 'bearish', 'neutral'],
                'pcr_min': 0,
                'pcr_max': 2,
                'rsi_min': 0,
                'rsi_max': 100,
                'stoch_rsi_min': 0,
                'stoch_rsi_max': 100,
                'min_confidence': 60
            },
            'output_dir': 'scanner_results'
        }
        
        try:
            if os.path.exists(config_file):
                logger.info(f"Loading configuration from {config_file}")
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                    # Merge user config with default config
                    for key, value in user_config.items():
                        if key in default_config and isinstance(value, dict) and isinstance(default_config[key], dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
            else:
                logger.warning(f"Config file {config_file} not found, using default configuration")
        except Exception as e:
            logger.error(f"Error loading config file: {e}")
        
        return default_config
    
    def _load_symbols(self):
        """Load stock symbols to scan"""
        symbols = []
        
        # Check if symbols are provided in config
        if 'symbols' in self.config and self.config['symbols']:
            symbols = self.config['symbols']
        else:
            # Default to NASDAQ 100 symbols
            try:
                # Try to load from file
                symbols_file = self.config.get('symbols_file', 'nasdaq100_tickers.txt')
                if os.path.exists(symbols_file):
                    with open(symbols_file, 'r') as f:
                        symbols = [line.strip() for line in f if line.strip()]
                else:
                    # Fallback to a few major tech stocks
                    symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']
            except Exception as e:
                logger.error(f"Error loading symbols: {e}")
                # Fallback to a few major tech stocks
                symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']
        
        return symbols
    
    def _analyze_symbol(self, symbol):
        """
        Analyze a single symbol
        
        Args:
            symbol (str): Stock symbol to analyze
            
        Returns:
            dict: Analysis results
        """
        logger.info(f"Analyzing {symbol}")
        
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
                logger.warning(f"Failed to analyze market context for {symbol}")
                return None
            
            # Map key levels
            levels_results = key_levels.map_levels()
            if not levels_results['success']:
                logger.warning(f"Failed to map key levels for {symbol}")
                return None
            
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
                    'stoch_rsi': context_results['stoch_rsi']
                },
                'key_levels': {
                    'support': levels_results['support'],
                    'resistance': levels_results['resistance'],
                    'max_pain': levels_results['max_pain']
                }
            }
            
            # Apply filters
            if self._apply_filters(result):
                return result
            else:
                return None
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return None
    
    def _apply_filters(self, result):
        """
        Apply filters to scan results
        
        Args:
            result (dict): Analysis result
            
        Returns:
            bool: True if result passes filters, False otherwise
        """
        filters = self.config['filters']
        
        # Filter by trend
        if result['market_context']['trend'] not in filters['trend']:
            return False
        
        # Filter by PCR
        if not (filters['pcr_min'] <= result['market_context']['pcr'] <= filters['pcr_max']):
            return False
        
        # Filter by RSI
        if not (filters['rsi_min'] <= result['market_context']['rsi'] <= filters['rsi_max']):
            return False
        
        # Filter by Stochastic RSI
        if not (filters['stoch_rsi_min'] <= result['market_context']['stoch_rsi'] <= filters['stoch_rsi_max']):
            return False
        
        # Filter by confidence
        if result['confidence'] < filters['min_confidence']:
            return False
        
        return True
    
    def _save_results(self):
        """Save scan results to file"""
        if not self.results:
            logger.warning("No results to save")
            return
        
        # Create output directory if it doesn't exist
        output_dir = self.config['output_dir']
        os.makedirs(output_dir, exist_ok=True)
        
        # Save results to JSON file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = os.path.join(output_dir, f"scan_results_{timestamp}.json")
        
        try:
            with open(output_file, 'w') as f:
                json.dump(self.results, f, indent=2)
            logger.info(f"Results saved to {output_file}")
        except Exception as e:
            logger.error(f"Error saving results: {e}")
    
    def scan(self):
        """
        Scan stocks for trading opportunities
        
        Returns:
            list: Scan results
        """
        logger.info(f"Starting scan for {len(self.symbols)} symbols")

        self.results = []
        max_workers = self.config['max_workers']

        # Use ThreadPoolExecutor for parallel processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit tasks
            future_to_symbol = {executor.submit(self._analyze_symbol, symbol): symbol for symbol in self.symbols}

            # Process results as they complete
            for future in tqdm(concurrent.futures.as_completed(future_to_symbol), total=len(self.symbols), desc="Scanning"):
                symbol = future_to_symbol[future]
                try:
                    result = future.result()
                    if result:
                        self.results.append(result)
                        logger.info(f"Found setup for {symbol}: {result['setup']} (Confidence: {result['confidence']}%)")
                except Exception as e:
                    logger.error(f"Error processing {symbol}: {e}")

        # Sort results by confidence
        self.results.sort(key=lambda x: x['confidence'], reverse=True)

        # Save results
        self._save_results()

        logger.info(f"Scan complete. Found {len(self.results)} setups.")

        return self.results
    
    def get_bullish_setups(self):
        """Get bullish setups"""
        return [r for r in self.results if r['setup'].startswith('bullish')]
    
    def get_bearish_setups(self):
        """Get bearish setups"""
        return [r for r in self.results if r['setup'].startswith('bearish')]
    
    def get_neutral_setups(self):
        """Get neutral setups"""
        return [r for r in self.results if r['setup'].startswith('neutral')]
    
    def get_entry_signals(self):
        """Get setups with entry signals"""
        return [r for r in self.results if r['entry_signal']]