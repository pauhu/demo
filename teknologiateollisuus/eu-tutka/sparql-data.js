// Pauhu Stack - EU Circular Economy Monitoring System
// REAL DATA via SPARQL endpoints

// SPARQL Endpoints
const ENDPOINTS = {
    eurostat: 'https://ec.europa.eu/eurostat/api/dissemination/sparql',
    oecd: 'https://stats.oecd.org/sparql' // Verify this endpoint
};

// Fetch data from Eurostat SPARQL endpoint
async function fetchEurostatData(filters = {}) {
    const query = `
        PREFIX qb: <http://purl.org/linked-data/cube#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX sdmx-measure: <http://purl.org/linked-data/sdmx/2009/measure#>
        PREFIX eurostat: <http://ec.europa.eu/eurostat/resource/>

        SELECT DISTINCT ?dataset ?title ?date ?theme ?country
        WHERE {
            ?dataset a qb:DataSet ;
                     rdfs:label ?title ;
                     eurostat:publicationDate ?date ;
                     eurostat:theme ?theme ;
                     eurostat:geo ?country .

            FILTER (CONTAINS(LCASE(?title), "circular economy") ||
                    CONTAINS(LCASE(?title), "waste") ||
                    CONTAINS(LCASE(?title), "recycling"))

            ${filters.dateFrom ? `FILTER (?date >= "${filters.dateFrom}"^^xsd:date)` : ''}
            ${filters.dateTo ? `FILTER (?date <= "${filters.dateTo}"^^xsd:date)` : ''}
        }
        ORDER BY DESC(?date)
        LIMIT 100
    `;

    try {
        const response = await fetch(ENDPOINTS.eurostat, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sparql-query',
                'Accept': 'application/sparql-results+json'
            },
            body: query
        });

        if (!response.ok) {
            throw new Error(`Eurostat SPARQL query failed: ${response.status}`);
        }

        const data = await response.json();
        return parseEurostatResults(data);
    } catch (error) {
        console.error('Eurostat fetch error:', error);
        return [];
    }
}

// Parse Eurostat SPARQL results
function parseEurostatResults(sparqlData) {
    if (!sparqlData.results || !sparqlData.results.bindings) {
        return [];
    }

    return sparqlData.results.bindings.map(binding => ({
        id: binding.dataset?.value || '',
        date: binding.date?.value?.split('T')[0] || '',
        country: extractCountryCode(binding.country?.value) || 'EU',
        countryName: getCountryName(extractCountryCode(binding.country?.value)),
        type: 'dataset',
        typeName: 'Eurostat Dataset',
        topic: detectTopic(binding.title?.value),
        topicName: getTopicName(detectTopic(binding.title?.value)),
        title: binding.title?.value || 'Untitled',
        theme: binding.theme?.value || '',
        compliance: 'compliant',
        sector: detectSector(binding.title?.value),
        source: 'eurostat',
        sourceUrl: binding.dataset?.value || ''
    }));
}

// Fetch data from OECD SPARQL endpoint
async function fetchOECDData(filters = {}) {
    // OECD might use REST API instead of SPARQL
    // Check: https://data.oecd.org/api/
    const apiUrl = 'https://stats.oecd.org/SDMX-JSON/data/';

    // Query for circular economy indicators
    // Example: Waste generation, recycling rates
    const datasets = [
        'ENV_WASTE',      // Waste statistics
        'GREEN_GROWTH',   // Green growth indicators
        'CIRCULAR_ECON'   // Circular economy (if exists)
    ];

    try {
        const allResults = [];

        for (const dataset of datasets) {
            const response = await fetch(`${apiUrl}${dataset}/all/all`);

            if (!response.ok) continue;

            const data = await response.json();
            const parsed = parseOECDResults(data, dataset);
            allResults.push(...parsed);
        }

        return allResults;
    } catch (error) {
        console.error('OECD fetch error:', error);
        return [];
    }
}

// Parse OECD API results
function parseOECDResults(oecdData, datasetId) {
    // OECD SDMX-JSON format parsing
    if (!oecdData.dataSets || !oecdData.dataSets[0]) {
        return [];
    }

    const observations = oecdData.dataSets[0].observations || {};
    const structure = oecdData.structure || {};

    return Object.keys(observations).slice(0, 50).map((key, index) => {
        const value = observations[key][0];

        return {
            id: `oecd-${datasetId}-${index}`,
            date: extractOECDDate(key, structure) || '2025-01-01',
            country: extractOECDCountry(key, structure) || 'OECD',
            countryName: getCountryName(extractOECDCountry(key, structure)),
            type: 'indicator',
            typeName: 'OECD Indicator',
            topic: 'circular-economy',
            topicName: 'Circular Economy',
            title: `${datasetId} - ${extractOECDIndicator(key, structure)}`,
            value: value,
            compliance: 'compliant',
            sector: 'environment',
            source: 'oecd',
            sourceUrl: `https://stats.oecd.org/Index.aspx?DataSetCode=${datasetId}`
        };
    });
}

// Helper functions
function extractCountryCode(uri) {
    if (!uri) return null;
    const match = uri.match(/geo\/([A-Z]{2})/);
    return match ? match[1] : null;
}

function getCountryName(code) {
    const countries = {
        'FI': 'Finland', 'SE': 'Sweden', 'DE': 'Germany', 'FR': 'France',
        'NL': 'Netherlands', 'DK': 'Denmark', 'PL': 'Poland', 'ES': 'Spain',
        'IT': 'Italy', 'AT': 'Austria', 'BE': 'Belgium', 'IE': 'Ireland',
        'EU': 'European Union', 'OECD': 'OECD Average'
    };
    return countries[code] || code;
}

function detectTopic(title) {
    if (!title) return 'other';
    const lower = title.toLowerCase();

    if (lower.includes('waste')) return 'waste-management';
    if (lower.includes('recycl')) return 'recycling';
    if (lower.includes('circular')) return 'circular-economy';
    if (lower.includes('plastic')) return 'plastics';
    if (lower.includes('battery') || lower.includes('batteries')) return 'batteries';
    if (lower.includes('textile')) return 'textiles';

    return 'other';
}

function getTopicName(topic) {
    const topics = {
        'waste-management': 'Waste Management',
        'recycling': 'Recycling & Recovery',
        'circular-economy': 'Circular Economy',
        'plastics': 'Plastics Strategy',
        'batteries': 'Batteries & Electronics',
        'textiles': 'Textiles & Fashion',
        'other': 'Other'
    };
    return topics[topic] || 'Other';
}

function detectSector(title) {
    if (!title) return 'general';
    const lower = title.toLowerCase();

    if (lower.includes('manufact')) return 'manufacturing';
    if (lower.includes('electron')) return 'electronics';
    if (lower.includes('energy')) return 'energy';
    if (lower.includes('construct')) return 'construction';

    return 'general';
}

function extractOECDDate(key, structure) {
    // Extract date from OECD observation key
    // This depends on OECD data structure
    return '2025-01-01'; // Placeholder - needs actual parsing
}

function extractOECDCountry(key, structure) {
    // Extract country from OECD observation key
    return null; // Placeholder - needs actual parsing
}

function extractOECDIndicator(key, structure) {
    // Extract indicator name from OECD observation key
    return 'Indicator'; // Placeholder - needs actual parsing
}

// Main data loading function
async function loadRealData() {
    console.log('Loading REAL data from Eurostat and OECD...');

    const [eurostatData, oecdData] = await Promise.all([
        fetchEurostatData({ dateFrom: '2024-01-01', dateTo: '2025-10-22' }),
        fetchOECDData()
    ]);

    console.log(`Loaded ${eurostatData.length} Eurostat datasets`);
    console.log(`Loaded ${oecdData.length} OECD indicators`);

    // Combine and return
    return [...eurostatData, ...oecdData];
}

// Initialize with real data
let allDocuments = [];
let filteredResults = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading indicator safely
    const tbody = document.getElementById('results-tbody');
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    const loadingRow = document.createElement('tr');
    const loadingCell = document.createElement('td');
    loadingCell.colSpan = 7;
    loadingCell.className = 'loading';
    loadingCell.textContent = 'Loading real data from Eurostat and OECD...';
    loadingRow.appendChild(loadingCell);
    tbody.appendChild(loadingRow);

    try {
        allDocuments = await loadRealData();
        filteredResults = [...allDocuments];

        if (allDocuments.length === 0) {
            throw new Error('No data received from SPARQL endpoints');
        }

        updateResults();
        updateStats();
        console.log('Real data loaded successfully');
    } catch (error) {
        console.error('Failed to load real data:', error);

        // Show error message safely
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.colSpan = 7;
        errorCell.className = 'error';
        errorCell.textContent = 'Error loading data. Please check console for details.';
        errorRow.appendChild(errorCell);
        tbody.appendChild(errorRow);
    }
});

// Rest of the demo.js code (filters, export, etc.) stays the same...
// Just replace mockDocuments references with allDocuments/filteredResults
