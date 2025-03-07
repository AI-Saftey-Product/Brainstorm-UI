import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BarChartIcon from '@mui/icons-material/BarChart';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAppContext } from '../context/AppContext';
import StatusChip from '../components/common/StatusChip';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip.jsx';
import ComplianceScoreGauge from '../components/common/ComplianceScoreGauge';
import ProgressBar from '../components/common/ProgressBar';
import { runTests, getTestResults } from '../services/testsService';
import { createModelAdapter } from '../services/modelAdapter';
import { getSavedModelConfigs, getModelConfigById, saveTestResults as saveModelTestResults } from '../services/modelStorageService';
import { getFilteredTests } from '../services/testsService';
import websocketService from '../services/websocketService';

// Color mapping for categories
const CATEGORY_COLORS = {
  'security': '#e53935', // red
  'bias': '#7b1fa2', // purple
  'toxicity': '#d32f2f', // dark red
  'hallucination': '#1565c0', // blue
  'robustness': '#2e7d32', // green
  'ethics': '#6a1b9a', // deep purple
  'performance': '#0277bd', // light blue
  'quality': '#00695c', // teal
  'privacy': '#283593', // indigo
  'safety': '#c62828', // darker red
  'compliance': '#4527a0' // deep purple
};

const RunTestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedTests: contextSelectedTests, 
    testParameters, 
    saveTestResults,
    modelType,
    configureModel,
    availableTests
  } = useAppContext();
  
  const [logs, setLogs] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [currentTestName, setCurrentTestName] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [modelAdapterState, setModelAdapterState] = useState({
    modelId: '',
    modelName: 'Default Model',
    parameters: {}
  });
  const logsEndRef = useRef(null);
  
  // Use selected tests from context or location state
  const [selectedTests, setSelectedTests] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [complianceScores, setComplianceScores] = useState({});
  
  const [runningTests, setRunningTests] = useState(false);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [overallScore, setOverallScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [modelAdapter, setModelAdapter] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('');
  const logsContainerRef = useRef(null);
  const logContainerRef = useRef(null);
  
  // Initialize test selection when component mounts
  useEffect(() => {
    // Priority: Tests from location state (from TestConfig page)
    // Second priority: tests from context (loaded from localStorage)
    // Default to empty array if neither is available
    const initialTests = location.state?.selectedTests || contextSelectedTests || [];
    setSelectedTests(initialTests);
    
    // Log the test list
    console.log('Selected tests:', initialTests);
    
    if (initialTests.length === 0) {
      console.log('No tests loaded. Please configure tests first.');
    }
  }, [location.state, contextSelectedTests]);
  
  // Group tests by category
  const groupTestsByCategory = () => {
    // Use availableTests from context instead of MOCK_TESTS
    const grouped = {};
    
    // First, create empty arrays for all categories we have
    if (Array.isArray(availableTests)) {
      // Get unique categories
      const categories = [...new Set(availableTests.map(test => test.category))];
      categories.forEach(category => {
        grouped[category] = [];
      });
      
      // Group selected tests by category
      for (const testId of selectedTests) {
        // Find test in available tests
        const test = availableTests.find(t => t.id === testId);
        if (test) {
          const category = test.category;
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(testId);
        }
      }
    }
    
    return grouped;
  };
  
  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current && verbose) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, verbose]);
  
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  useEffect(() => {
    // Clear any existing test results when component mounts
    setTestResults({});
    setComplianceScores({});
    setTestComplete(false);
    setRunningTests(false);
    setError(null);
    
    // Load saved configurations
    loadSavedConfigs();
  }, []);
  
  const loadSavedConfigs = () => {
    const configs = getSavedModelConfigs();
    setSavedConfigs(configs);
  };
  
  // Load model configuration on mount
  useEffect(() => {
    const loadModelConfig = async () => {
      try {
        // Try from location state first (from TestConfig navigation)
        let config = location.state?.modelConfig;
        
        if (!config) {
          // If no location state, try to load from localStorage
          const savedConfigs = await getSavedModelConfigs();
          setSavedConfigs(savedConfigs);
          
          if (savedConfigs.length > 0) {
            // Default to first saved config
            setSelectedModelId(savedConfigs[0].id);
          }
        } else {
          // Use the config provided in location state
          // Normalize config to ensure it has both old and new field names
          config = {
            ...config,
            name: config.name || config.modelName || 'Unnamed Model',
            modelName: config.name || config.modelName || 'Unnamed Model',
            
            modality: config.modality || config.modelCategory || 'NLP',
            modelCategory: config.modality || config.modelCategory || 'NLP',
            
            sub_type: config.sub_type || config.modelType || '',
            modelType: config.sub_type || config.modelType || '',
            
            model_id: config.model_id || config.modelId || config.selectedModel || '',
            modelId: config.model_id || config.modelId || config.selectedModel || '',
            selectedModel: config.model_id || config.modelId || config.selectedModel || '',
            
            source: config.source || 'huggingface',
            
            api_key: config.api_key || config.apiKey || '',
            apiKey: config.api_key || config.apiKey || ''
          };
          
          setModelConfig(config);
          
          if (config.modelAdapter) {
            setModelAdapter(config.modelAdapter);
          }
        }
      } catch (err) {
        console.error('Error loading model configurations:', err);
        setError('Failed to load model configurations');
      } finally {
        setLoading(false);
      }
    };

    loadModelConfig();
  }, [location.state]);
  
  const handleModelSelect = async (event) => {
    const modelId = event.target.value;
    
    if (modelId) {
      setSelectedModelId(modelId);
      setLoading(true);
      setError(null);
      
      try {
        const config = getModelConfigById(modelId);
        
        // Normalize config to ensure it has both old and new field names
        const normalizedConfig = {
          ...config,
          name: config.name || config.modelName || 'Unnamed Model',
          modelName: config.name || config.modelName || 'Unnamed Model',
          
          modality: config.modality || config.modelCategory || 'NLP',
          modelCategory: config.modality || config.modelCategory || 'NLP',
          
          sub_type: config.sub_type || config.modelType || '',
          modelType: config.sub_type || config.modelType || '',
          
          model_id: config.model_id || config.modelId || config.selectedModel || '',
          modelId: config.model_id || config.modelId || config.selectedModel || '',
          selectedModel: config.model_id || config.modelId || config.selectedModel || '',
          
          source: config.source || 'huggingface',
          
          api_key: config.api_key || config.apiKey || '',
          apiKey: config.api_key || config.apiKey || ''
        };
        
        setModelConfig(normalizedConfig);
        
        // Fetch available tests for this model configuration
        try {
          const adapter = await createModelAdapter(normalizedConfig);
          setModelAdapter(adapter);
          console.log('Model adapter initialized:', adapter);
          
          // Get tests compatible with this model (removed fetchTests which is undefined)
          // Load tests for the model by querying the API directly
          const apiParams = {
            modality: normalizedConfig.modality,
            model_type: normalizedConfig.sub_type
          };
          
          // Use the API directly instead of an undefined function
          const compatibleTests = await getFilteredTests(apiParams);
          console.log('Fetched compatible tests:', compatibleTests);
          
          // Now filter the selectedTests to only include compatible ones
          if (Array.isArray(compatibleTests) && selectedTests.length > 0) {
            const compatibleTestIds = compatibleTests.map(test => test.id);
            const filteredSelectedTests = selectedTests.filter(testId => 
              compatibleTestIds.includes(testId)
            );
            
            if (filteredSelectedTests.length !== selectedTests.length) {
              console.warn(`Some selected tests are not compatible with this model. 
                Selected: ${selectedTests.length}, Compatible: ${filteredSelectedTests.length}`);
              setSelectedTests(filteredSelectedTests);
            }
          }
        } catch (adapterError) {
          console.error('Error initializing model adapter:', adapterError);
          setError(`Failed to initialize model adapter: ${adapterError.message}`);
        }
      } catch (error) {
        console.error('Error selecting model:', error);
        setError(`Failed to load model configuration: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setModelConfig(null);
      setSelectedTests([]);
      setSelectedModelId('');
    }
  };
  
  const handleRunTests = async () => {
    if (!modelAdapter) {
      setError('No model adapter available. Please select a model configuration.');
      return;
    }
    
    // Reset state before starting
    setRunningTests(true);
    setTestResults({});
    setComplianceScores({});
    setExpandedRows({});
    setTestProgress(0);
    setCurrentTestName('Initializing...');
    setError(null);
    
    // Clear log and add header
    setLogs([]);
    addLog('Starting test run...');
    
    // Debug logging for model adapter
    console.log('Model adapter state before running tests:', modelAdapter);
    console.log('Model ID from adapter:', modelAdapter.modelId);
    console.log('Selected model from config:', modelConfig?.selectedModel);
    
    try {
      setRunningTests(true);
      setError(null);
      setTestResults({});
      setComplianceScores({});
      setTestProgress(0);
      setCurrentTestName('Initializing...');
      addLog('Starting test run...');
      addLog(`Using model: ${modelConfig?.modelName} (ID: ${modelAdapter.modelId || 'unknown'})`);
      
      // Group tests by category for better organization
      const groupedTests = groupTestsByCategory();
      for (const category in groupedTests) {
        addLog(`Preparing ${groupedTests[category].length} tests for category: ${category}`);
      }
      
      const logCallback = (message) => {
        addLog(message);
      };
      
      // Create a test configuration object that explicitly includes all required fields for the API
      const testConfig = {
        // Ensure we have all the required fields with the correct names
        name: modelConfig?.name || modelConfig?.modelName || 'Unnamed Model',
        modality: modelConfig?.modality || modelConfig?.modelCategory || 'NLP',
        sub_type: modelConfig?.sub_type || modelConfig?.modelType || '',
        source: modelConfig?.source || 'huggingface',
        model_id: modelConfig?.model_id || modelConfig?.modelId || modelConfig?.selectedModel || modelAdapter?.modelId || '',
        api_key: modelConfig?.api_key || modelConfig?.apiKey || ''
      };
      
      console.log('Test configuration being sent to API:', testConfig);
      addLog(`Sending test configuration with model ID: ${testConfig.model_id}`);
      
      try {
        // Run the tests with the properly formatted config
        const taskId = await runTests(
          selectedTests,
          testConfig,
          testParameters || {},
          verbose ? logCallback : null
        );
        
        // Validate task ID
        if (!taskId) {
          throw new Error('No task ID returned from the API. Test run could not be initiated.');
        }
        
        addLog(`Test run initiated with task ID: ${taskId}`);
        
        // Setup variables for tracking results
        let completed = false;
        let results = {};
        let scores = {};
        
        // Set up WebSocket connection for real-time updates instead of polling
        addLog(`Setting up WebSocket connection for real-time updates...`);
        
        try {
          // Connect to WebSocket
          await websocketService.connect(taskId);
          addLog(`WebSocket connection established - waiting for test results...`);
          
          // Set up a promise that will resolve when test completion is received
          const testCompletionPromise = new Promise((resolve, reject) => {
            // Handle test status updates
            websocketService.on('test_status_update', (data) => {
              // Update progress information
              if (data.summary && data.summary.progress !== undefined) {
                setTestProgress(data.summary.progress * 100);
              }
              
              if (data.summary && data.summary.current_test) {
                setCurrentTestName(data.summary.current_test);
                addLog(`Running test: ${data.summary.current_test}`);
              }
            });
            
            // Handle individual test results as they come in
            websocketService.on('test_result', (data) => {
              if (data.result && data.result.test_id) {
                addLog(`Test completed: ${data.result.test_name || data.result.test_id}`);
              }
            });
            
            // Handle test completion
            websocketService.on('test_complete', async (data) => {
              addLog(`All tests completed successfully`);
              
              try {
                // Fetch the complete results
                const testResults = await getTestResults(taskId);
                resolve(testResults);
              } catch (error) {
                reject(new Error(`Failed to fetch final results: ${error.message}`));
              }
            });
            
            // Handle test failure
            websocketService.on('test_failed', (data) => {
              reject(new Error(data.message || 'Test execution failed'));
            });
            
            // Handle generic WebSocket errors
            websocketService.on('error', (error) => {
              reject(new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
            });
            
            // Handle unexpected WebSocket closure
            websocketService.on('close', (event) => {
              if (!event.wasClean) {
                reject(new Error('WebSocket connection closed unexpectedly'));
              }
            });
          });
          
          // Wait for test completion
          const testResults = await testCompletionPromise;
          
          // Process the results
          results = testResults.results || {};
          scores = testResults.compliance_scores || {};
          completed = true;
          
          // Update UI and log
          setTestProgress(100);
          setCurrentTestName('Completed');
          addLog('Test execution completed successfully.');
          
          // Save and process results
          setTestResults(results);
          setComplianceScores(scores);
          
          // Handle empty results case
          if (Object.keys(results).length === 0) {
            addLog('Warning: No test results returned. The tests may have failed silently.');
            setError('No test results were returned. Please check test configuration and try again.');
          } else {
            // Process results for different categories
            processTestResults(results, scores);
          }
        } catch (error) {
          addLog(`Error during test execution: ${error.message}`);
          setError(`Test execution failed: ${error.message}`);
          websocketService.disconnect();
        }
      } catch (error) {
        console.error('Error running tests:', error);
        setError(`Error running tests: ${error.message}`);
        addLog(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in test execution:', error);
      setError(`Error: ${error.message}`);
    } finally {
      // Ensure WebSocket is disconnected and running state is reset
      websocketService.disconnect();
      setRunningTests(false);
    }
  };
  
  const toggleRowExpand = (testId) => {
    setExpandedRows(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };
  
  const handleViewResults = () => {
    navigate('/results');
  };
  
  const formatMetricValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };
  
  const TestResultRow = ({ item }) => {
    return (
      <React.Fragment>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => toggleRowExpand(item.test.id)}
            >
              {expandedRows[item.test.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell
            align="center"
            width="40%"
            sx={{
              borderBottom: 'none',
              borderLeft: `4px solid ${
                CATEGORY_COLORS[item.test.category?.toLowerCase()] || '#757575'
              }`,
            }}
          >
            {item.test.name}
          </TableCell>
          <TableCell align="center" width="15%" sx={{ borderBottom: 'none' }}>
            <Chip
              label={item.test.category}
              size="small"
              sx={{
                bgcolor: CATEGORY_COLORS[item.test.category?.toLowerCase()] || '#757575',
                color: 'white',
                fontWeight: 500,
              }}
            />
          </TableCell>
          <TableCell>
            <SeverityChip severity={item.test.severity} />
          </TableCell>
          <TableCell>
            <StatusChip status={item.result.pass ? 'passed' : 'failed'} />
          </TableCell>
          <TableCell align="right">
            <ComplianceScoreGauge 
              score={item.result.score * 100} 
              size={36} 
              showPercent={false}
            />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={expandedRows[item.test.id]} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1, py: 2 }}>
                <Typography variant="subtitle2" gutterBottom component="div">
                  Test Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      {item.test.description}
                    </Typography>
                    
                    {item.result.metrics && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Metrics</Typography>
                        <Box component="dl" sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'auto 1fr',
                          rowGap: '4px',
                          columnGap: '8px'
                        }}>
                          {Object.entries(item.result.metrics).map(([key, value]) => (
                            <React.Fragment key={key}>
                              <Box component="dt" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                {key.replace(/_/g, ' ')}:
                              </Box>
                              <Box component="dd" sx={{ m: 0 }}>
                                {formatMetricValue(value)}
                              </Box>
                            </React.Fragment>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {item.result.recommendations && item.result.recommendations.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Recommendations
                        </Typography>
                        <Box component="ul" sx={{ 
                          m: 0, 
                          pl: 2,
                          '& li': {
                            mb: 1
                          }
                        }}>
                          {item.result.recommendations.map((rec, index) => (
                            <li key={index}>
                              <Typography variant="body2">{rec}</Typography>
                            </li>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  };
  
  const handleStartTests = () => {
    if (!selectedModelId) {
      setError('Please select a model configuration first');
      return;
    }
    navigate('/test-config');
  };
  
  /**
   * Process test results once they're complete
   * @param {Object} results - The test results
   * @param {Object} scores - The compliance scores
   */
  const processTestResults = (results, scores) => {
    // Calculate overall results
    const totalTests = Object.values(scores).reduce((sum, score) => sum + score.total, 0);
    const passedTests = Object.values(scores).reduce((sum, score) => sum + score.passed, 0);
    setTotalPassed(passedTests);
    setTotalFailed(totalTests - passedTests);
    const overallScoreValue = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    setOverallScore(overallScoreValue);
    addLog(`Overall results: ${passedTests}/${totalTests} tests passed (${overallScoreValue.toFixed(1)}%)`);
    
    // Set progress to 100% when done
    setTestProgress(100);
    setCurrentTestName('Completed');
    setTestComplete(true);
    
    // Save results to context
    saveTestResults(results, scores);
    
    // Save results to model storage service using the selected model ID
    saveModelTestResults(selectedModelId, {
      results: Object.entries(results).reduce((acc, [testId, testData]) => {
        acc[testId] = {
          test: testData.test,
          result: {
            ...testData.result,
            cases: testData.result.cases || [],
            questions: testData.result.questions || [],
            pairs: testData.result.pairs || [],
            details: {
              ...testData.result.details,
              failed_inputs: testData.result.details?.failed_inputs || []
            },
            metrics: testData.result.metrics || {},
            recommendations: testData.result.recommendations || [],
            timestamp: testData.result.timestamp || new Date().toISOString()
          }
        };
        return acc;
      }, {}),
      overallScore: overallScoreValue,
      totalTests,
      passedTests,
      timestamp: new Date().toISOString(),
      categoryScores: scores
    });
    
    addLog(`Test results saved for model: ${modelConfig?.modelName}`);
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Run Tests
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Model Configuration
          </Typography>
          
          {savedConfigs.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No saved model configurations found. Please configure a model first.
              <Button
                color="primary"
                onClick={() => navigate('/model-config')}
                sx={{ ml: 2 }}
              >
                Configure Model
              </Button>
            </Alert>
          ) : (
            <>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="model-select-label">Model Configuration</InputLabel>
                <Select
                  labelId="model-select-label"
                  value={selectedModelId}
                  onChange={handleModelSelect}
                  label="Model Configuration"
                >
                  <MenuItem value="">
                    <em>Select a model</em>
                  </MenuItem>
                  {savedConfigs.map((config) => (
                    <MenuItem key={config.id} value={config.id}>
                      {config.name || config.modelName} ({config.sub_type || config.modelType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              {selectedModelId && modelConfig && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Selected model: {modelConfig.modelName}
                </Alert>
              )}
              
              {selectedTests.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No tests selected. Please configure tests first.
                  <Button
                    color="primary"
                    onClick={() => navigate('/test-config')}
                    sx={{ ml: 2 }}
                  >
                    Configure Tests
                  </Button>
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartTests}
                  disabled={!selectedModelId || loading}
                  sx={{ mr: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Configure Tests'}
                </Button>
                
                {selectedTests.length > 0 && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleRunTests}
                    disabled={!selectedModelId || !selectedTests.length || loading || runningTests}
                    startIcon={<PlayArrowIcon />}
                  >
                    Run {selectedTests.length} Test{selectedTests.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Box>
      
      {/* Only show test section if a model is selected */}
      {selectedModelId ? (
        <>
          {selectedTests.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No tests have been selected. Please go back to Test Configuration to select tests.
            </Alert>
          ) : (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Test Summary
                </Typography>
                
                <Grid container spacing={2}>
                  {Object.entries(groupTestsByCategory()).map(([category, count]) => (
                    <Grid item xs={6} sm={4} md={3} key={category}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(0,0,0,0.03)', 
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.08)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              bgcolor: CATEGORY_COLORS[category.toLowerCase()] || '#757575',
                              mr: 1 
                            }} 
                          />
                          <Typography variant="body2">{category}</Typography>
                        </Box>
                        <Typography variant="h5" sx={{ mt: 1, fontWeight: 'medium' }}>
                          {count}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={verbose}
                      onChange={(e) => setVerbose(e.target.checked)}
                      disabled={runningTests}
                    />
                  }
                  label="Verbose Logging"
                />
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={runningTests ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleRunTests}
                  disabled={runningTests}
                >
                  {runningTests ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </Box>
              
              {(runningTests || testComplete) && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {runningTests ? `Running: ${currentTestName}` : 'Test Run Completed'}
                    </Typography>
                    <Typography variant="body2">
                      {Math.round(testProgress)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={testProgress} 
                    sx={{ height: 10, borderRadius: 1 }} 
                  />
                </Box>
              )}
              
              {verbose && (logs.length > 0 || runningTests) && (
                <Box 
                  ref={logContainerRef}
                  sx={{ 
                    maxHeight: 200, 
                    overflowY: 'auto', 
                    p: 2, 
                    bgcolor: 'rgba(0,0,0,0.03)', 
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    mb: 2
                  }}
                >
                  {logs.map((log, index) => (
                    <Box key={index} sx={{ mb: 0.5 }}>
                      {log}
                    </Box>
                  ))}
                  {runningTests && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={14} sx={{ mr: 1 }} />
                      Processing...
                    </Box>
                  )}
                </Box>
              )}
              
              {testComplete && (
                <>
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom>
                    Test Results Summary
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                          Total Tests
                        </Typography>
                        <Typography variant="h4">
                          {selectedTests.length}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                        <Typography variant="body2" color="success.main">
                          Tests Passed
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {totalPassed}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                        <Typography variant="body2" color="error.main">
                          Tests Failed
                        </Typography>
                        <Typography variant="h4" color="error.main">
                          {totalFailed}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ 
                    mt: 3, 
                    p: 3, 
                    borderRadius: 2, 
                    bgcolor: 'rgba(0,0,0,0.03)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" gutterBottom>
                      Overall Compliance Score
                    </Typography>
                    <ComplianceScoreGauge 
                      score={overallScore} 
                      size={120}
                      label={
                        overallScore >= 80 ? 'Excellent compliance level' : 
                        overallScore >= 50 ? 'Moderate compliance level' : 
                        'Low compliance level'
                      }
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                    Results by Category
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {Object.entries(complianceScores).map(([category, scores]) => {
                      const categoryScore = scores.total > 0 ? (scores.passed / scores.total) * 100 : 0;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={category}>
                          <Card>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Box 
                                  sx={{ 
                                    width: 12, 
                                    height: 12, 
                                    borderRadius: '50%', 
                                    bgcolor: CATEGORY_COLORS[category.toLowerCase()] || '#757575',
                                    mr: 1 
                                  }} 
                                />
                                <Typography variant="subtitle1">
                                  {category}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">
                                  Passed: {scores.passed}/{scores.total}
                                </Typography>
                                <Typography 
                                  variant="h6" 
                                  sx={{ 
                                    color: categoryScore >= 80 ? 'success.main' : 
                                            categoryScore >= 50 ? 'warning.main' : 
                                            'error.main'
                                  }}
                                >
                                  {categoryScore.toFixed(1)}%
                                </Typography>
                              </Box>
                              <ProgressBar value={categoryScore} sx={{ mt: 1 }} />
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                  
                  <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                    Detailed Test Results
                  </Typography>
                  
                  <TableContainer>
                    <Table aria-label="test results table">
                      <TableHead>
                        <TableRow>
                          <TableCell width={50} />
                          <TableCell>Test Name</TableCell>
                          <TableCell width={140}>Category</TableCell>
                          <TableCell width={100}>Severity</TableCell>
                          <TableCell width={100}>Status</TableCell>
                          <TableCell width={80} align="right">Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.values(testResults || {}).map((item) => {
                          if (!item || !item.test) {
                            console.warn('Invalid test result item:', item);
                            return null;
                          }
                          return <TestResultRow key={item.test.id} item={item} />;
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<RestartAltIcon />}
                      onClick={handleRunTests}
                    >
                      Run Tests Again
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<BarChartIcon />}
                      onClick={handleViewResults}
                    >
                      View Complete Results
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          )}
        </>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a model configuration above to run tests.
        </Alert>
      )}
    </Container>
  );
};

export default RunTestsPage;