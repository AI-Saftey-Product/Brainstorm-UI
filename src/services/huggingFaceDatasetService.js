/**
 * Hugging Face Dataset Service
 * Provides functions to interact with Hugging Face datasets
 */

import api from './api';

// Hugging Face API endpoints
const HF_API_URL = 'https://huggingface.co/api';

/**
 * Search for datasets on Hugging Face
 * @param {string} query - Search query
 * @param {Object} options - Search options (limit, offset, etc.)
 * @param {string} apiKey - Hugging Face API key
 * @returns {Promise<Object>} - Search results
 */
export const searchDatasets = async (query, options = {}, apiKey) => {
  try {
    const params = new URLSearchParams({
      search: query,
      limit: options.limit || 20,
      offset: options.offset || 0,
      full: options.full || true,
      ...options
    });
    
    const response = await fetch(`${HF_API_URL}/datasets?${params.toString()}`, {
      headers: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search datasets: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching datasets:', error);
    throw error;
  }
};

/**
 * Get dataset metadata
 * @param {string} datasetId - Dataset ID
 * @param {string} apiKey - Hugging Face API key
 * @returns {Promise<Object>} - Dataset metadata
 */
export const getDatasetInfo = async (datasetId, apiKey) => {
  try {
    const response = await fetch(`${HF_API_URL}/datasets/${datasetId}`, {
      headers: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get dataset info: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting dataset info for ${datasetId}:`, error);
    throw error;
  }
};

/**
 * Fetch dataset sample
 * @param {string} datasetId - Dataset ID
 * @param {string} split - Dataset split (train, validation, test)
 * @param {number} count - Number of samples to fetch
 * @param {string} apiKey - Hugging Face API key
 * @returns {Promise<Array>} - Dataset samples
 */
export const getDatasetSample = async (datasetId, split = 'test', count = 10, apiKey) => {
  try {
    console.log(`Attempting to fetch sample for ${datasetId} with split: ${split}`);
    
    // Try direct API fetch first - this is the most common pattern
    try {
      const url = `${HF_API_URL}/datasets/${datasetId}/sample?split=${split}&n=${count}`;
      console.log(`Fetching from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched ${data.length} samples using standard endpoint`);
        return data;
      }
      
      console.log(`Standard sample endpoint failed with status: ${response.status} - ${response.statusText}`);
      console.log(`Response content: ${await response.text()}`);
    } catch (error) {
      console.log('Error with standard sample endpoint:', error.message);
    }
    
    // Trying alternative approaches - some datasets use different splits
    const splitOptions = ['train', 'validation', 'test', 'dev'];
    
    // Try other common split names if the requested one failed
    for (const alternateSplit of splitOptions) {
      if (alternateSplit === split) continue; // Skip the one we already tried
      
      try {
        console.log(`Trying alternative split: ${alternateSplit}`);
        const url = `${HF_API_URL}/datasets/${datasetId}/sample?split=${alternateSplit}&n=${count}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully fetched ${data.length} samples from ${alternateSplit} split`);
          return data;
        }
      } catch (err) {
        console.log(`Failed with alternative split ${alternateSplit}:`, err.message);
      }
    }
    
    // Try using the Hugging Face Datasets API directly (this is a newer approach)
    try {
      console.log('Trying Hugging Face datasets hub API approach');
      // Get dataset info to find available splits
      const infoResponse = await fetch(`${HF_API_URL}/datasets/${datasetId}`, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
        }
      });
      
      if (!infoResponse.ok) {
        throw new Error(`Failed to get dataset info: ${infoResponse.statusText}`);
      }
      
      const datasetInfo = await infoResponse.json();
      
      // Direct dataset API - sometimes works when the sample endpoint doesn't
      if (datasetInfo.id) {
        console.log('Attempting to fetch data directly from dataset API');
        
        // Determine available splits
        let availableSplits = [];
        if (datasetInfo.splits && Object.keys(datasetInfo.splits).length > 0) {
          availableSplits = Object.keys(datasetInfo.splits);
          console.log('Available splits found in metadata:', availableSplits);
        } else {
          availableSplits = splitOptions;
        }
        
        // Try each available split
        for (const splitName of availableSplits) {
          try {
            const directResponse = await fetch(`https://datasets-server.huggingface.co/rows?dataset=${datasetId}&config=default&split=${splitName}&offset=0&limit=${count}`, {
              headers: {
                'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
              }
            });
            
            if (directResponse.ok) {
              const directData = await directResponse.json();
              
              if (directData && directData.rows && directData.rows.length > 0) {
                console.log(`Successfully fetched ${directData.rows.length} rows via datasets-server API`);
                
                // Convert the row format to flat objects
                const samples = directData.rows.map(row => {
                  // Extract the row values into a flat object
                  const flatRow = {};
                  if (row.row && Array.isArray(row.row)) {
                    directData.features.forEach((feature, index) => {
                      flatRow[feature.name] = row.row[index];
                    });
                  } else if (row.row) {
                    // Handle case where row is already an object
                    Object.assign(flatRow, row.row);
                  }
                  return flatRow;
                });
                
                if (samples.length > 0) {
                  console.log('Sample from direct API:', samples[0]);
                  return samples;
                }
              }
            }
          } catch (directErr) {
            console.log(`Error fetching from datasets-server API with split ${splitName}:`, directErr.message);
          }
        }
      }
    } catch (infoErr) {
      console.log('Error getting dataset info for direct API approach:', infoErr.message);
    }
    
    // No real data could be retrieved
    console.warn(`Could not fetch any real samples for dataset ${datasetId}. Please try a different dataset or check the dataset ID.`);
    throw new Error(`Could not fetch any real samples for dataset ${datasetId}. No mock data will be generated as per your request.`);
  } catch (error) {
    console.error(`Error getting dataset sample for ${datasetId}:`, error);
    throw error;
  }
};

/**
 * Create mock dataset samples when real samples can't be fetched
 * @param {string} datasetId - Dataset ID
 * @returns {Array} - Mock dataset samples
 */
export const createMockDatasetSamples = (datasetId) => {
  console.log(`Creating mock samples for ${datasetId}`);
  const samples = [];
  
  // Create 5 basic samples with common fields
  for (let i = 0; i < 5; i++) {
    samples.push({
      input: `Example input text ${i+1} for ${datasetId}`,
      output: `Example output text ${i+1}`,
      text: `Sample text content ${i+1}`,
      question: `Sample question ${i+1}?`,
      answer: `Sample answer ${i+1}`,
      label: i % 3 // Simple label rotation (0, 1, 2)
    });
  }
  
  console.log(`Created ${samples.length} mock samples with standard fields`);
  return samples;
};

/**
 * Create dataset adapter for using the dataset in tests
 * @param {Object} datasetConfig - Dataset configuration
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Dataset adapter object
 */
export const createDatasetAdapter = async (datasetConfig, options = {}) => {
  const verbose = options.verbose || datasetConfig.verbose || false;
  
  if (!datasetConfig.dataset_id) {
    throw new Error('Dataset ID is required');
  }
  
  const datasetId = datasetConfig.dataset_id;
  const apiKey = datasetConfig.api_key;
  const split = datasetConfig.split || 'test';
  
  if (verbose) {
    console.log('=== Initializing Dataset ===');
    console.log(`Dataset ID: ${datasetId}`);
    console.log(`Split: ${split}`);
  }
  
  try {
    // Get dataset metadata
    const datasetInfo = await getDatasetInfo(datasetId, apiKey);
    
    // Get sample data to verify access and understand structure
    const sampleData = await getDatasetSample(datasetId, split, 5, apiKey);
    
    if (verbose) {
      console.log('Dataset info:', datasetInfo);
      console.log('Sample data:', sampleData);
    }
    
    // Create the dataset adapter object
    return {
      id: datasetId,
      name: datasetInfo.name || datasetId,
      description: datasetInfo.description,
      citation: datasetInfo.citation,
      split: split,
      
      /**
       * Get samples from the dataset
       * @param {number} count - Number of samples
       * @returns {Promise<Array>} - Array of samples
       */
      getSamples: async (count = 10) => {
        return await getDatasetSample(datasetId, split, count, apiKey);
      },
      
      /**
       * Get dataset columns/features
       * @returns {Object} - Dataset features/columns
       */
      getColumns: () => {
        return datasetInfo.features || {};
      },
      
      /**
       * Prepare dataset for testing
       * @param {Object} testConfig - Test configuration
       * @returns {Object} - Dataset configuration for testing
       */
      prepareForTesting: (testConfig = {}) => {
        return {
          dataset_id: datasetId,
          split: split,
          column_mapping: testConfig.column_mapping || datasetConfig.column_mapping || {},
          sampling: testConfig.sampling || datasetConfig.sampling || 'random',
          sample_size: testConfig.sample_size || datasetConfig.sample_size || 100
        };
      }
    };
  } catch (error) {
    if (verbose) {
      console.error('Error creating dataset adapter:', error);
    }
    throw error;
  }
};

/**
 * Parse file content based on file type
 * @param {File} file - File object
 * @returns {Promise<Object>} - Parsed file content
 */
export const parseDatasetFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let data;
        
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          data = parseCSV(content);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          data = parseTextFile(content);
        } else {
          throw new Error('Unsupported file format');
        }
        
        resolve({
          filename: file.name,
          fileType: file.type,
          data,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    if (file.type === 'application/json' || file.name.endsWith('.json') ||
        file.type === 'text/csv' || file.name.endsWith('.csv') || 
        file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
};

/**
 * Parse CSV content
 * @param {string} content - CSV content
 * @returns {Array} - Parsed CSV data
 */
const parseCSV = (content) => {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {});
  });
};

/**
 * Parse text file content (assumes one data point per line)
 * @param {string} content - Text file content
 * @returns {Array} - Parsed text data
 */
const parseTextFile = (content) => {
  return content.split('\n')
    .filter(line => line.trim())
    .map((line, index) => ({ id: index, text: line.trim() }));
}; 