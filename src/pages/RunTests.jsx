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
  const [testResults, setTestResults] = useState([]);
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
  
  // Add new state for test results data source
  const [testResultsDataSource, setTestResultsDataSource] = useState([]);
  
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
    const grouped = {};
    
    // Only process selected tests
    if (Array.isArray(availableTests) && Array.isArray(selectedTests)) {
      // Get only the selected tests' details
      const selectedTestDetails = availableTests.filter(test => selectedTests.includes(test.id));
      
      // Group the selected tests by category
      selectedTestDetails.forEach(test => {
          const category = test.category;
          if (!grouped[category]) {
            grouped[category] = [];
          }
        grouped[category].push(test.id);
      });
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
    setTestResults([]);
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
    setTestResults([]);
    setComplianceScores({});
    setExpandedRows({});
    setTestProgress(0);
    setCurrentTestName('Initializing...');
    setError(null);
    
    // Clear log and add header
    setLogs([]);
    addLog('Starting test run...');
    
    // Reset WebSocket service completely to ensure clean state
    websocketService.reset();
    addLog('WebSocket service reset to ensure clean state');
    
    // Debug logging for model adapter
    console.log('Model adapter state before running tests:', modelAdapter);
    console.log('Model ID from adapter:', modelAdapter.modelId);
    console.log('Selected model from config:', modelConfig?.selectedModel);
    
    try {
      setRunningTests(true);
      setError(null);
      setTestResults([]);
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
      addLog(`Preparing test configuration with model ID: ${testConfig.model_id}`);
      
      // Setup variables for tracking results
      let completed = false;
      let results = {};
      let scores = {};
      
      try {
        // STEP 1: First connect to WebSocket without a task ID to get a new test run ID
        addLog('Connecting to WebSocket to get test run ID...');
        const wsResponse = await websocketService.connect();
        
        // Extract test run ID from WebSocket response
        if (!wsResponse || !wsResponse.test_run_id) {
          throw new Error('Failed to get test run ID from WebSocket');
        }
        
        const testRunId = wsResponse.test_run_id;
        addLog(`Received test run ID from WebSocket: ${testRunId}`);
        
        // STEP 2: Now run the tests using the test run ID from the WebSocket
        addLog(`Starting tests with test run ID: ${testRunId}...`);
        const taskId = await runTests(
          selectedTests,
          testConfig,
          { ...testParameters, test_run_id: testRunId },
          verbose ? logCallback : null
        );
        
        // Validate task ID
        if (!taskId) {
          throw new Error('No task ID returned from the API. Test run could not be initiated.');
        }
        
        addLog(`Test run initiated with task ID: ${taskId}`);
        
        // Verify the task ID matches the test run ID from WebSocket
        if (taskId !== testRunId) {
          addLog(`Warning: Task ID from API (${taskId}) differs from WebSocket test run ID (${testRunId}). Using WebSocket ID for monitoring.`);
        }
        
        // The WebSocket connection is already established - no need to reconnect

        // Set up a promise that will resolve when test completion is received
        const testCompletionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout waiting for test completion'));
          }, 300000); // 5 minutes timeout

          // Create a reusable handler function that processes any message type
          const processMessage = (data) => {
            console.log('HANDLER CALLED: Processing message:', data);
            
            // If data doesn't have a type but is a string, try to parse it
            if (!data.type && typeof data === 'string') {
              try {
                data = JSON.parse(data);
                console.log('Parsed string message into:', data);
              } catch (e) {
                console.log('Could not parse string message:', data);
              }
            }
            
            // Get the message type, defaulting to 'unknown' if not present
            const msgType = data.type || 'unknown';
            console.log(`HANDLER: Processing message of type: ${msgType}`);
            
            // Use switch statement to handle message types
            switch(msgType) {
              case 'test_status_update':
                console.log('SWITCH CASE: Processing test_status_update message', data);
                // Handle test status updates
                const { progress, current_test, test_stats } = data;
                if (progress) {
                  setTestProgress(progress);
                }
                if (current_test) {
                  setCurrentTestName(current_test);
                }
                if (test_stats) {
                  setTestStats(test_stats);
                }
                break;
                
              case 'test_result':
                console.log('SWITCH CASE: Processing test_result message', data);
                // Handle individual test results
                const { test_id, test_name, status, score } = data;
                addLog(`Test completed: ${test_name} - ${status} (Score: ${score})`);
                
                // Update the UI with the test result by adding it to the array
                setTestResults(prevResults => {
                  // Create a copy of previous results array (or initialize as empty array if not an array)
                  const newResults = Array.isArray(prevResults) ? [...prevResults] : [];
                  
                  // Check if this test is already in the results
                  const testIndex = newResults.findIndex(r => r.test_id === test_id);
                  
                  if (testIndex !== -1) {
                    // Update existing test result
                    newResults[testIndex] = {
                      ...newResults[testIndex],
                      status,
                      score,
                      completed: true
                    };
                  } else {
                    // Add new test result
                    newResults.push({
                      test_id,
                      test_name,
                      status,
                      score,
                      completed: true,
                      // Add other properties if available in the data
                      test_category: data.test_category || 'unknown',
                      issues_found: data.issues_found || 0,
                      metrics: data.metrics || {}
                    });
                  }
                  return newResults;
                });
                break;
                
              case 'test_complete':
                console.log('SWITCH CASE: Processing test_complete message', data);
                // Handle test completion
                console.log('Test completion received:', data);
                clearTimeout(timeout);
                websocketService.off('message', processMessage);
                websocketService.off('test_complete', processMessage);
                websocketService.off('test_result', processMessage);
                websocketService.off('test_status_update', processMessage);
                websocketService.off('test_failed', processMessage);
                
                // Mark that test is complete, but keep runningTests true until we've processed results
                setTestComplete(true);
                
                // If results are available, fetch them
                if (data.results_available) {
                  console.log('SWITCH CASE: results_available is true, fetching results');
                  addLog('Test results available, fetching full results...');
                  console.log('ATTEMPTING TO FETCH RESULTS FOR TEST RUN ID:', testRunId);
                  
                  // Add retry logic - try up to 3 times if fetching fails
                  let retryCount = 0;
                  const maxRetries = 3;
                  
                  const fetchWithRetry = async () => {
                    try {
                      console.log('STARTING FETCH ATTEMPT', retryCount + 1);
                      const results = await getTestResults(testRunId);
                      console.log('FETCH SUCCEEDED, RESULTS:', results);
                      addLog('Full test results received');
                      console.log('Results from getTestResults:', results);
                      processTestResults(results);
                      // Only set runningTests to false AFTER we've processed results
                      setRunningTests(false);
                      resolve(results);
                    } catch (error) {
                      console.log('FETCH FAILED:', error.message);
                      retryCount++;
                      console.error(`Error fetching test results (attempt ${retryCount}/${maxRetries}):`, error);
                      if (retryCount < maxRetries) {
                        addLog(`Retry ${retryCount}/${maxRetries} fetching results...`);
                        // Wait a bit longer between each retry
                        setTimeout(fetchWithRetry, 2000 * retryCount);
                      } else {
                        console.error('Max retries reached, giving up');
                        addLog('Failed to fetch results after multiple attempts');
                        // Even if we fail, we should set runningTests to false
                        setRunningTests(false);
                        reject(error);
                      }
                    }
                  };
                  
                  fetchWithRetry();
                } else {
                  console.log('SWITCH CASE: results_available is false, starting polling');
                  addLog('No results available yet, will poll for results...');
                  // Start polling for results
                  const pollInterval = setInterval(async () => {
                    try {
                      console.log('POLLING: Fetching results...');
                      const results = await getTestResults(testRunId);
                      console.log('POLLING: Received results:', results);
                      if (results && results.length > 0) {
                        console.log('POLLING: Valid results received, clearing interval');
                        clearInterval(pollInterval);
                        addLog('Results received through polling');
                        console.log('Results from polling:', results);
                        processTestResults(results);
                        // Only set runningTests to false AFTER we've processed results
                        setRunningTests(false);
                        resolve(results);
                      } else {
                        console.log('POLLING: No results yet, continuing to poll');
                      }
                    } catch (error) {
                      console.error('POLLING: Error polling for results:', error);
                      clearInterval(pollInterval);
                      // Even if we fail, we should set runningTests to false
                      setRunningTests(false);
                      reject(error);
                    }
                  }, 5000); // Poll every 5 seconds
                }
                break;
                
              case 'test_failed':
                console.log('SWITCH CASE: Processing test_failed message', data);
                // Handle test failure
                console.error('Test failed:', data);
                clearTimeout(timeout);
                websocketService.off('message', processMessage);
                websocketService.off('test_complete', processMessage);
                websocketService.off('test_result', processMessage);
                websocketService.off('test_status_update', processMessage);
                websocketService.off('test_failed', processMessage);
                reject(new Error(data.message || 'Test failed'));
                break;
                
              case 'connection_established':
                console.log('SWITCH CASE: Processing connection_established message', data);
                // Handle connection established
                addLog(`WebSocket connection established for test run ID: ${testRunId}`);
                break;
                
              default:
                console.log('SWITCH CASE: Unknown message type:', msgType, data);
                // Handle unknown message type
                console.warn('Unknown message type:', msgType);
                break;
            }
          };
          
          // Register both generic and specific event handlers to catch all messages
          websocketService.on('message', processMessage);
          
          // Also register for specific event types to catch direct emits
          websocketService.on('test_status_update', processMessage);
          websocketService.on('test_result', processMessage);
          websocketService.on('test_complete', processMessage);
          websocketService.on('test_failed', processMessage);
        });
        
        // Wait for test completion
        await testCompletionPromise;
        
        // Only disconnect after we've fully processed the results
        addLog('Test complete - keeping WebSocket connection open until results are fully processed');
        setTestComplete(true);
        
        // Navigate to results page
        navigate('/results');
      } catch (error) {
        // Handle any errors during test execution
        addLog(`Error during test execution: ${error.message}`);
        setError(`Test execution failed: ${error.message}`);
        // Always set runningTests to false in case of error
        setRunningTests(false);
      } finally {
        // Don't disconnect here, let the cleanup effect handle it
        // NOTE: DON'T set runningTests to false here - it's already been handled elsewhere
      }
    } catch (error) {
      // Handle errors in test initialization
      console.error('Error running tests:', error);
      setError(`Error running tests: ${error.message}`);
      addLog(`Error: ${error.message}`);
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
    // Early return if item is not in the expected format
    if (!item || !item.test_id) {
      console.warn('Invalid test result item:', item);
      return null;
    }

    const category = item.test_category?.toLowerCase() || 'unknown';
    
    return (
      <React.Fragment>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => toggleRowExpand(item.test_id)}
            >
              {expandedRows[item.test_id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell
            align="center"
            width="40%"
            sx={{
              borderBottom: 'none',
              borderLeft: `4px solid ${
                CATEGORY_COLORS[category] || '#757575'
              }`,
            }}
          >
            {item.test_name}
          </TableCell>
          <TableCell align="center" width="15%" sx={{ borderBottom: 'none' }}>
            <Chip
              label={item.test_category}
              size="small"
              sx={{
                bgcolor: CATEGORY_COLORS[category] || '#757575',
                color: 'white',
                fontWeight: 500,
              }}
            />
          </TableCell>
          <TableCell>
            <SeverityChip severity={item.issues_found > 0 ? 'high' : 'low'} />
          </TableCell>
          <TableCell>
            <StatusChip status={item.status === 'success' ? 'passed' : 'failed'} />
          </TableCell>
          <TableCell align="right">
            <ComplianceScoreGauge 
              score={item.score * 100} 
              size={36} 
              showPercent={false}
            />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={expandedRows[item.test_id]} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1, py: 2 }}>
                <Typography variant="subtitle2" gutterBottom component="div">
                  Test Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    {item.metrics && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Performance Metrics</Typography>
                        <Box component="dl" sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'auto 1fr',
                          rowGap: '4px',
                          columnGap: '8px'
                        }}>
                          {item.metrics.optimization_stats?.performance_stats && (
                            <>
                              <Box component="dt" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                Total Time:
                              </Box>
                              <Box component="dd" sx={{ m: 0 }}>
                                {formatMetricValue(item.metrics.optimization_stats.performance_stats.total_time)}s
                              </Box>
                              <Box component="dt" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                Operations:
                              </Box>
                              <Box component="dd" sx={{ m: 0 }}>
                                {item.metrics.optimization_stats.performance_stats.operation_count}
                              </Box>
                            </>
                          )}
                          {item.metrics.test_results?.performance_metrics && (
                            <>
                              <Box component="dt" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                Test Time:
                              </Box>
                              <Box component="dd" sx={{ m: 0 }}>
                                {formatMetricValue(item.metrics.test_results.performance_metrics.total_time)}s
                              </Box>
                              <Box component="dt" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                Examples:
                              </Box>
                              <Box component="dd" sx={{ m: 0 }}>
                                {item.metrics.test_results.n_examples}
                              </Box>
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {item.metrics?.test_results?.results && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Test Examples
                        </Typography>
                        <Box sx={{ 
                          maxHeight: 300,
                          overflowY: 'auto',
                          '& > div': {
                            mb: 2,
                            p: 2,
                            bgcolor: 'rgba(0,0,0,0.03)',
                            borderRadius: 1
                          }
                        }}>
                          {item.metrics.test_results.results.map((result, index) => (
                            <div key={index}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Input:
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {result.input}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Output:
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {result.output}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Expected:
                              </Typography>
                              <Typography variant="body2">
                                {result.expected}
                              </Typography>
                            </div>
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
   * Process test results and update the UI
   * @param {Object|Array} resultsData - The test results data
   * @param {Object} scoresData - The compliance scores data
   */
  const processTestResults = (resultsData, scoresData) => {
    console.log('Raw results received:', resultsData);
    console.log('Raw scores received:', scoresData);
    
    // Get existing results we've already collected from WebSocket messages
    let existingResults = testResults || [];
    console.log('Existing results from WebSocket messages:', existingResults);
    
    // Handle different result structures
    let results = [];
    let scores = scoresData;
    
    // If we're handling API results (not individual WebSocket results)
    if (resultsData) {
      // Special case for the problematic structure we're seeing in logs
      if (resultsData && resultsData.results && 
          typeof resultsData.results === 'object' && 
          resultsData.results.results && 
          Array.isArray(resultsData.results.results)) {
        console.log('Found double-nested structure, extracting results array', resultsData.results.results);
        results = resultsData.results.results;
        
        // Also extract compliance scores if available
        if (resultsData.results.compliance_scores) {
          console.log('Extracting compliance scores from double-nested structure');
          scores = resultsData.results.compliance_scores;
        }
      }
      // Continue with normal handling if the special case doesn't apply
      else if (resultsData && resultsData.results) {
        // We have a nested structure
        console.log('Found nested results structure:', resultsData.results);
        
        // Check if results is nested inside another results object
        if (resultsData.results.results && Array.isArray(resultsData.results.results)) {
          console.log('Found double-nested results structure:', resultsData.results.results);
          results = resultsData.results.results;
          
          // If scores aren't provided separately, use the ones in results
          if (!scoresData && resultsData.results.compliance_scores) {
            console.log('Using compliance scores from double-nested structure:', resultsData.results.compliance_scores);
            scores = resultsData.results.compliance_scores;
          }
        }
        // Or it might be returning a structure like {results: [...]}
        else if (Array.isArray(resultsData.results)) {
          console.log('Found nested results structure:', resultsData.results);
          results = resultsData.results;
          
          // If scores aren't provided separately, use the ones in results
          if (!scoresData && resultsData.compliance_scores) {
            console.log('Using compliance scores from nested structure:', resultsData.compliance_scores);
            scores = resultsData.compliance_scores;
          }
        }
        // Or the results field might be an object with test IDs as keys
        else if (typeof resultsData.results === 'object' && !Array.isArray(resultsData.results)) {
          console.log('Results is an object, converting to array:', resultsData.results);
          results = Object.values(resultsData.results);
        }
      } else if (Array.isArray(resultsData)) {
        // Results is directly an array
        console.log('Results is directly an array of length:', resultsData.length);
        results = resultsData;
      } else {
        console.log('Using existing results collected from WebSocket messages');
        results = existingResults;
      }
    } else {
      // If no API results, use what we've collected
      console.log('No API results, using existing results collected from WebSocket');
      results = existingResults;
    }
    
    // Merge any API results with existing WebSocket results
    if (results.length > 0 && existingResults.length > 0) {
      console.log('Merging API results with WebSocket results');
      
      // Create a map of test IDs we already have
      const existingTestIds = new Set(existingResults.map(r => r.test_id));
      
      // Add only results we don't already have
      results.forEach(result => {
        if (!existingTestIds.has(result.test_id)) {
          existingResults.push(result);
        }
      });
      
      // Use the merged results
      results = existingResults;
    }
    
    // Ensure results is an array
    if (!Array.isArray(results)) {
      console.error('Results is not an array after processing:', results);
      
      // Try one more level of extraction for specific API response formats
      if (results && typeof results === 'object') {
        // For {results: Array} format
        if (results.results && Array.isArray(results.results)) {
          console.log('Extracting results array from inner results property');
          results = results.results;
        }
        // For object with test ID keys
        else {
          console.log('Converting results object to array');
          results = Object.values(results);
        }
      }
      
      // Final check that results is an array
      if (!Array.isArray(results)) {
        console.error('Failed to extract results array from data:', results);
        setError('Invalid test results format: could not extract results array');
        return;
      }
    }
    
    console.log('Processing results array of length:', results.length);
    
    // Calculate overall results
    // If scores is not provided or is invalid, calculate them from the results
    if (!scores || typeof scores !== 'object') {
      console.log('No scores provided, calculating from results');
      scores = {};
      
      // Group results by category and calculate scores
      results.forEach(item => {
        if (!item || !item.test_category) return;
        
        const category = item.test_category;
        if (!scores[category]) {
          scores[category] = { total: 0, passed: 0 };
        }
        
        scores[category].total++;
        if (item.status === 'success' || item.status === 'passed') {
          scores[category].passed++;
        }
      });
      console.log('Calculated scores:', scores);
    }
    
    // Process and store test results - handle array structure
    const processedResults = results.map(item => {
      console.log('Processing item:', item);
      if (!item) {
        console.warn('Invalid item in results:', item);
        return null;
      }
      
      return {
        id: item.test_id,
        test_id: item.test_id,
        test_name: item.test_name,
        test_category: item.test_category,
        status: item.status,
        score: item.score,
        issues_found: item.issues_found,
        metrics: item.metrics || {},
        created_at: item.created_at,
        analysis: item.analysis || {}
      };
    }).filter(Boolean); // Remove any null items

    console.log('Processed results array length:', processedResults.length);
    
    // Set the data source for the table
    setTestResultsDataSource(processedResults);
    console.log('Updated testResultsDataSource with processed results');
    
    // Save results to context - convert array to object format expected by Results.jsx
    const resultsObject = processedResults.reduce((acc, item) => {
      if (item && item.test_id) {
        // Create the nested structure expected by TestResultTable component
        acc[item.test_id] = {
          test: {
            id: item.test_id,
            name: item.test_name,
            category: item.test_category,
            description: item.description || `Test for ${item.test_name}`,
            severity: item.severity || 'medium'
          },
          result: {
            pass: item.status === 'success' || item.status === 'passed',
            score: item.score,
            message: item.message || (item.status === 'success' ? 'Test passed successfully' : 'Test failed'),
            details: item.analysis || item.issues_found || {},
            metrics: item.metrics || {},
            timestamp: item.created_at
          }
        };
      }
      return acc;
    }, {});
    
    console.log('Results object formatted for UI with keys:', Object.keys(resultsObject));
    console.log('Compliance scores formatted for UI:', scores);
    
    // Save to context
    console.log('About to save results to context, saveTestResults function exists:', typeof saveTestResults === 'function');
    
    if (typeof saveTestResults === 'function') {
      try {
        saveTestResults(resultsObject, scores);
        console.log('Successfully saved results and scores to app context');
      } catch (error) {
        console.error('Error saving results to context:', error);
        addLog(`Error saving results: ${error.message}`);
      }
    } else {
      console.error('saveTestResults is not a function');
      addLog('Error: Could not save test results - function not available');
    }
    
    // Reset table expansion state
    setExpandedRows({});
    
    // Set progress to 100% when done
    setTestProgress(100);
    setCurrentTestName('Completed');
    setTestComplete(true);
    
    const totalTests = Object.values(scores || {}).reduce((sum, score) => sum + score.total, 0);
    const passedTests = Object.values(scores || {}).reduce((sum, score) => sum + score.passed, 0);
    setTotalPassed(passedTests);
    setTotalFailed(totalTests - passedTests);
    const overallScoreValue = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    setOverallScore(overallScoreValue);
    addLog(`Overall results: ${passedTests}/${totalTests} tests passed (${overallScoreValue.toFixed(1)}%)`);
    
    // Save results to model storage service
    saveModelTestResults(selectedModelId, {
      results: resultsObject,
      overallScore: overallScoreValue,
      totalTests,
      passedTests,
      timestamp: new Date().toISOString(),
      categoryScores: scores || {}
    });
    
    addLog(`Test results saved for model: ${modelConfig?.modelName}`);
    
    // Log the state of testResultsDataSource after saving
    console.log('Final testResultsDataSource state:', testResultsDataSource);
  };
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Only reset WebSocket if we're not in the middle of a test run
      // and we're not waiting for results
      if (!runningTests && !testComplete) {
        addLog('Component unmounting, closing WebSocket connection');
        websocketService.reset();
      } else {
        addLog('Component unmounting during test run or results processing, keeping WebSocket connection open');
      }
      
      // DO NOT set runningTests to false here - it can interfere with test progress
      // setRunningTests(false); - REMOVED
      
      // Only clean up the error state
      setError(null);
    };
  }, [runningTests, testComplete]);

  // Add a new effect to handle WebSocket cleanup after results are processed
  useEffect(() => {
    if (testComplete && !runningTests) {
      // Only disconnect after we've fully processed the results
      setTimeout(() => {
        addLog('Test complete and results processed, closing WebSocket connection');
        websocketService.disconnect();
      }, 2000); // Add a 2-second delay to ensure all results are processed
    }
  }, [testComplete, runningTests]);
  
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
                  Test Summary ({selectedTests.length} Tests Selected)
                </Typography>
                
                <Grid container spacing={2}>
                  {Object.entries(groupTestsByCategory()).map(([category, tests]) => (
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
                          {tests.length}
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
                      {runningTests ? `Running: ${currentTestName}` : 'Test execution complete'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          )}
        </>
      ) : null}
    </Container>
  );
};

export default RunTestsPage;