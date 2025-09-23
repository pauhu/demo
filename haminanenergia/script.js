// Hamina Energy Demo - Alpine.js Application
const BASE_URL = "https://api.pauhu.ai/v1";

function haminaApp() {
    return {
        // Auth state
        isAuthenticated: false,
        user: null,
        
        // Dashboard data
        currentLoad: 1245,
        renewablePercentage: 73,
        peakDemand: 1890,
        lowDemand: 980,
        insights: [],
        
        // Charts
        charts: {},
        
        async init() {
            // Check if already authenticated
            const token = localStorage.getItem('pauhu_token');
            if (token) {
                await this.validateToken(token);
            }
            
            // Initialize demo data
            this.loadDemoData();
            
            // Setup HTMX error handling
            document.body.addEventListener('htmx:responseError', (evt) => {
                console.error('HTMX Error:', evt.detail);
                this.showNotification('Error loading data', 'error');
            });
            
            // Setup real-time updates if authenticated
            if (this.isAuthenticated) {
                this.initializeCharts();
                this.startRealtimeUpdates();
            }
        },
        
        async login() {
            // Redirect to OIDC provider
            window.location.href = buildAuthUrl();
        },
        
        logout() {
            localStorage.removeItem('pauhu_token');
            localStorage.removeItem('pauhu_user');
            this.isAuthenticated = false;
            this.user = null;
            window.location.href = '/haminanenergia/';
        },
        
        async validateToken(token) {
            try {
                const response = await fetch(`${BASE_URL}/auth/validate`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    this.isAuthenticated = true;
                    this.user = userData;
                    localStorage.setItem('pauhu_user', JSON.stringify(userData));
                    return true;
                } else {
                    localStorage.removeItem('pauhu_token');
                    return false;
                }
            } catch (error) {
                console.error('Token validation failed:', error);
                return false;
            }
        },
        
        loadDemoData() {
            // Generate demo insights
            this.insights = [
                {
                    id: 1,
                    title: "Optimize Wind Power Usage",
                    description: "Wind generation is peaking. Recommend shifting 15% load to wind sources.",
                    savings: "12,500"
                },
                {
                    id: 2,
                    title: "Peak Demand Alert",
                    description: "Expected peak at 14:00. Pre-cool industrial facilities to reduce load.",
                    savings: "8,300"
                },
                {
                    id: 3,
                    title: "Solar Efficiency Opportunity",
                    description: "Clear weather forecast. Maximize solar panel angle adjustment.",
                    savings: "5,700"
                }
            ];
            
            // Update metrics with some randomness
            setInterval(() => {
                this.currentLoad = Math.floor(1200 + Math.random() * 200);
                this.renewablePercentage = Math.floor(65 + Math.random() * 20);
            }, 5000);
        },
        
        initializeCharts() {
            // Load Chart
            const loadCtx = document.getElementById('loadChart');
            if (loadCtx) {
                this.charts.load = new Chart(loadCtx, {
                    type: 'line',
                    data: {
                        labels: this.generateTimeLabels(24),
                        datasets: [{
                            label: 'Grid Load (MW)',
                            data: this.generateLoadData(24),
                            borderColor: 'rgb(99, 102, 241)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: 800,
                                max: 2000
                            }
                        }
                    }
                });
            }
            
            // Energy Mix Chart
            const mixCtx = document.getElementById('mixChart');
            if (mixCtx) {
                this.charts.mix = new Chart(mixCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Wind', 'Solar', 'Hydro', 'Natural Gas'],
                        datasets: [{
                            data: [35, 28, 10, 27],
                            backgroundColor: [
                                'rgb(34, 197, 94)',
                                'rgb(251, 191, 36)',
                                'rgb(59, 130, 246)',
                                'rgb(156, 163, 175)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
            
            // Prediction Chart
            const predictionCtx = document.getElementById('predictionChart');
            if (predictionCtx) {
                this.charts.prediction = new Chart(predictionCtx, {
                    type: 'line',
                    data: {
                        labels: this.generateTimeLabels(48, true),
                        datasets: [{
                            label: 'Predicted Demand',
                            data: this.generatePredictionData(48),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderDash: [5, 5]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: 800,
                                max: 2000
                            }
                        }
                    }
                });
            }
        },
        
        startRealtimeUpdates() {
            // Simulate real-time data updates
            setInterval(() => {
                // Update load chart with new data point
                if (this.charts.load) {
                    const data = this.charts.load.data;
                    data.labels.shift();
                    data.labels.push(new Date().toLocaleTimeString());
                    data.datasets[0].data.shift();
                    data.datasets[0].data.push(this.currentLoad);
                    this.charts.load.update();
                }
                
                // Update energy mix
                if (this.charts.mix) {
                    const renewable = this.renewablePercentage;
                    const wind = Math.floor(renewable * 0.48);
                    const solar = Math.floor(renewable * 0.38);
                    const hydro = Math.floor(renewable * 0.14);
                    const gas = 100 - renewable;
                    
                    this.charts.mix.data.datasets[0].data = [wind, solar, hydro, gas];
                    this.charts.mix.update();
                }
            }, 5000);
        },
        
        generateTimeLabels(hours, future = false) {
            const labels = [];
            const now = new Date();
            
            for (let i = hours; i > 0; i--) {
                const time = new Date(now.getTime() + (future ? i : -i) * 60 * 60 * 1000);
                labels.push(time.toLocaleTimeString([], { hour: '2-digit' }));
            }
            
            return future ? labels.reverse() : labels;
        },
        
        generateLoadData(points) {
            const data = [];
            for (let i = 0; i < points; i++) {
                data.push(Math.floor(1000 + Math.random() * 800 + Math.sin(i / 4) * 200));
            }
            return data;
        },
        
        generatePredictionData(points) {
            const data = [];
            const baseLoad = 1200;
            
            for (let i = 0; i < points; i++) {
                // Simulate daily pattern with peaks
                const hourOfDay = i % 24;
                let load = baseLoad;
                
                // Morning peak (7-9)
                if (hourOfDay >= 7 && hourOfDay <= 9) {
                    load += 400;
                }
                // Evening peak (17-20)
                else if (hourOfDay >= 17 && hourOfDay <= 20) {
                    load += 600;
                }
                // Night low (23-5)
                else if (hourOfDay >= 23 || hourOfDay <= 5) {
                    load -= 200;
                }
                
                // Add some randomness
                load += Math.floor(Math.random() * 100 - 50);
                
                data.push(load);
            }
            
            return data;
        },
        
        showNotification(message, type = 'info') {
            // Simple notification (could be replaced with a toast library)
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 px-6 py-3 rounded shadow-lg ${
                type === 'error' ? 'bg-red-500' : 'bg-green-500'
            } text-white`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    };
}

// HTMX Extensions for authenticated requests
htmx.on("htmx:configRequest", (evt) => {
    const token = localStorage.getItem('pauhu_token');
    if (token) {
        evt.detail.headers['Authorization'] = `Bearer ${token}`;
    }
});

// Handle auth callback
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Exchange code for token
        try {
            const token = await exchangeCodeForToken(code);
            if (token) {
                localStorage.setItem('pauhu_token', token);
                // Remove code from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Reload to initialize authenticated state
                window.location.reload();
            }
        } catch (error) {
            console.error('Authentication failed:', error);
        }
    }
});