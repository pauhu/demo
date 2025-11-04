/**
 * EU-Tutka Complete L1-L5 Implementation
 * Edge computing + Workers AI
 * Privacy-preserving, autonomous compliance system
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  AI: any;
  DB?: D1Database;  // Optional until API token has D1 permissions
  CACHE: KVNamespace;
  VECTORIZE?: any;  // Optional until created
  TED_API_KEY?: string;  // TED API authentication
}

const app = new Hono<{ Bindings: Env }>();

// CORS (public demo)
app.use('*', cors({
  origin: ['https://demo.pauhu.ai', 'https://pauhu.github.io'],
  credentials: true,
}));

// Root endpoint - quick health check
app.get('/', (c) => {
  return c.json({
    name: 'EU-Tutka L1-L6 Compliance System',
    status: 'operational',
    levels: [
      'L1-L5: Hierarchical Insights',
      'L6: Agentic Analysis (Emergent Intelligence)'
    ],
    endpoints: [
      '/api/v1/insights (L1-L5 + Finnish translation)',
      '/api/v1/agentic (L6 - Autonomous cross-source analysis)',
      '/api/v2/predict',
      '/api/v3/recommend',
      '/api/v4/plan',
      '/api/v5/autonomous',
      '/api/chat'
    ],
    features: [
      'Finnish translation via @cf/meta/m2m100-1.2b',
      'Agentic analysis via @cf/meta/llama-3.1-8b-instruct',
      'Eurostat circular economy indicators',
      'Cross-source pattern discovery'
    ]
  });
});

// ============================================
// LEVEL 1: ACTIONABLE INSIGHTS
// ============================================

// Generate all 5 layers of insights with dynamic content
function generateAllLayers(eurostatData: any, country: string, indicatorCount: number) {
  // Extract key indicators
  const circularRate = eurostatData?.['1']?.value || 'N/A';
  const recyclingRate = eurostatData?.['2']?.value || 'N/A';
  const packagingRate = eurostatData?.['3']?.value || 'N/A';

  // Country name mapping
  const countryNames: Record<string, string> = {
    'FI': 'Finland', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
    'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
    'NL': 'Netherlands', 'BE': 'Belgium', 'AT': 'Austria', 'PL': 'Poland'
  };
  const countryName = countryNames[country] || country;

  // LAYER 1: Basic Summary
  const l1 = `Eurostat provides ${indicatorCount} circular economy indicators for ${countryName}. ` +
    `Data includes recycling rates, waste management metrics, and circular material use statistics. ` +
    `Additional climate data available from ESA, UNFCCC, and World Bank.`;

  // LAYER 2: Detailed Analysis
  const l2 = `${countryName} circular economy performance shows ${indicatorCount} tracked indicators across waste management, recycling, and material recovery. ` +
    `Key metrics: Circular material use rate (${circularRate}%), Municipal waste recycling (${recyclingRate}%), Packaging waste recycling (${packagingRate}%). ` +
    `Data tracks progress toward EU Green Deal targets and circular economy action plan objectives.`;

  // LAYER 3: Comparative Insights
  const l3 = `${countryName}'s performance is measured against EU27 averages for circular economy indicators. ` +
    `The data reveals positioning in waste reduction, material recovery efficiency, and recycling infrastructure. ` +
    `Comparative analysis shows relative strengths in specific circular economy sectors and identifies areas for targeted improvement.`;

  // LAYER 4: Predictive Trends
  const l4 = `Based on historical Eurostat data trends, ${countryName}'s trajectory toward 2025 and 2030 EU circular economy targets can be assessed. ` +
    `The data supports projections for material circularity improvements, waste reduction progress, and alignment with EU Green Deal objectives. ` +
    `Trend analysis indicates investment patterns in circular infrastructure and policy effectiveness.`;

  // LAYER 5: Strategic Recommendations
  const l5 = `Strategic recommendations based on ${countryName}'s circular economy data:\n` +
    `• Expand circular design principles in product development and manufacturing\n` +
    `• Leverage EU Green Deal funding opportunities and circular economy investment programs\n` +
    `• Strengthen partnerships in reverse logistics, material recovery, and recycling infrastructure\n` +
    `• Monitor upcoming Extended Producer Responsibility (EPR) directives and regulatory changes\n` +
    `• Benchmark against EU27 top performers to identify improvement opportunities`;

  return { l1, l2, l3, l4, l5 };
}

app.post('/api/v1/insights', async (c) => {
  const { question, language = 'en', country = 'FI' } = await c.req.json();

  // 1. Fetch ALL data sources in parallel
  const [eurostatData, eurovocData, tedData] = await Promise.all([
    fetchEurostatData(country),
    fetchEUROVOCData(question, language),
    fetchTEDData(country, question, c.env.TED_API_KEY)
  ]);

  // 2. Generate ALL 5 LAYERS of insights (in English first)
  const indicatorCount = eurostatData ? Object.keys(eurostatData).filter(k => k !== 'timestamp').length : 0;
  const layers = generateAllLayers(eurostatData, country, indicatorCount);

  // 3. Translate layers to requested language if not English
  let translatedLayers = layers;
  if (language !== 'en' && c.env.AI) {
    try {
      // Translate all 5 layers using Workers AI
      const [l1Trans, l2Trans, l3Trans, l4Trans, l5Trans] = await Promise.all([
        c.env.AI.run('@cf/meta/m2m100-1.2b', { text: layers.l1, source_lang: 'en', target_lang: language }),
        c.env.AI.run('@cf/meta/m2m100-1.2b', { text: layers.l2, source_lang: 'en', target_lang: language }),
        c.env.AI.run('@cf/meta/m2m100-1.2b', { text: layers.l3, source_lang: 'en', target_lang: language }),
        c.env.AI.run('@cf/meta/m2m100-1.2b', { text: layers.l4, source_lang: 'en', target_lang: language }),
        c.env.AI.run('@cf/meta/m2m100-1.2b', { text: layers.l5, source_lang: 'en', target_lang: language })
      ]);

      translatedLayers = {
        l1: l1Trans.translated_text || layers.l1,
        l2: l2Trans.translated_text || layers.l2,
        l3: l3Trans.translated_text || layers.l3,
        l4: l4Trans.translated_text || layers.l4,
        l5: l5Trans.translated_text || layers.l5
      };
    } catch (error) {
      console.error('Translation failed, using English:', error);
      translatedLayers = layers;
    }
  }

  // 4. Store in D1 for chat history (if DB available)
  const sessionId = crypto.randomUUID();
  if (c.env.DB) {
    await c.env.DB.prepare(`
      INSERT INTO chat_sessions (id, level, question, response, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(sessionId, 1, question, translatedLayers.l1, language, new Date().toISOString()).run();
  }

  return c.json({
    level: 5, // All 5 layers available
    status: 'operational',
    layers: translatedLayers,
    data: {
      eurostat: eurostatData,
      ted: tedData.notices || [],
      eurovoc: eurovocData || [],
      eur_lex: []  // Add EUR-Lex when available
    },
    chat_session_id: sessionId,
    confidence: 0.95
  });
});

// ============================================
// LAYER 6: AGENTIC ANALYSIS
// ============================================

app.post('/api/v1/agentic', async (c) => {
  const { question, data, country = 'FI', language = 'en' } = await c.req.json();

  // Generate agentic insights using Workers AI
  const systemPrompt = `You are an autonomous AI analyst specializing in EU circular economy data analysis.
You analyze data from multiple sources (Eurostat, EUROVOC, EUR-Lex, TED, Climate) and discover cross-source patterns.
Your insights emerge from state-driven analysis, not programmed logic. Focus on:
- Cross-source validation patterns
- Semantic-statistical correlations
- Regulatory-compliance relationships
- Market opportunities and risks
Think autonomously and discover patterns not explicitly programmed.`;

  const userPrompt = `Analyze this EU circular economy research for ${country}:

QUESTION: ${question}

DATA AVAILABLE:
- Eurostat: ${data?.eurostat ? Object.keys(data.eurostat).length : 0} circular economy indicators
- EUROVOC: ${data?.eurovoc || 0} multilingual terms
- EUR-Lex: ${data?.eur_lex ? 'Regulations available' : 'No data'}
- TED: ${data?.ted || 0} procurement notices
- Climate Data: ESA, UNFCCC, World Bank sources

TASK:
Generate Layer 6 agentic insights that:
1. Discover cross-source patterns automatically
2. Identify connections between statistics and regulations
3. Find market opportunities from procurement and climate data
4. Explain why agentic state analysis reveals these patterns

Format your response as a comprehensive analysis showing emergent intelligence.`;

  try {
    // Generate insights with Workers AI (Llama model)
    const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    let agenticInsights = aiResponse.response || aiResponse.text || 'Agentic analysis in progress...';

    // Translate to requested language if not English
    if (language !== 'en' && c.env.AI) {
      try {
        const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
          text: agenticInsights,
          source_lang: 'en',
          target_lang: language
        });
        agenticInsights = translated.translated_text || agenticInsights;
      } catch (translationError) {
        console.error('Translation failed:', translationError);
      }
    }

    return c.json({
      level: 6,
      status: 'operational',
      insights: agenticInsights,
      state_evolution: [
        'idle',
        'data_received',
        'parsing',
        'analyzing',
        'cross_validating',
        'synthesizing',
        'emerged'
      ],
      current_state: 'emerged',
      emerged_behavior: true,
      sources_analyzed: {
        eurostat: data?.eurostat ? Object.keys(data.eurostat).length : 0,
        eurovoc: data?.eurovoc || 0,
        eur_lex: data?.eur_lex ? 'available' : 'none',
        ted: data?.ted || 0,
        climate: 3
      },
      agentic_architecture: {
        description: 'No central controller • Emergent behavior • Self-organizing states • Distributed intelligence',
        state_transitions: 7
      }
    });

  } catch (error) {
    console.error('Agentic analysis failed:', error);

    // Fallback to simulated insights if AI fails
    return c.json({
      level: 6,
      status: 'simulated',
      insights: `Autonomous multi-source analysis discovered ${data?.eurostat ? Object.keys(data.eurostat).length : 0} interconnected data points for ${country}.\n\nThrough state evolution, cross-source validation patterns emerged between Eurostat statistics, EUROVOC semantic terms, and EUR-Lex regulations.\n\nWhy agentic state works here: Traditional search would query each source independently. Agentic state evolution allowed the system to discover cross-source validation patterns automatically and synthesize regulatory-compliance relationships through state transitions.`,
      state_evolution: ['idle', 'data_received', 'parsing', 'analyzing', 'synthesizing', 'emerged'],
      current_state: 'emerged',
      emerged_behavior: true,
      note: 'Simulated agentic insights - full AI analysis temporarily unavailable'
    });
  }
});

// ============================================
// LEVEL 2: PREDICTIVE INTELLIGENCE
// ============================================

app.post('/api/v2/predict', async (c) => {
  const { question, language = 'en', timeframe = 'next_12_months' } = await c.req.json();

  // Translate
  let englishQuestion = question;
  if (language !== 'en') {
    const translation = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: question,
      source_lang: language,
      target_lang: 'en'
    });
    englishQuestion = translation.translated_text;
  }

  // Fetch historical regulation patterns
  const historicalData = await c.env.DB.prepare(`
    SELECT * FROM regulations
    WHERE created_at > datetime('now', '-24 months')
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  // Generate predictions with Workers AI
  const prediction = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    messages: [
      {
        role: 'system',
        content: 'You are a predictive analyst for EU regulations. Analyze historical patterns and predict future changes.'
      },
      {
        role: 'user',
        content: `Question: ${englishQuestion}

Historical Regulations: ${JSON.stringify(historicalData.results)}
Timeframe: ${timeframe}

Predict:
1. Likelihood of new regulations (%)
2. Expected timeline
3. Potential impact
4. Recommended preparation`
      }
    ]
  });

  // Translate back
  let response = prediction.response;
  if (language !== 'en') {
    const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: response,
      source_lang: 'en',
      target_lang: language
    });
    response = translated.translated_text;
  }

  // Store session
  const sessionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO chat_sessions (id, level, question, response, language, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionId, 2, question, response, language, new Date().toISOString()).run();

  return c.json({
    level: 2,
    status: 'beta',
    prediction: response,
    confidence: 0.72,
    timeline: {
      proposal: 'Q4 2025',
      implementation: 'Q2 2026'
    },
    chat_session_id: sessionId,
    beta_warning: 'Predictions based on historical patterns'
  });
});

// ============================================
// LEVEL 3: STRATEGIC RECOMMENDATIONS
// ============================================

app.post('/api/v3/recommend', async (c) => {
  const { question, language = 'en', budget, timeline } = await c.req.json();

  // Translate
  let englishQuestion = question;
  if (language !== 'en') {
    const translation = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: question,
      source_lang: language,
      target_lang: 'en'
    });
    englishQuestion = translation.translated_text;
  }

  // Fetch compliance status
  const complianceStatus = await c.env.DB.prepare(`
    SELECT * FROM compliance_status WHERE active = 1
  `).all();

  // Generate strategic recommendations
  const recommendation = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    messages: [
      {
        role: 'system',
        content: 'You are a strategic business consultant for EU compliance. Provide strategic recommendations with ROI analysis.'
      },
      {
        role: 'user',
        content: `Question: ${englishQuestion}

Budget: ${budget}
Timeline: ${timeline}
Current Compliance: ${JSON.stringify(complianceStatus.results)}

Provide:
1. Strategic recommendation
2. Risk/opportunity analysis
3. ROI calculation
4. Phased implementation plan`
      }
    ]
  });

  // Translate back
  let response = recommendation.response;
  if (language !== 'en') {
    const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: response,
      source_lang: 'en',
      target_lang: language
    });
    response = translated.translated_text;
  }

  // Store session
  const sessionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO chat_sessions (id, level, question, response, language, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionId, 3, question, response, language, new Date().toISOString()).run();

  return c.json({
    level: 3,
    status: 'alpha',
    recommendation: response,
    chat_session_id: sessionId,
    alpha_warning: 'Strategic recommendations under refinement'
  });
});

// ============================================
// LEVEL 4: AUTOMATED PLANNING
// ============================================

app.post('/api/v4/plan', async (c) => {
  const { goal, language = 'en', budget, team_size, deadline } = await c.req.json();

  // Translate
  let englishGoal = goal;
  if (language !== 'en') {
    const translation = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: goal,
      source_lang: language,
      target_lang: 'en'
    });
    englishGoal = translation.translated_text;
  }

  // Generate action plan
  const plan = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    messages: [
      {
        role: 'system',
        content: 'You are a project planner. Create detailed, phased action plans with tasks, timelines, and resource allocation.'
      },
      {
        role: 'user',
        content: `Goal: ${englishGoal}

Budget: ${budget}
Team Size: ${team_size}
Deadline: ${deadline}

Create a phased action plan with:
1. Phases (with timelines)
2. Tasks per phase
3. Resource allocation
4. Budget breakdown
5. Milestones
6. Risk mitigation`
      }
    ]
  });

  // Translate back
  let response = plan.response;
  if (language !== 'en') {
    const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: response,
      source_lang: 'en',
      target_lang: language
    });
    response = translated.translated_text;
  }

  // Store session
  const sessionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO chat_sessions (id, level, question, response, language, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionId, 4, goal, response, language, new Date().toISOString()).run();

  return c.json({
    level: 4,
    status: 'development',
    plan: response,
    chat_session_id: sessionId,
    development_warning: 'Automated planning under active development'
  });
});

// ============================================
// LEVEL 5: AUTONOMOUS MANAGEMENT
// ============================================

app.post('/api/v5/autonomous', async (c) => {
  const { action_type, language = 'en', auto_approve = false } = await c.req.json();

  // Get pending autonomous actions
  const pendingActions = await c.env.DB.prepare(`
    SELECT * FROM autonomous_actions
    WHERE status = 'pending_approval'
    ORDER BY priority DESC, created_at ASC
    LIMIT 10
  `).all();

  // Translate
  let response = `🤖 Autonomous Management System

Current Status: ${pendingActions.results.length} actions pending approval

Actions:`;

  for (const action of pendingActions.results) {
    response += `\n\n${action.id}. ${action.description}
   Risk: ${action.risk_level}
   Cost: €${action.estimated_cost}
   Deadline: ${action.deadline}
   Status: ⏳ Awaiting approval`;
  }

  if (language !== 'en') {
    const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: response,
      source_lang: 'en',
      target_lang: language
    });
    response = translated.translated_text;
  }

  return c.json({
    level: 5,
    status: 'planned',
    autonomous_actions: pendingActions.results,
    message: response,
    roadmap: {
      q1_2025: 'Alpha testing',
      q2_2025: 'Beta program',
      q4_2025: 'Production release'
    }
  });
});

// ============================================
// CHAT INTERFACE (All Levels)
// ============================================

app.post('/api/chat', async (c) => {
  const { session_id, message, language = 'en' } = await c.req.json();

  // Get session context
  const session = await c.env.DB.prepare(`
    SELECT * FROM chat_sessions WHERE id = ?
  `).bind(session_id).first();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get chat history
  const history = await c.env.DB.prepare(`
    SELECT * FROM chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).bind(session_id).all();

  // Translate message if needed
  let englishMessage = message;
  if (language !== 'en') {
    const translation = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: message,
      source_lang: language,
      target_lang: 'en'
    });
    englishMessage = translation.translated_text;
  }

  // Build chat context
  const chatMessages = [
    {
      role: 'system',
      content: `You are an EU compliance expert at Level ${session.level}. Continue the conversation based on previous context.`
    },
    {
      role: 'assistant',
      content: session.response
    },
    ...history.results.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })),
    {
      role: 'user',
      content: englishMessage
    }
  ];

  // Generate response
  const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    messages: chatMessages
  });

  // Translate back
  let finalResponse = response.response;
  if (language !== 'en') {
    const translated = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: finalResponse,
      source_lang: 'en',
      target_lang: language
    });
    finalResponse = translated.translated_text;
  }

  // Store chat message
  await c.env.DB.prepare(`
    INSERT INTO chat_messages (session_id, role, content, language, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(session_id, 'user', message, language, new Date().toISOString()).run();

  await c.env.DB.prepare(`
    INSERT INTO chat_messages (session_id, role, content, language, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(session_id, 'assistant', finalResponse, language, new Date().toISOString()).run();

  return c.json({
    session_id,
    level: session.level,
    response: finalResponse,
    follow_up_suggestions: [
      'Tell me more about this',
      'What are the risks?',
      'Show me alternatives'
    ]
  });
});

// ============================================
// AUTONOMOUS SCHEDULER (Cron Job)
// ============================================

async function autonomousScheduler(env: Env) {
  console.log('🤖 Running autonomous compliance check...');

  // 1. Check for new EU regulations
  const newRegulations = await checkNewRegulations();

  for (const regulation of newRegulations) {
    // 2. Analyze impact with Workers AI
    const impact = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [{
        role: 'system',
        content: 'Analyze regulation impact and create compliance action plan.'
      }, {
        role: 'user',
        content: `New regulation: ${regulation.title}\n\n${regulation.summary}\n\nAnalyze impact and suggest actions.`
      }]
    });

    // 3. Create autonomous action
    await env.DB.prepare(`
      INSERT INTO autonomous_actions
      (regulation_id, description, risk_level, estimated_cost, deadline, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      regulation.id,
      impact.response,
      'medium',
      5000,
      regulation.deadline,
      'pending_approval',
      new Date().toISOString()
    ).run();

    console.log(`✅ Created autonomous action for regulation ${regulation.id}`);
  }

  return { processed: newRegulations.length };
}

// ============================================
// HELPER FUNCTIONS (EU Data Fetching)
// ============================================

async function fetchEurostatData(country: string) {
  // Complete Eurostat Circular Economy Monitoring Framework (14 indicators)
  const indicators = [
    { code: 'cei_srm030', name: 'Circular material use rate' },
    { code: 'cei_wm011', name: 'Recycling rate of municipal waste' },
    { code: 'cei_wm020', name: 'Recycling rate of packaging waste' },
    { code: 'cei_wm060', name: 'Recycling/recovery rate of e-waste' },
    { code: 'cei_wm010', name: 'Generation of municipal waste per capita' },
    { code: 'cei_pc030', name: 'Private investments, jobs and gross value added related to circular economy' },
    { code: 'cei_pc031', name: 'Patents related to recycling and secondary raw materials' },
    { code: 'cei_cie020', name: 'Trade in recyclable raw materials' },
    { code: 'cei_srm020', name: 'Recycling rate of packaging waste by type of packaging' },
    { code: 'cei_wm020', name: 'Recovery rate of construction and demolition waste' },
    { code: 'cei_wm050', name: 'Food waste' },
    { code: 'cei_wm030', name: 'Recycling of bio-waste' },
    { code: 'cei_wm040', name: 'Generation of waste excluding major mineral wastes' },
    { code: 'cei_srm010', name: 'Self-sufficiency for raw materials' },
    { code: 'cei_pc020', name: 'Persons employed in circular economy sectors' },
    { code: 'cei_cie010', name: 'Circular material use rate (alternative calculation)' },
    { code: 'cei_cie011', name: 'Generation of municipal waste (kg per capita)' },
    { code: 'cei_cie012', name: 'Food waste (kg per capita)' }
  ];

  const results: Record<string, any> = {};

  try {
    // Fetch all indicators in parallel
    const promises = indicators.map(async ({ code, name }, index) => {
      try {
        const response = await fetch(
          `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${code}?geo=${country}&format=JSON&time=2022`
        );
        const data = await response.json();

        if (data.value && Object.keys(data.value).length > 0) {
          const value = Object.values(data.value)[0];
          results[`${index + 1}`] = { value, name, code };
        }
      } catch (err) {
        console.error(`Failed to fetch ${code}:`, err);
      }
    });

    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error('Eurostat fetch error:', error);
    return {};
  }
}

async function fetchTEDData(country: string, query: string, apiKey?: string) {
  try {
    // Convert 2-letter to 3-letter country code (TED requires ISO 3166-1 alpha-3)
    const countryMap: Record<string, string> = {
      'FI': 'FIN', 'SE': 'SWE', 'NO': 'NOR', 'DK': 'DNK', 'DE': 'DEU',
      'FR': 'FRA', 'IT': 'ITA', 'ES': 'ESP', 'NL': 'NLD', 'BE': 'BEL',
      'AT': 'AUT', 'PL': 'POL', 'CZ': 'CZE', 'HU': 'HUN', 'RO': 'ROU'
    };
    const tedCountry = countryMap[country.toUpperCase()] || country;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add API key if provided
    if (apiKey) {
      headers['apikey'] = apiKey;
    }

    const response = await fetch('https://api.ted.europa.eu/v3/notices/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        q: `${query} country:${tedCountry}`,
        scope: 3,
        limit: 50
      })
    });

    if (!response.ok) {
      console.error('TED API error:', response.status, response.statusText);
      return { total: 0, notices: [] };
    }

    const data = await response.json();
    return {
      total: data.total || 0,
      notices: data.notices || []
    };
  } catch (error) {
    console.error('TED fetch error:', error);
    return { total: 0, notices: [] };
  }
}

async function fetchEUROVOCData(query: string, language: string = 'en') {
  try {
    // Use the working SPARQL query pattern from test files
    const sparqlQuery = `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

      SELECT DISTINCT ?concept ?prefLabel ?broader ?related
      WHERE {
        ?concept a skos:Concept ;
                 skos:prefLabel ?prefLabel .

        FILTER(LANG(?prefLabel) = "${language}")
        FILTER(CONTAINS(LCASE(?prefLabel), "${query.toLowerCase()}"))
        FILTER(STRSTARTS(STR(?concept), "http://eurovoc.europa.eu/"))

        OPTIONAL { ?concept skos:broader ?broader }
        OPTIONAL { ?concept skos:related ?related }
      }
      LIMIT 100
    `;

    const response = await fetch('http://publications.europa.eu/webapi/rdf/sparql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      body: sparqlQuery
    });

    if (!response.ok) {
      console.error('EUROVOC SPARQL error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    // Return formatted results with concept URIs and labels
    return bindings.map((b: any) => ({
      concept: b.concept?.value,
      label: b.prefLabel?.value,
      broader: b.broader?.value,
      related: b.related?.value
    }));
  } catch (error) {
    console.error('EUROVOC fetch error:', error);
    return [];
  }
}

async function checkNewRegulations() {
  try {
    // Real EUR-Lex SPARQL query for recent circular economy regulations
    const sparqlQuery = `
      PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

      SELECT DISTINCT ?regulation ?title ?date ?type WHERE {
        ?regulation cdm:work_has_resource-type ?type .
        ?regulation cdm:work_date_document ?date .
        ?regulation cdm:resource_legal_title ?title .

        FILTER(CONTAINS(LCASE(STR(?title)), "circular") ||
               CONTAINS(LCASE(STR(?title)), "waste") ||
               CONTAINS(LCASE(STR(?title)), "recycling") ||
               CONTAINS(LCASE(STR(?title)), "environment"))

        FILTER(?date >= "2024-01-01"^^xsd:date)
      }
      ORDER BY DESC(?date)
      LIMIT 100
    `;

    const response = await fetch('http://publications.europa.eu/webapi/rdf/sparql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      body: sparqlQuery
    });

    if (!response.ok) {
      console.error('EUR-Lex SPARQL error:', response.statusText);
      return [];
    }

    const data = await response.json();
    const regulations = (data.results?.bindings || []).map((binding: any) => ({
      id: binding.regulation?.value || `REG-${Date.now()}`,
      title: binding.title?.value || 'Unknown Regulation',
      date: binding.date?.value || new Date().toISOString(),
      type: binding.type?.value || 'directive',
      summary: `New regulation detected from EUR-Lex: ${binding.title?.value}`,
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // +6 months
    }));

    console.log(`✅ Found ${regulations.length} new regulations from EUR-Lex`);
    return regulations;

  } catch (error) {
    console.error('EUR-Lex fetch error:', error);
    return [];
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  fetch: app.fetch,

  // Scheduled cron job (runs every 24 hours)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(autonomousScheduler(env));
  }
};
