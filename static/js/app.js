/**
 * Options-Technical Hybrid Scanner
 * Main JavaScript file for the web interface
 */

// Global variables
let emaChart = null;
let levelsChart = null;
let riskRewardChart = null;
let scanResults = [];

// DOM elements
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');
const scanButton = document.getElementById('scanButton');
const scannerForm = document.getElementById('scannerForm');
const analyzeButton = document.getElementById('analyzeButton');
const analysisSymbol = document.getElementById('analysisSymbol');
const analysisResults = document.getElementById('analysisResults');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadResults();
});

/**
 * Set up navigation between sections
 */
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('d-none'));
            
            // Show the target section
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.remove('d-none');
        });
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Scan button
    scanButton.addEventListener('click', () => {
        // Navigate to scanner section
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('a[href="#scanner"]').classList.add('active');
        
        // Hide all sections
        sections.forEach(section => section.classList.add('d-none'));
        
        // Show scanner section
        document.getElementById('scanner').classList.remove('d-none');
    });
    
    // Scanner form
    scannerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runScan();
    });
    
    // Analyze button
    analyzeButton.addEventListener('click', () => {
        const symbol = analysisSymbol.value.trim().toUpperCase();
        if (symbol) {
            analyzeSymbol(symbol);
        } else {
            alert('Please enter a valid symbol');
        }
    });
    
    // Analysis symbol input (enter key)
    analysisSymbol.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            analyzeButton.click();
        }
    });
}

/**
 * Load scan results
 */
function loadResults() {
    // Show loading state
    document.getElementById('resultsTable').innerHTML = '<tr><td colspan="9" class="text-center">Loading results...</td></tr>';
    
    // Fetch results from API
    fetch('/api/results')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                scanResults = data.results;
                updateDashboard();
            } else {
                document.getElementById('resultsTable').innerHTML = '<tr><td colspan="9" class="text-center">No results available</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading results:', error);
            document.getElementById('resultsTable').innerHTML = '<tr><td colspan="9" class="text-center">Error loading results</td></tr>';
        });
}

/**
 * Update dashboard with scan results
 */
function updateDashboard() {
    // Count setups by type
    const bullishSetups = scanResults.filter(r => r.setup.startsWith('bullish'));
    const bearishSetups = scanResults.filter(r => r.setup.startsWith('bearish'));
    const neutralSetups = scanResults.filter(r => r.setup.startsWith('neutral'));
    
    // Update counts
    document.getElementById('bullishCount').textContent = bullishSetups.length;
    document.getElementById('bearishCount').textContent = bearishSetups.length;
    document.getElementById('neutralCount').textContent = neutralSetups.length;
    
    // Update setup lists
    updateSetupList('bullishList', bullishSetups, 'bullish');
    updateSetupList('bearishList', bearishSetups, 'bearish');
    updateSetupList('neutralList', neutralSetups, 'neutral');
    
    // Update results table
    updateResultsTable();
}

/**
 * Update setup list
 */
function updateSetupList(elementId, setups, setupType) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = '';
    
    // Sort by confidence
    setups.sort((a, b) => b.confidence - a.confidence);
    
    // Take top 5
    const topSetups = setups.slice(0, 5);
    
    if (topSetups.length === 0) {
        listElement.innerHTML = '<div class="text-muted">No setups found</div>';
        return;
    }
    
    // Create list items
    topSetups.forEach(setup => {
        const item = document.createElement('div');
        item.className = `setup-item ${setupType}`;
        item.innerHTML = `
            <span class="symbol">${setup.symbol}</span>
            <span class="confidence">${setup.confidence.toFixed(1)}%</span>
        `;
        
        // Add click event to navigate to analysis
        item.addEventListener('click', () => {
            // Navigate to analysis section
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('a[href="#analysis"]').classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('d-none'));
            
            // Show analysis section
            document.getElementById('analysis').classList.remove('d-none');
            
            // Set symbol and trigger analysis
            analysisSymbol.value = setup.symbol;
            analyzeSymbol(setup.symbol);
        });
        
        listElement.appendChild(item);
    });
}

/**
 * Update results table
 */
function updateResultsTable() {
    const tableElement = document.getElementById('resultsTable');
    tableElement.innerHTML = '';
    
    // Sort by confidence
    const sortedResults = [...scanResults].sort((a, b) => b.confidence - a.confidence);
    
    if (sortedResults.length === 0) {
        tableElement.innerHTML = '<tr><td colspan="9" class="text-center">No results available</td></tr>';
        return;
    }
    
    // Create table rows
    sortedResults.forEach(result => {
        const row = document.createElement('tr');
        
        // Determine setup class
        let setupClass = '';
        let setupText = result.setup;
        
        if (result.setup.startsWith('bullish')) {
            setupClass = 'text-success';
            setupText = result.setup.replace('bullish', 'Bullish');
        } else if (result.setup.startsWith('bearish')) {
            setupClass = 'text-danger';
            setupText = result.setup.replace('bearish', 'Bearish');
        } else if (result.setup.startsWith('neutral')) {
            setupClass = 'text-secondary';
            setupText = result.setup.replace('neutral', 'Neutral');
        }
        
        // Determine entry signal class
        let entrySignalClass = '';
        let entrySignalText = '';
        
        if (result.entry_signal) {
            entrySignalClass = 'yes';
            entrySignalText = 'Yes';
        } else {
            entrySignalClass = 'no';
            entrySignalText = 'No';
        }
        
        row.innerHTML = `
            <td><strong>${result.symbol}</strong></td>
            <td class="${setupClass}">${setupText}</td>
            <td>${result.confidence.toFixed(1)}%</td>
            <td><span class="signal-badge ${entrySignalClass}">${entrySignalText}</span></td>
            <td>$${result.current_price.toFixed(2)}</td>
            <td>$${result.target_price.toFixed(2)}</td>
            <td>$${result.stop_loss.toFixed(2)}</td>
            <td>${result.risk_reward.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-primary analyze-btn" data-symbol="${result.symbol}">
                    <i class="bi bi-graph-up"></i> Analyze
                </button>
            </td>
        `;
        
        tableElement.appendChild(row);
    });
    
    // Add event listeners to analyze buttons
    document.querySelectorAll('.analyze-btn').forEach(button => {
        button.addEventListener('click', () => {
            const symbol = button.getAttribute('data-symbol');
            
            // Navigate to analysis section
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('a[href="#analysis"]').classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('d-none'));
            
            // Show analysis section
            document.getElementById('analysis').classList.remove('d-none');
            
            // Set symbol and trigger analysis
            analysisSymbol.value = symbol;
            analyzeSymbol(symbol);
        });
    });
}

/**
 * Run scanner with custom filters
 */
function runScan() {
    // Show loading state
    document.getElementById('resultsTable').innerHTML = '<tr><td colspan="9" class="text-center">Running scan...</td></tr>';
    
    // Get filter values
    const trendBullish = document.getElementById('trendBullish').checked;
    const trendBearish = document.getElementById('trendBearish').checked;
    const trendNeutral = document.getElementById('trendNeutral').checked;
    const pcrMin = parseFloat(document.getElementById('pcrMin').value);
    const pcrMax = parseFloat(document.getElementById('pcrMax').value);
    const rsiMin = parseInt(document.getElementById('rsiMin').value);
    const rsiMax = parseInt(document.getElementById('rsiMax').value);
    const stochRsiMin = parseInt(document.getElementById('stochRsiMin').value);
    const stochRsiMax = parseInt(document.getElementById('stochRsiMax').value);
    const minConfidence = parseInt(document.getElementById('minConfidence').value);
    const symbol = document.getElementById('symbolInput').value.trim().toUpperCase();
    
    // Build trend array
    const trend = [];
    if (trendBullish) trend.push('bullish');
    if (trendBearish) trend.push('bearish');
    if (trendNeutral) trend.push('neutral');
    
    // Build filters object
    const filters = {
        trend,
        pcr_min: pcrMin,
        pcr_max: pcrMax,
        rsi_min: rsiMin,
        rsi_max: rsiMax,
        stoch_rsi_min: stochRsiMin,
        stoch_rsi_max: stochRsiMax,
        min_confidence: minConfidence
    };
    
    // Add symbol if provided
    if (symbol) {
        filters.symbols = [symbol];
    }
    
    // Send request to API
    fetch('/api/scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            scanResults = data.results;
            
            // Navigate to dashboard
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('a[href="#dashboard"]').classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('d-none'));
            
            // Show dashboard section
            document.getElementById('dashboard').classList.remove('d-none');
            
            // Update dashboard
            updateDashboard();
        } else {
            alert(`Error running scan: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error running scan:', error);
        alert('Error running scan. Please try again.');
    });
}

/**
 * Analyze a specific symbol
 */
function analyzeSymbol(symbol) {
    // Show loading state
    analysisResults.classList.add('d-none');
    
    // Fetch analysis from API
    fetch(`/api/analyze/${symbol}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayAnalysis(data.result);
            } else {
                alert(`Error analyzing ${symbol}: ${data.error}`);
            }
        })
        .catch(error => {
            console.error(`Error analyzing ${symbol}:`, error);
            alert(`Error analyzing ${symbol}. Please try again.`);
        });
}

/**
 * Display analysis results
 */
function displayAnalysis(result) {
    // Market Context
    document.getElementById('trendValue').textContent = result.market_context.trend;
    document.getElementById('trendValue').className = `trend-${result.market_context.trend}`;
    
    document.getElementById('sentimentValue').textContent = result.market_context.sentiment;
    document.getElementById('momentumValue').textContent = result.market_context.momentum;
    document.getElementById('pcrValue').textContent = result.market_context.pcr.toFixed(2);
    document.getElementById('rsiValue').textContent = result.market_context.rsi.toFixed(2);
    document.getElementById('stochRsiValue').textContent = result.market_context.stoch_rsi.toFixed(2);
    document.getElementById('currentPriceValue').textContent = `$${result.current_price.toFixed(2)}`;
    
    // Key Levels
    const supportLevels = document.getElementById('supportLevels');
    supportLevels.innerHTML = '';
    result.key_levels.support.forEach(level => {
        const li = document.createElement('li');
        li.textContent = `$${level.toFixed(2)}`;
        supportLevels.appendChild(li);
    });
    
    const resistanceLevels = document.getElementById('resistanceLevels');
    resistanceLevels.innerHTML = '';
    result.key_levels.resistance.forEach(level => {
        const li = document.createElement('li');
        li.textContent = `$${level.toFixed(2)}`;
        resistanceLevels.appendChild(li);
    });
    
    document.getElementById('maxPainValue').textContent = result.key_levels.max_pain ? `$${result.key_levels.max_pain.toFixed(2)}` : 'N/A';
    
    const highGammaStrikes = document.getElementById('highGammaStrikes');
    highGammaStrikes.innerHTML = '';
    result.key_levels.high_gamma.forEach(strike => {
        const li = document.createElement('li');
        li.textContent = `$${strike.toFixed(2)}`;
        highGammaStrikes.appendChild(li);
    });
    
    // Trade Setup
    document.getElementById('setupValue').textContent = result.setup;
    document.getElementById('confidenceValue').textContent = result.confidence.toFixed(1);
    
    const setupReasons = document.getElementById('setupReasons');
    setupReasons.innerHTML = '';
    result.reasons.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        setupReasons.appendChild(li);
    });
    
    document.getElementById('entrySignalValue').textContent = result.entry_signal ? 'Yes' : 'No';
    document.getElementById('entryStrengthValue').textContent = result.entry_strength.toFixed(1);
    
    const entryReasons = document.getElementById('entryReasons');
    entryReasons.innerHTML = '';
    result.entry_reasons.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        entryReasons.appendChild(li);
    });
    
    document.getElementById('exitSignalValue').textContent = result.exit_signal ? 'Yes' : 'No';
    document.getElementById('exitStrengthValue').textContent = result.exit_strength.toFixed(1);
    
    const exitReasons = document.getElementById('exitReasons');
    exitReasons.innerHTML = '';
    result.exit_reasons.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        exitReasons.appendChild(li);
    });
    
    // Risk Management
    document.getElementById('positionSizeValue').textContent = (result.position_size * 100).toFixed(2);
    document.getElementById('stopLossValue').textContent = `$${result.stop_loss.toFixed(2)}`;
    document.getElementById('targetPriceValue').textContent = `$${result.target_price.toFixed(2)}`;
    document.getElementById('riskRewardValue').textContent = result.risk_reward.toFixed(2);
    
    // Create charts
    createEmaChart(result);
    createLevelsChart(result);
    createRiskRewardChart(result);
    
    // Show results
    analysisResults.classList.remove('d-none');
}

/**
 * Create EMA chart
 */
function createEmaChart(result) {
    // Destroy existing chart if it exists
    if (emaChart) {
        emaChart.destroy();
    }
    
    // Create new chart
    const ctx = document.getElementById('emaChart').getContext('2d');
    emaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Current'],
            datasets: [
                {
                    label: 'Price',
                    data: [result.current_price],
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: '#000000'
                },
                {
                    label: '10 EMA',
                    data: [result.market_context.ema10],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: '20 EMA',
                    data: [result.market_context.ema20],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: '50 EMA',
                    data: [result.market_context.ema50],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Price and EMAs'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

/**
 * Create levels chart
 */
function createLevelsChart(result) {
    // Destroy existing chart if it exists
    if (levelsChart) {
        levelsChart.destroy();
    }
    
    // Prepare data
    const labels = [];
    const data = [];
    const backgroundColor = [];
    const borderColor = [];
    
    // Add support levels
    result.key_levels.support.forEach(level => {
        labels.push(`Support $${level.toFixed(2)}`);
        data.push(level);
        backgroundColor.push('rgba(40, 167, 69, 0.2)');
        borderColor.push('#28a745');
    });
    
    // Add current price
    labels.push(`Current $${result.current_price.toFixed(2)}`);
    data.push(result.current_price);
    backgroundColor.push('rgba(0, 0, 0, 0.2)');
    borderColor.push('#000000');
    
    // Add max pain
    if (result.key_levels.max_pain) {
        labels.push(`Max Pain $${result.key_levels.max_pain.toFixed(2)}`);
        data.push(result.key_levels.max_pain);
        backgroundColor.push('rgba(255, 193, 7, 0.2)');
        borderColor.push('#ffc107');
    }
    
    // Add resistance levels
    result.key_levels.resistance.forEach(level => {
        labels.push(`Resistance $${level.toFixed(2)}`);
        data.push(level);
        backgroundColor.push('rgba(220, 53, 69, 0.2)');
        borderColor.push('#dc3545');
    });
    
    // Create new chart
    const ctx = document.getElementById('levelsChart').getContext('2d');
    levelsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price Levels',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Key Price Levels'
                }
            },
            scales: {
                x: {
                    beginAtZero: false
                }
            }
        }
    });
}

/**
 * Create risk/reward chart
 */
function createRiskRewardChart(result) {
    // Destroy existing chart if it exists
    if (riskRewardChart) {
        riskRewardChart.destroy();
    }
    
    // Calculate risk and reward percentages
    const riskPercent = Math.abs(result.stop_loss - result.current_price) / result.current_price * 100;
    const rewardPercent = Math.abs(result.target_price - result.current_price) / result.current_price * 100;
    
    // Create new chart
    const ctx = document.getElementById('riskRewardChart').getContext('2d');
    riskRewardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Risk', 'Reward'],
            datasets: [{
                label: 'Percentage',
                data: [riskPercent, rewardPercent],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.2)',
                    'rgba(40, 167, 69, 0.2)'
                ],
                borderColor: [
                    '#dc3545',
                    '#28a745'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Risk/Reward Analysis'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}