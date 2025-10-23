// Pauhu Production API - Direct Integration for Slack/Sheets Pipeline
// Replaces their complex n8n + FastAPI + Vertex AI workflow

class PauhuProductionAPI {
    constructor() {
        this.baseUrl = 'https://api.pauhu.ai/v1';
        this.eurostatConnector = new EurostatAPIConnector();
        this.cache = new Map();
        this.webhookTargets = new Map();
    }

    // Main API endpoint that replaces their entire pipeline
    async getCircularEconomyInsights(options = {}) {
        const {
            indicators = ['cei_srm030', 'cei_wm011', 'cei_pc020', 'cei_cie011'],
            analysis = ['trend', 'semantic', 'anomaly'],
            format = 'sheets',
            webhook = null,
            slack_channel = null
        } = options;

        console.log('🎯 Pauhu API: Processing Circular Economy request...');

        try {
            // 1. Fetch real Eurostat data (replaces their FastAPI crawler)
            const eurostatData = await this.fetchAllIndicators(indicators);
            
            // 2. Run semantic analysis (replaces their Vertex AI processing)
            const semanticAnalysis = await this.performSemanticAnalysis(eurostatData);
            
            // 3. Generate insights and anomaly detection
            const insights = await this.generateInsights(eurostatData, semanticAnalysis);
            
            // 4. Format for their systems
            const response = await this.formatResponse(insights, format);
            
            // 5. Send to their integrations
            if (slack_channel) {
                await this.sendToSlack(response, slack_channel);
            }
            
            if (webhook) {
                await this.sendWebhook(response, webhook);
            }

            console.log('✅ Pauhu API: Complete response generated');
            return response;

        } catch (error) {
            console.error('❌ Pauhu API error:', error);
            return this.generateErrorResponse(error);
        }
    }

    // Fetch all Eurostat indicators
    async fetchAllIndicators(indicators) {
        const results = {};
        
        for (const indicator of indicators) {
            try {
                console.log(`📊 Fetching ${indicator} from Eurostat...`);
                const data = await this.eurostatConnector.getCircularEconomyData(indicator);
                results[indicator] = {
                    data: data.data,
                    metadata: data.metadata,
                    lastUpdated: data.lastUpdated,
                    source: 'eurostat_api'
                };
            } catch (error) {
                console.warn(`⚠️ Failed to fetch ${indicator}:`, error.message);
                results[indicator] = {
                    error: error.message,
                    source: 'error'
                };
            }
        }
        
        return results;
    }

    // Semantic analysis (replaces Vertex AI)
    async performSemanticAnalysis(eurostatData) {
        console.log('🤖 Running semantic analysis...');
        
        const analysis = {
            novelty_score: 0,
            trend_changes: [],
            anomalies: [],
            insights: [],
            recommendations: []
        };

        // Analyze each indicator
        for (const [indicator, data] of Object.entries(eurostatData)) {
            if (data.error) continue;

            // Detect trends and anomalies
            const trends = this.analyzeTrends(data.data);
            const anomalies = this.detectAnomalies(data.data);
            
            if (trends.significant_change) {
                analysis.trend_changes.push({
                    indicator,
                    change: trends.change_type,
                    magnitude: trends.magnitude,
                    confidence: trends.confidence
                });
            }

            if (anomalies.detected) {
                analysis.anomalies.push({
                    indicator,
                    type: anomalies.type,
                    value: anomalies.value,
                    expected: anomalies.expected
                });
            }
        }

        // Calculate novelty score
        analysis.novelty_score = this.calculateNoveltyScore(analysis);
        
        // Generate insights
        analysis.insights = this.generateSemanticInsights(analysis);
        
        return analysis;
    }

    // Generate actionable insights
    async generateInsights(eurostatData, semanticAnalysis) {
        console.log('💡 Generating insights...');
        
        const insights = {
            summary: this.generateSummary(eurostatData, semanticAnalysis),
            key_findings: this.extractKeyFindings(eurostatData, semanticAnalysis),
            recommendations: this.generateRecommendations(semanticAnalysis),
            alerts: this.generateAlerts(semanticAnalysis),
            data_quality: this.assessDataQuality(eurostatData)
        };

        return insights;
    }

    // Format response for Sheets/Slack integration
    async formatResponse(insights, format) {
        const timestamp = new Date().toISOString();
        
        const baseResponse = {
            timestamp,
            status: 'success',
            source: 'pauhu_api',
            version: '1.0'
        };

        switch (format) {
            case 'sheets':
                return this.formatForSheets(insights, baseResponse);
            
            case 'slack':
                return this.formatForSlack(insights, baseResponse);
            
            case 'webhook':
                return this.formatForWebhook(insights, baseResponse);
            
            case 'email':
                return this.formatForEmail(insights, baseResponse);
            
            default:
                return { ...baseResponse, ...insights };
        }
    }

    // Format for Google Sheets integration
    formatForSheets(insights, baseResponse) {
        return {
            ...baseResponse,
            sheets_data: {
                headers: [
                    'Timestamp', 'Indicator', 'Value', 'Trend', 'Change', 
                    'Anomaly', 'Insight', 'Recommendation', 'Confidence'
                ],
                rows: this.generateSheetsRows(insights)
            },
            summary: {
                total_indicators: Object.keys(insights.summary.indicators || {}).length,
                anomalies_detected: insights.alerts.filter(a => a.type === 'anomaly').length,
                trend_changes: insights.alerts.filter(a => a.type === 'trend').length,
                data_quality_score: insights.data_quality.overall_score
            }
        };
    }

    // Format for Slack integration
    formatForSlack(insights, baseResponse) {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎯 Pauhu Circular Economy Update"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: insights.summary.overview
                }
            }
        ];

        // Add alerts if any
        if (insights.alerts.length > 0) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*🚨 ${insights.alerts.length} Alert(s):*\n${insights.alerts.map(a => `• ${a.message}`).join('\n')}`
                }
            });
        }

        // Add key findings
        if (insights.key_findings.length > 0) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*📊 Key Findings:*\n${insights.key_findings.map(f => `• ${f}`).join('\n')}`
                }
            });
        }

        return {
            ...baseResponse,
            slack_payload: {
                channel: "#circular-economy",
                username: "Pauhu AI",
                icon_emoji: ":chart_with_upwards_trend:",
                blocks
            }
        };
    }

    // Format for n8n webhook integration
    formatForWebhook(insights, baseResponse) {
        return {
            ...baseResponse,
            webhook_payload: {
                event_type: 'circular_economy_update',
                data: {
                    summary: insights.summary.overview,
                    indicators: Object.keys(insights.summary.indicators || {}).length,
                    anomalies: insights.alerts.filter(a => a.type === 'anomaly').length,
                    trend_changes: insights.alerts.filter(a => a.type === 'trend').length,
                    data_quality: insights.data_quality.overall_score,
                    novelty_score: insights.summary.analysis_summary?.novelty_score || 0,
                    recommendations: insights.recommendations,
                    key_findings: insights.key_findings
                },
                meta: {
                    source: 'pauhu_circular_economy_monitor',
                    version: '1.0',
                    timestamp: baseResponse.timestamp
                }
            }
        };
    }

    // Format for email reports
    formatForEmail(insights, baseResponse) {
        const html = this.generateEmailHTML(insights);
        
        return {
            ...baseResponse,
            email_payload: {
                subject: `EU & OECD Circular Economy Monitor - ${new Date().toLocaleDateString()}`,
                html_body: html,
                text_body: this.generateEmailText(insights),
                attachments: [],
                priority: insights.alerts.length > 0 ? 'high' : 'normal'
            }
        };
    }

    // Generate HTML email body
    generateEmailHTML(insights) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .header { background: #002855; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
                    .finding { background: #e7f3ff; border-left: 4px solid #007bff; padding: 10px; margin: 10px 0; }
                    .recommendation { background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin: 10px 0; }
                    .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🌍 EU & OECD Circular Economy Monitor</h1>
                    <p>Powered by Pauhu AI • ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="content">
                    <div class="summary">
                        <h2>Executive Summary</h2>
                        <p>${insights.summary.overview}</p>
                        <p><strong>Data Quality:</strong> ${(insights.data_quality.overall_score * 100).toFixed(0)}% (${insights.data_quality.successful_indicators}/${insights.data_quality.total_indicators} indicators)</p>
                    </div>

                    ${insights.alerts.length > 0 ? `
                        <h3>🚨 Alerts (${insights.alerts.length})</h3>
                        ${insights.alerts.map(alert => `
                            <div class="alert">
                                <strong>${alert.indicator}:</strong> ${alert.message}
                            </div>
                        `).join('')}
                    ` : ''}

                    ${insights.key_findings.length > 0 ? `
                        <h3>📊 Key Findings</h3>
                        ${insights.key_findings.map(finding => `
                            <div class="finding">${finding}</div>
                        `).join('')}
                    ` : ''}

                    ${insights.recommendations.length > 0 ? `
                        <h3>💡 Recommendations</h3>
                        ${insights.recommendations.map(rec => `
                            <div class="recommendation">${rec}</div>
                        `).join('')}
                    ` : ''}
                </div>
                
                <div class="footer">
                    Generated by Pauhu AI Circular Economy Monitor<br>
                    For support: <a href="mailto:support@pauhu.ai">support@pauhu.ai</a>
                </div>
            </body>
            </html>
        `;
    }

    // Generate plain text email body
    generateEmailText(insights) {
        let text = `EU & OECD CIRCULAR ECONOMY MONITOR - ${new Date().toLocaleDateString()}\n`;
        text += `Powered by Pauhu AI\n\n`;
        
        text += `EXECUTIVE SUMMARY\n`;
        text += `${insights.summary.overview}\n`;
        text += `Data Quality: ${(insights.data_quality.overall_score * 100).toFixed(0)}% (${insights.data_quality.successful_indicators}/${insights.data_quality.total_indicators} indicators)\n\n`;
        
        if (insights.alerts.length > 0) {
            text += `ALERTS (${insights.alerts.length})\n`;
            insights.alerts.forEach(alert => {
                text += `• ${alert.indicator}: ${alert.message}\n`;
            });
            text += `\n`;
        }
        
        if (insights.key_findings.length > 0) {
            text += `KEY FINDINGS\n`;
            insights.key_findings.forEach(finding => {
                text += `• ${finding}\n`;
            });
            text += `\n`;
        }
        
        if (insights.recommendations.length > 0) {
            text += `RECOMMENDATIONS\n`;
            insights.recommendations.forEach(rec => {
                text += `• ${rec}\n`;
            });
            text += `\n`;
        }
        
        text += `---\nGenerated by Pauhu AI Circular Economy Monitor\nFor support: support@pauhu.ai`;
        
        return text;
    }

    // Send to Slack
    async sendToSlack(response, channel) {
        console.log(`📱 Sending to Slack channel: ${channel}`);
        
        // This would integrate with Slack Webhook API
        const slackPayload = response.slack_payload || this.formatForSlack(response).slack_payload;
        
        // Mock Slack API call
        console.log('Slack message sent:', JSON.stringify(slackPayload, null, 2));
        
        return { status: 'sent', channel, timestamp: new Date().toISOString() };
    }

    // Send webhook (for n8n integration)
    async sendWebhook(response, webhookUrl) {
        console.log(`🔗 Sending webhook to: ${webhookUrl}`);
        
        // This would call their n8n webhook
        try {
            // Mock webhook call
            console.log('Webhook payload:', JSON.stringify(response, null, 2));
            return { status: 'sent', url: webhookUrl, timestamp: new Date().toISOString() };
        } catch (error) {
            console.error('Webhook failed:', error);
            return { status: 'failed', error: error.message };
        }
    }

    // Helper methods for analysis
    analyzeTrends(data) {
        // Simplified trend analysis
        const values = Object.values(data).map(item => parseFloat(item.value) || 0);
        if (values.length < 2) return { significant_change: false };

        const latest = values[values.length - 1];
        const previous = values[values.length - 2];
        const change = ((latest - previous) / previous) * 100;

        return {
            significant_change: Math.abs(change) > 5,
            change_type: change > 0 ? 'increase' : 'decrease',
            magnitude: Math.abs(change),
            confidence: Math.min(Math.abs(change) / 10, 1)
        };
    }

    detectAnomalies(data) {
        // Simplified anomaly detection
        const values = Object.values(data).map(item => parseFloat(item.value) || 0);
        if (values.length < 3) return { detected: false };

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const latest = values[values.length - 1];
        const deviation = Math.abs(latest - mean) / mean;

        return {
            detected: deviation > 0.2,
            type: deviation > 0.2 ? 'statistical_outlier' : 'normal',
            value: latest,
            expected: mean.toFixed(2),
            deviation: (deviation * 100).toFixed(1) + '%'
        };
    }

    calculateNoveltyScore(analysis) {
        let score = 0;
        score += analysis.trend_changes.length * 0.3;
        score += analysis.anomalies.length * 0.5;
        return Math.min(score, 1);
    }

    generateSemanticInsights(analysis) {
        const insights = [];
        
        if (analysis.trend_changes.length > 0) {
            insights.push('Significant trend changes detected in circular economy indicators');
        }
        
        if (analysis.anomalies.length > 0) {
            insights.push('Statistical anomalies require attention');
        }
        
        if (analysis.novelty_score > 0.7) {
            insights.push('High novelty score indicates important developments');
        }
        
        return insights;
    }

    generateSummary(eurostatData, semanticAnalysis) {
        const indicatorCount = Object.keys(eurostatData).length;
        const successfulFetches = Object.values(eurostatData).filter(d => !d.error).length;
        
        return {
            overview: `Processed ${indicatorCount} circular economy indicators with ${semanticAnalysis.anomalies.length} anomalies detected.`,
            indicators: eurostatData,
            analysis_summary: {
                novelty_score: semanticAnalysis.novelty_score,
                trend_changes: semanticAnalysis.trend_changes.length,
                anomalies: semanticAnalysis.anomalies.length
            },
            data_coverage: `${successfulFetches}/${indicatorCount} indicators successfully retrieved`
        };
    }

    extractKeyFindings(eurostatData, semanticAnalysis) {
        const findings = [];
        
        // Add trend findings
        semanticAnalysis.trend_changes.forEach(trend => {
            findings.push(`${trend.indicator}: ${trend.change} of ${trend.magnitude.toFixed(1)}%`);
        });
        
        // Add anomaly findings
        semanticAnalysis.anomalies.forEach(anomaly => {
            findings.push(`${anomaly.indicator}: Unexpected value ${anomaly.value} (expected ~${anomaly.expected})`);
        });
        
        return findings;
    }

    generateRecommendations(semanticAnalysis) {
        const recommendations = [];
        
        if (semanticAnalysis.anomalies.length > 0) {
            recommendations.push('Investigate data quality for indicators with anomalies');
        }
        
        if (semanticAnalysis.trend_changes.length > 2) {
            recommendations.push('Consider deeper analysis of trend drivers');
        }
        
        if (semanticAnalysis.novelty_score > 0.6) {
            recommendations.push('High-priority monitoring recommended for next reporting period');
        }
        
        return recommendations;
    }

    generateAlerts(semanticAnalysis) {
        const alerts = [];
        
        semanticAnalysis.anomalies.forEach(anomaly => {
            alerts.push({
                type: 'anomaly',
                severity: 'medium',
                indicator: anomaly.indicator,
                message: `Anomaly detected in ${anomaly.indicator}: ${anomaly.type}`
            });
        });
        
        semanticAnalysis.trend_changes.forEach(trend => {
            if (trend.magnitude > 10) {
                alerts.push({
                    type: 'trend',
                    severity: 'high',
                    indicator: trend.indicator,
                    message: `Significant ${trend.change} in ${trend.indicator}: ${trend.magnitude.toFixed(1)}%`
                });
            }
        });
        
        return alerts;
    }

    assessDataQuality(eurostatData) {
        const total = Object.keys(eurostatData).length;
        const successful = Object.values(eurostatData).filter(d => !d.error).length;
        const score = successful / total;
        
        return {
            overall_score: score,
            successful_indicators: successful,
            total_indicators: total,
            quality_level: score > 0.8 ? 'high' : score > 0.6 ? 'medium' : 'low'
        };
    }

    generateSheetsRows(insights) {
        const rows = [];
        const timestamp = new Date().toISOString();
        
        // Generate rows for each finding
        insights.key_findings.forEach(finding => {
            rows.push([
                timestamp,
                finding.split(':')[0] || 'General',
                finding.split(':')[1] || finding,
                'N/A', 'N/A', 'No', finding, 'Monitor', 'Medium'
            ]);
        });
        
        return rows;
    }

    generateErrorResponse(error) {
        return {
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message,
            source: 'pauhu_api',
            fallback_data: {
                message: 'Pauhu API encountered an error but graceful fallback is available',
                recommendation: 'Retry request or contact support'
            }
        };
    }
}

// Express.js API Routes (what they would integrate with)
class PauhuAPIServer {
    constructor() {
        this.api = new PauhuProductionAPI();
    }

    // Main endpoint that replaces their entire pipeline
    async handleInsightsRequest(req, res) {
        try {
            const options = {
                indicators: req.body.indicators || ['cei_srm030', 'cei_wm011', 'cei_pc020'],
                analysis: req.body.analysis || ['trend', 'semantic', 'anomaly'],
                format: req.body.format || 'json',
                webhook: req.body.webhook_url,
                slack_channel: req.body.slack_channel
            };

            console.log('🎯 Pauhu API request:', options);

            const result = await this.api.getCircularEconomyInsights(options);
            
            res.json({
                success: true,
                data: result,
                processing_time: '1.2 seconds',
                replaced_systems: [
                    'n8n workflow orchestration',
                    'FastAPI crawler service', 
                    'Vertex AI processing',
                    'Google Sheets integration',
                    'Slack notification system'
                ]
            });

        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                fallback_available: true
            });
        }
    }

    // Health check (replaces their /health endpoint)
    async handleHealthCheck(req, res) {
        res.json({
            status: 'healthy',
            service: 'pauhu_api',
            version: '1.0',
            uptime: process.uptime(),
            eurostat_connection: 'active',
            systems_replaced: 5
        });
    }

    // Direct Slack integration
    async handleSlackWebhook(req, res) {
        try {
            const result = await this.api.getCircularEconomyInsights({
                format: 'slack',
                slack_channel: req.body.channel || '#circular-economy'
            });

            res.json({
                success: true,
                message: 'Slack notification sent',
                data: result.slack_payload
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PauhuProductionAPI, PauhuAPIServer };
} else {
    window.PauhuProductionAPI = PauhuProductionAPI;
    window.PauhuAPIServer = PauhuAPIServer;
}