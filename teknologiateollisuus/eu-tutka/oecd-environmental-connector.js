// OECD Environmental Data Connector
// Integrates with OECD.Stat API for environmental indicators

class OECDEnvironmentalConnector {
    constructor() {
        this.baseUrl = 'https://stats.oecd.org/restsdmx/sdmx.ashx/GetData';
        this.fallbackUrl = 'https://compass.pauhu.ai/api/oecd';
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
        
        // Real OECD.Stat API datasets for circular economy indicators
        this.apiEndpoints = {
            'MUNW': 'MUNW', // Municipal waste
            'MATERIAL_RESOURCES': 'MATERIAL_RESOURCES', // Material resources
            'GREEN_GROWTH': 'GREEN_GROWTH', // Green growth indicators
            'WASTE_TREAT': 'WASTE_TREAT', // Waste treatment
            'CIRCULAR_ECONOMY': 'CE', // Circular economy
            'RECYCLING': 'RECYCLING' // Recycling rates
        };
    }

    // Main method to fetch OECD environmental data
    async getEnvironmentalData(dataset, filters = {}) {
        const cacheKey = `${dataset}_${JSON.stringify(filters)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`📊 OECD cache hit: ${dataset}`);
                return cached.data;
            }
        }

        try {
            console.log(`🌍 Fetching OECD ${dataset} data...`);
            
            // Try direct OECD API first
            let data = await this.fetchFromOECD(dataset, filters);
            
            // Fallback to compass.pauhu.ai if OECD fails
            if (!data || data.error) {
                console.log(`⚠️ OECD API failed, trying compass fallback...`);
                data = await this.fetchFromCompass(dataset, filters);
            }
            
            // Cache successful response
            if (data && !data.error) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            return data;
            
        } catch (error) {
            console.error(`❌ OECD data fetch failed for ${dataset}:`, error);
            return { error: error.message, dataset, timestamp: new Date().toISOString() };
        }
    }

    // Fetch directly from OECD.Stat API
    async fetchFromOECD(dataset, filters) {
        try {
            const datasetCode = this.apiEndpoints[dataset];
            if (!datasetCode) {
                throw new Error(`Unknown dataset: ${dataset}`);
            }
            
            // Build OECD.Stat query parameters
            const params = this.buildOECDStatQuery(dataset, filters);
            const url = `${this.baseUrl}/${datasetCode}/${params}`;
            
            console.log(`🔗 OECD.Stat API: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PauhuAI-CircularEconomy/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`OECD.Stat API returned ${response.status}: ${response.statusText}`);
            }
            
            const rawData = await response.json();
            return this.parseOECDStatResponse(rawData, dataset);
            
        } catch (error) {
            console.warn(`OECD.Stat API error:`, error);
            return { error: error.message };
        }
    }

    // Build OECD.Stat query parameters
    buildOECDStatQuery(dataset, filters) {
        const countries = filters.countries || ['OECD', 'EU27_2020'];
        const startTime = filters.startTime || '2018';
        const endTime = filters.endTime || '2022';
        
        switch (dataset) {
            case 'MUNW':
                // Municipal waste generation and treatment
                return `all/${countries.join('+')}/all?startTime=${startTime}&endTime=${endTime}&format=json`;
            case 'GREEN_GROWTH':
                // Green growth indicators
                return `all/${countries.join('+')}/all?startTime=${startTime}&endTime=${endTime}&format=json`;
            case 'MATERIAL_RESOURCES':
                // Material resources productivity
                return `all/${countries.join('+')}/all?startTime=${startTime}&endTime=${endTime}&format=json`;
            default:
                return `all/${countries.join('+')}/all?startTime=${startTime}&endTime=${endTime}&format=json`;
        }
    }

    // Parse OECD.Stat response format
    parseOECDStatResponse(rawData, dataset) {
        try {
            if (!rawData || !rawData.dataSets || rawData.dataSets.length === 0) {
                return { error: 'No data available', dataset };
            }
            
            const dataSet = rawData.dataSets[0];
            const structure = rawData.structure;
            
            const parsedData = {
                dataset,
                source: 'oecd_stat',
                lastUpdated: new Date().toISOString(),
                metadata: {
                    dimensions: structure.dimensions?.observation || [],
                    attributes: structure.attributes?.observation || []
                },
                data: this.extractOECDStatObservations(dataSet.observations || {}, structure)
            };
            
            return parsedData;
            
        } catch (error) {
            console.error('OECD.Stat response parsing error:', error);
            return { error: 'Failed to parse OECD.Stat response', dataset };
        }
    }

    // Extract observations from OECD.Stat format
    extractOECDStatObservations(observations, structure) {
        const data = [];
        
        Object.entries(observations).forEach(([key, observation]) => {
            if (observation && observation[0] !== null && observation[0] !== undefined) {
                const indices = key.split(':').map(Number);
                const record = {
                    value: observation[0],
                    status: observation[1] || 'normal'
                };
                
                // Map indices to dimension values using OECD.Stat structure
                if (structure.dimensions && structure.dimensions.observation) {
                    structure.dimensions.observation.forEach((dim, dimIndex) => {
                        if (indices[dimIndex] !== undefined && dim.values && dim.values[indices[dimIndex]]) {
                            const dimValue = dim.values[indices[dimIndex]];
                            record[dim.id.toLowerCase()] = {
                                id: dimValue.id,
                                name: dimValue.name || dimValue.id
                            };
                        }
                    });
                }
                
                data.push(record);
            }
        });
        
        return data;
    }

    // Fallback to compass.pauhu.ai
    async fetchFromCompass(dataset, filters) {
        try {
            const url = `${this.fallbackUrl}/${dataset}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filters })
            });
            
            if (!response.ok) {
                throw new Error(`Compass API returned ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.warn(`Compass fallback error:`, error);
            return { error: error.message };
        }
    }

    // Build OECD API parameters from filters
    buildOECDParams(filters) {
        // Use simplified parameter structure for OECD
        const countries = filters.countries || ['EU27_2020', 'OECD', 'OAVG'];
        const variables = filters.variables || ['all'];
        
        // For GREEN_GROWTH dataset, use standard structure
        let params = `${countries.join('+')}.${variables.join('+')}`;
        
        // Add time dimension if specified
        if (filters.timePeriod) {
            params += `.${filters.timePeriod}`;
        }
        
        return `${params}?contentType=json`;
    }

    // Parse OECD SDMX JSON response format
    parseSDMXResponse(rawData, dataset) {
        try {
            if (!rawData || !rawData.data || !rawData.data.dataSets || rawData.data.dataSets.length === 0) {
                return { error: 'No data available', dataset };
            }
            
            const dataSet = rawData.data.dataSets[0];
            const structure = rawData.data.structure;
            
            // Extract observations
            const observations = dataSet.observations || {};
            const dimensions = structure.dimensions.observation;
            
            const parsedData = {
                dataset,
                source: 'oecd_sdmx',
                lastUpdated: new Date().toISOString(),
                metadata: {
                    dimensions: dimensions.map(d => ({
                        id: d.id,
                        name: d.name,
                        values: d.values
                    }))
                },
                data: this.extractSDMXObservations(observations, dimensions)
            };
            
            return parsedData;
            
        } catch (error) {
            console.error('OECD SDMX response parsing error:', error);
            return { error: 'Failed to parse OECD SDMX response', dataset };
        }
    }

    // Extract observations from SDMX format
    extractSDMXObservations(observations, dimensions) {
        const data = [];
        
        Object.entries(observations).forEach(([key, observation]) => {
            if (observation && observation[0] !== null && observation[0] !== undefined) {
                const indices = key.split(':').map(Number);
                const record = {
                    value: observation[0],
                    status: observation[1] || 'normal'
                };
                
                // Map indices to dimension values
                dimensions.forEach((dim, dimIndex) => {
                    if (indices[dimIndex] !== undefined && dim.values && dim.values[indices[dimIndex]]) {
                        const dimValue = dim.values[indices[dimIndex]];
                        record[dim.id.toLowerCase()] = {
                            id: dimValue.id,
                            name: dimValue.name || dimValue.id
                        };
                    }
                });
                
                data.push(record);
            }
        });
        
        return data;
    }

    // Extract dimension values from OECD structure
    extractDimensionValues(dimensions, dimensionId) {
        const dimension = dimensions.find(d => d.id === dimensionId);
        if (!dimension || !dimension.values) return [];
        
        return dimension.values.map(v => ({
            id: v.id,
            name: v.name
        }));
    }

    // Extract observation values from OECD data
    extractObservations(observations, dimensions) {
        const data = [];
        
        Object.entries(observations).forEach(([key, observation]) => {
            if (observation && observation[0] !== null) {
                const indices = key.split(':').map(Number);
                const record = {
                    value: observation[0],
                    status: observation[1] || 'normal'
                };
                
                // Map indices to dimension values
                dimensions.forEach((dim, dimIndex) => {
                    if (indices[dimIndex] !== undefined && dim.values[indices[dimIndex]]) {
                        record[dim.id.toLowerCase()] = {
                            id: dim.values[indices[dimIndex]].id,
                            name: dim.values[indices[dimIndex]].name
                        };
                    }
                });
                
                data.push(record);
            }
        });
        
        return data;
    }

    // Get specific environmental indicators
    async getAirQualityData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('AIR_GHG', {
            countries,
            variables: ['GHG_TOTAL', 'CO2', 'CH4', 'N2O']
        });
    }

    async getWaterQualityData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('WATER', {
            countries,
            variables: ['WATER_QUALITY', 'WATER_STRESS', 'WATER_USE']
        });
    }

    async getBiodiversityData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('BIODIVERSITY', {
            countries,
            variables: ['FOREST_AREA', 'PROTECTED_AREAS', 'SPECIES_THREAT']
        });
    }

    async getResourceUseData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('MATERIAL_RESOURCES', {
            countries,
            variables: ['DMC', 'DMI', 'RESOURCE_PRODUCTIVITY']
        });
    }

    async getWasteData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('WASTE', {
            countries,
            variables: ['MUNICIPAL_WASTE', 'WASTE_GENERATION', 'RECYCLING_RATE']
        });
    }

    async getEnergyData(countries = ['EU27_2020']) {
        return await this.getEnvironmentalData('ENERGY', {
            countries,
            variables: ['RENEWABLE_SHARE', 'ENERGY_INTENSITY', 'PRIMARY_ENERGY']
        });
    }

    // Get comprehensive environmental dashboard data
    async getEnvironmentalDashboard(countries = ['EU27_2020', 'OECD']) {
        console.log('🌍 Fetching comprehensive OECD environmental dashboard...');
        
        const [
            airQuality,
            waterQuality,
            biodiversity,
            resourceUse,
            waste,
            energy
        ] = await Promise.allSettled([
            this.getAirQualityData(countries),
            this.getWaterQualityData(countries),
            this.getBiodiversityData(countries),
            this.getResourceUseData(countries),
            this.getWasteData(countries),
            this.getEnergyData(countries)
        ]);

        return {
            timestamp: new Date().toISOString(),
            source: 'oecd_environmental',
            countries,
            categories: {
                air_quality: this.extractSettledValue(airQuality),
                water_quality: this.extractSettledValue(waterQuality),
                biodiversity: this.extractSettledValue(biodiversity),
                resource_use: this.extractSettledValue(resourceUse),
                waste: this.extractSettledValue(waste),
                energy: this.extractSettledValue(energy)
            },
            summary: this.generateEnvironmentalSummary({
                air_quality: airQuality,
                water_quality: waterQuality,
                biodiversity: biodiversity,
                resource_use: resourceUse,
                waste: waste,
                energy: energy
            })
        };
    }

    // Extract value from Promise.allSettled result
    extractSettledValue(settledResult) {
        if (settledResult.status === 'fulfilled') {
            return settledResult.value;
        } else {
            return { error: settledResult.reason.message };
        }
    }

    // Generate environmental summary
    generateEnvironmentalSummary(categories) {
        const successful = Object.values(categories).filter(c => 
            c.status === 'fulfilled' && !c.value.error
        ).length;
        
        const total = Object.keys(categories).length;
        
        return {
            data_availability: `${successful}/${total} categories`,
            coverage_score: (successful / total * 100).toFixed(0) + '%',
            status: successful >= total * 0.8 ? 'excellent' : 
                   successful >= total * 0.6 ? 'good' : 'limited',
            recommendations: successful < total ? [
                'Some OECD environmental datasets unavailable',
                'Consider alternative data sources for missing indicators',
                'Check compass.pauhu.ai fallback service'
            ] : [
                'All environmental categories available',
                'Data quality suitable for analysis',
                'Ready for environmental assessment'
            ]
        };
    }

    // Health check for OECD services
    async healthCheck() {
        try {
            const testData = await this.getEnvironmentalData('AIR_GHG', { 
                countries: ['EU27_2020'],
                timePeriod: '2022:2023'
            });
            
            return {
                status: testData.error ? 'degraded' : 'healthy',
                oecd_api: testData.error ? 'error' : 'operational',
                compass_fallback: 'available',
                cache_size: this.cache.size,
                last_check: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OECDEnvironmentalConnector;
} else {
    window.OECDEnvironmentalConnector = OECDEnvironmentalConnector;
}