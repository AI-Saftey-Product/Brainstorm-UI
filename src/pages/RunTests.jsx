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
import { runTests, getFilteredTests } from '../services/testsService';
import { createModelAdapter } from '../services/modelAdapter';
import { getSavedModelConfigs, getModelConfigById, saveTestResults as saveModelTestResults } from '../services/modelStorageService';
import websocketService from '../services/websocketService';
import WebSocketService from '../services/websocketService';
import testResultsService from '../services/testResultsService';

// Extract the TESTS_API_URL from environment for direct API calls
const TESTS_API_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

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
  
  // DEBUG: Add effect to track changes to test results
  useEffect(() => {
    console.log('[RESULTS-DEBUG] Test results state updated:', testResults);
    console.log('[RESULTS-DEBUG] Test results length:', testResults.length);
    console.log('[RESULTS-DEBUG] Test complete state:', testComplete);
  }, [testResults, testComplete]);
  
  // Add effect to periodically log WebSocket listeners during test execution
  useEffect(() => {
    let listenerCheckInterval = null;
    
    // Only run the interval when tests are running
    if (runningTests) {
      console.log('[LISTENER-DEBUG] Setting up listener check interval for test execution');
      
      // Log listeners immediately when tests start
      logActiveListeners('Test execution started');
      
      // Set up interval to check listeners every 5 seconds during test execution
      listenerCheckInterval = setInterval(() => {
        logActiveListeners('Periodic check during test execution');
      }, 5000);
    }
    
    // Clean up interval when tests complete or component unmounts
    return () => {
      if (listenerCheckInterval) {
        console.log('[LISTENER-DEBUG] Clearing listener check interval');
        clearInterval(listenerCheckInterval);
      }
    };
  }, [runningTests]);
  
  // Function to log active WebSocket listeners with detailed counts
  const logActiveListeners = (stage) => {
    console.log(`[LISTENER-DEBUG] === ACTIVE LISTENERS AT STAGE: ${stage} ===`);
    
    if (!websocketService) {
      console.log('[LISTENER-DEBUG] WebSocket service is not available');
      return;
    }
    
    const listenerCounts = {};
    let totalListeners = 0;
    
    // Count listeners for each event type
    Object.entries(websocketService.eventListeners).forEach(([type, listeners]) => {
      listenerCounts[type] = listeners.length;
      totalListeners += listeners.length;
    });
    
    console.log('[LISTENER-DEBUG] Total listeners:', totalListeners);
    console.log('[LISTENER-DEBUG] Listener counts by type:', listenerCounts);
    
    // Log detailed info about critical listeners
    const criticalEvents = ['test_complete', 'test_result', 'message'];
    criticalEvents.forEach(eventType => {
      const listeners = websocketService.eventListeners[eventType] || [];
      console.log(`[LISTENER-DEBUG] ${eventType} listeners (${listeners.length}):`);
      
      // For each listener, log a signature to help identify it
      listeners.forEach((listener, index) => {
        const functionString = listener.toString().slice(0, 50) + '...';
        console.log(`[LISTENER-DEBUG]   #${index + 1}: ${functionString}`);
      });
    });
    
    // Log connection state
    console.log('[LISTENER-DEBUG] WebSocket connected:', websocketService.isConnected());
    console.log('[LISTENER-DEBUG] WebSocket instance ID:', websocketService.instanceId);
  };
  
  // Add cleanup effect to disconnect WebSocket when leaving the page
  useEffect(() => {
    // This will run when the component unmounts
    return () => {
      console.log('[RESULTS-DEBUG] Component unmounting, disconnecting WebSocket');
      
      // Check if the WebSocket is connected before disconnecting
      if (websocketService.isConnected()) {
        console.log('[RESULTS-DEBUG] WebSocket is connected, disconnecting...');
        
        // If test is complete, make sure results are saved before disconnecting
        if (testComplete && testResults.length > 0) {
          console.log('[RESULTS-DEBUG] Test is complete with results, ensuring data is saved');
          
          // Save test results to context one last time to be safe
          if (typeof saveTestResults === 'function') {
            console.log('[RESULTS-DEBUG] Saving test results to context before disconnect');
            saveTestResults(testResults, complianceScores);
          }
        }
        
        // Disconnect but don't reset the WebSocket service to preserve persistent handlers
        websocketService.disconnect();
      } else {
        console.log('[RESULTS-DEBUG] WebSocket is not connected, no need to disconnect');
      }
      
      // Don't reset the WebSocket service on unmount to preserve persistent handlers
      console.log('[RESULTS-DEBUG] Component unmounting, but preserving websocket event handlers');
    };
  }, [testComplete, testResults, complianceScores, saveTestResults]);
  
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
    
    // Log listeners before WebSocket reset
    logActiveListeners('Before WebSocket reset');
    
    // Reset WebSocket service completely to ensure clean state
    websocketService.reset();
    addLog('WebSocket service reset to ensure clean state');
    
    // Log listeners after WebSocket reset
    logActiveListeners('After WebSocket reset');
    
    // DEBUG: Check WebSocket state before test run
    debugWebSocketState();
    
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
      
      try {
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
                // Log listeners when we receive a test result
                logActiveListeners('Received test_result message');
              
                // Handle individual test results
                const { test_id, test_name, status, score } = data;
                addLog(`Test completed: ${test_name} - ${status} (Score: ${score})`);
                
                // Validate the test result data
                if (!test_id || !test_name) {
                  console.warn('[RESULTS-DEBUG] Received invalid test_result data:', data);
                  return;
                }
                
                // Update the UI with the test result by adding it to the array
                setTestResults(prevResults => {
                  // Create a copy of previous results array (or initialize as empty array if not an array)
                  const newResults = Array.isArray(prevResults) ? [...prevResults] : [];
                  
                  // Check if this test is already in the results
                  const testIndex = newResults.findIndex(r => r.test_id === test_id);
                  
                  // Update or add the test result
                  if (testIndex !== -1) {
                    // Update existing test result
                    newResults[testIndex] = {
                      ...newResults[testIndex],
                      status,
                      score,
                      completed: true,
                      test_category: data.test_category || newResults[testIndex].test_category || 'unknown'
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
                      metrics: data.metrics || {},
                      created_at: new Date().toISOString()
                    });
                  }
                  
                  console.log('[RESULTS-DEBUG] Updated test results array now has', newResults.length, 'items');
                  
                  // If we're receiving individual test results, also construct a proper results object
                  // and save it to context immediately (don't wait for test_complete)
                  if (newResults.length > 0) {
                    console.log('[RESULTS-DEBUG] Creating results object from individual test result');
                    
                    // Format results for context using the same structure as in processTestResults
                    const resultsObject = {};
                    newResults.forEach(result => {
                      if (result && result.test_id) {
                        // Format expected by Results page
                        resultsObject[result.test_id] = {
                          test: {
                            id: result.test_id,
                            name: result.test_name,
                            category: result.test_category,
                            description: result.description || `Test for ${result.test_name}`,
                            severity: result.severity || 'medium'
                          },
                          result: {
                            pass: result.status === 'success' || result.status === 'passed',
                            score: result.score,
                            message: result.message || (result.status === 'success' ? 'Test passed successfully' : 'Test failed'),
                            details: result.analysis || {},
                            issues_found: result.issues_found || 0,
                            metrics: result.metrics || {},
                            timestamp: result.created_at || new Date().toISOString()
                          }
                        };
                      }
                    });
                    
                    // Calculate scores from results
                    const scoresData = {};
                    Object.values(resultsObject).forEach(item => {
                      if (!item || !item.test || !item.test.category) return;
                      
                      const category = item.test.category;
                      if (!scoresData[category]) {
                        scoresData[category] = { total: 0, passed: 0 };
                      }
                      
                      scoresData[category].total++;
                      if (item.result && item.result.pass) {
                        scoresData[category].passed++;
                      }
                    });
                    
                    console.log('[RESULTS-DEBUG] Saving preliminary results from test_result event:', 
                      Object.keys(resultsObject).length, 'tests');
                    console.log('[RESULTS-DEBUG] Saving preliminary scores for', 
                      Object.keys(scoresData).length, 'categories');
                    
                    // Save the current taskId so we can retrieve it when the test completes
                    if (taskId) {
                      // Save to database using the dedicated service
                      testResultsService.saveResults(taskId, resultsObject, scoresData)
                        .then(savedRecord => {
                          console.log('[RESULTS-DEBUG] Individual test results saved to database:', savedRecord);
                        })
                        .catch(error => {
                          console.error('[RESULTS-DEBUG] Failed to save test results to database:', error);
                        });
                    }
                    
                    // Update state with the formatted results object
                    setTestResultsDataSource({
                      taskId: taskId,
                      results: resultsObject,
                      scores: scoresData
                    });
                    
                    // Also update context for backward compatibility
                    if (typeof saveTestResults === 'function') {
                      saveTestResults(resultsObject, scoresData);
                    }
                  }
                  
                  return newResults;
                });
                break;
                
              case 'test_complete':
                console.log('SWITCH CASE: Processing test_complete message', data);
                console.log('[CRITICAL-DEBUG] Full test_complete message:', JSON.stringify(data, null, 2));
                
                // Mark test as complete first to update UI state
                setTestComplete(true);
                
                // Extract test run ID from the response
                const taskId = data.task_id || data.id || data.test_run_id;
                console.log('[CRITICAL-DEBUG] Task ID from test_complete message:', taskId);
                
                // Initialize results object
                let resultsForNavigation = {};
                let scoresForNavigation = {};
                
                // Case 1: Results in test_run structure (most common format)
                if (data.test_run && typeof data.test_run === 'object') {
                  console.log('[CRITICAL-DEBUG] Found test_run object in response');
                  
                  // Case 1.1: test_run contains results with test_results (newest format)
                  if (data.test_run.results && data.test_run.results.test_results) {
                    console.log('[CRITICAL-DEBUG] Found test_results in test_run.results');
                    resultsForNavigation = data.test_run.results.test_results;
                  } 
                  // Case 1.2: test_run contains test_results directly
                  else if (data.test_run.test_results) {
                    console.log('[CRITICAL-DEBUG] Found test_results directly in test_run');
                    resultsForNavigation = data.test_run.test_results;
                  }
                  // Case 1.3: test_run contains results directly
                  else if (data.test_run.results) {
                    console.log('[CRITICAL-DEBUG] Found results in test_run');
                    resultsForNavigation = data.test_run.results;
                  }
                  
                  // Extract scores if available
                  if (data.test_run.compliance_scores) {
                    scoresForNavigation = data.test_run.compliance_scores;
                  }
                }
                // Case 2: Results in top-level results object
                else if (data.results) {
                  console.log('[CRITICAL-DEBUG] Found results at top level');
                  
                  // Case 2.1: results contains test_results
                  if (data.results.test_results) {
                    console.log('[CRITICAL-DEBUG] Found test_results in results');
                    resultsForNavigation = data.results.test_results;
                  } else {
                    // Case 2.2: results is the results object
                    resultsForNavigation = data.results;
                  }
                  
                  // Extract scores if available
                  if (data.scores) {
                    scoresForNavigation = data.scores;
                  }
                }
                
                // Check if we got results
                if (resultsForNavigation && Object.keys(resultsForNavigation).length > 0) {
                  console.log('[CRITICAL-DEBUG] Successfully extracted results:', resultsForNavigation);
                  
                  // Check if results need conversion to the expected format with test and result properties
                  const sampleKey = Object.keys(resultsForNavigation)[0];
                  const sampleValue = resultsForNavigation[sampleKey];
                  
                  // If results don't have the expected structure, convert them
                  if (!sampleValue || !sampleValue.test || !sampleValue.result) {
                    console.log('[CRITICAL-DEBUG] Results need conversion to test/result format');
                    
                    const formattedResults = {};
                    Object.entries(resultsForNavigation).forEach(([key, value]) => {
                      // If it's an object with non-null value
                      if (value && typeof value === 'object') {
                        formattedResults[key] = {
                          test: {
                            id: key,
                            name: value.test_name || value.name || key,
                            category: value.category || value.test_category || 'unknown',
                            description: value.description || '',
                            severity: value.severity || 'medium'
                          },
                          result: {
                            pass: value.status === 'success' || value.status === 'passed' || value.pass === true,
                            score: value.score || 0,
                            message: value.message || '',
                            details: value.details || value.analysis || {},
                            timestamp: value.created_at || value.timestamp || new Date().toISOString()
                          }
                        };
                      }
                    });
                    
                    // Use formatted results if we have any
                    if (Object.keys(formattedResults).length > 0) {
                      resultsForNavigation = formattedResults;
                    }
                  }
                  
                  // Save results to context for global access
                  if (typeof saveTestResults === 'function') {
                    saveTestResults(resultsForNavigation, scoresForNavigation);
                    console.log('[CRITICAL-DEBUG] Saved results to context');
                    } else {
                    console.error('[CRITICAL-DEBUG] saveTestResults function not available!');
                  }
                  
                  // Also save to database for future retrieval
                  if (typeof testResultsService !== 'undefined' && testResultsService.saveResults) {
                    testResultsService.saveResults(taskId, resultsForNavigation, scoresForNavigation)
                      .then(() => console.log('[CRITICAL-DEBUG] Saved results to database'))
                      .catch(error => console.error('[CRITICAL-DEBUG] Error saving to database:', error));
                  }
                  
                  // Prepare data for navigation
                  const navigationState = {
                    taskId,
                    results: resultsForNavigation,
                    scores: scoresForNavigation
                  };
                  
                  // Log what we're passing to the Results page
                  console.log('[CRITICAL-DEBUG] Navigation state:', {
                    taskId,
                    resultsCount: Object.keys(resultsForNavigation).length,
                    scoresCount: Object.keys(scoresForNavigation).length
                  });
                  
                  // Navigate to Results page with the data
                  setRunningTests(false);
                  navigate('/results', { state: navigationState });
                } else {
                  console.error('[CRITICAL-DEBUG] No results extracted from test_complete message');
                  setError('No test results were found in the response. Please try again.');
                  setRunningTests(false);
                }
                break;
                
              case 'test_failed':
                console.log('SWITCH CASE: Processing test_failed message', data);
              // Log listeners when we receive a test failed message
              logActiveListeners('Received test_failed message');
              
                // Handle test failure
                console.error('Test failed:', data);
              setError(`Test failed: ${data.message || 'Unknown error'}`);
              setRunningTests(false);
                break;
                
              case 'connection_established':
                console.log('SWITCH CASE: Processing connection_established message', data);
              // Log listeners when connection is established
              logActiveListeners('Connection established');
              
                // Handle connection established
              addLog(`WebSocket connection established for test run ID: ${data.test_run_id}`);
              break;
              
            case 'test_started':
              console.log('SWITCH CASE: Processing test_started message', data);
              // Log listeners when a test starts
              logActiveListeners('Test started');
              
              // Handle test started
              addLog(`Test started: ${data.test_name} (${data.test_category})`);
                break;
                
              default:
                console.log('SWITCH CASE: Unknown message type:', msgType, data);
                // Handle unknown message type
                console.warn('Unknown message type:', msgType);
                break;
            }
          };
          
        // Register message handlers BEFORE connecting to WebSocket
        // Use persistentOn instead of on to keep handlers across resets/reconnections
        websocketService.persistentOn('message', processMessage);
        websocketService.persistentOn('test_status_update', processMessage);
        websocketService.persistentOn('test_result', processMessage);
        websocketService.persistentOn('test_complete', processMessage);
        websocketService.persistentOn('test_failed', processMessage);
        websocketService.persistentOn('test_started', processMessage);
        
        // DEBUG: Check handlers are registered
        debugWebSocketState();
        
        // Log listeners after registering handlers
        logActiveListeners('After registering WebSocket event handlers');
        
        // STEP 1: First connect to WebSocket without a task ID to get a new test run ID
        addLog('Connecting to WebSocket to get test run ID...');
        const wsResponse = await websocketService.connect();
        
        // Log listeners after WebSocket connection
        logActiveListeners('After WebSocket connection established');
        
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
        
        // Tests will now be executed and results will be received via WebSocket events
        addLog('Tests started. Waiting for results via WebSocket...');
      } catch (error) {
        // Handle any errors during test execution
        addLog(`Error during test execution: ${error.message}`);
        setError(`Test execution failed: ${error.message}`);
        // Always set runningTests to false in case of error
        setRunningTests(false);
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
    console.log('[RESULTS-DEBUG] Processing test results:', resultsData);
    
    if (!resultsData) {
      console.error('[RESULTS-DEBUG] No results data received');
      return {};
    }
    
    try {
      // Check if results are in test_run property (new API format)
      if (resultsData.test_run && resultsData.test_run.results) {
        console.log('[RESULTS-DEBUG] Found results in test_run object, using these instead');
        const testRun = resultsData.test_run;
        resultsData = testRun.results;
        
        // Also update scores if available
        if (testRun.compliance_scores) {
          scoresData = testRun.compliance_scores;
        }
      }
      
      // Check for deeply nested test_results (new response format)
      if (resultsData.results && resultsData.results.test_results) {
        console.log('[RESULTS-DEBUG] Found test_results in results object:', resultsData.results.test_results);
        console.log('[CRITICAL-DEBUG] test_results object structure:', JSON.stringify(resultsData.results.test_results, null, 2));
        
        // Also save metrics from the results object
        const metrics = {
          total_tests: resultsData.results.total_tests || 0,
          completed_tests: resultsData.results.completed_tests || 0,
          failed_tests: resultsData.results.failed_tests || 0
        };
        
        // This format already has test and result properties
        resultsData = resultsData.results.test_results;
        
        // If this format already has the right structure, we can return it directly
        if (typeof resultsData === 'object' && !Array.isArray(resultsData)) {
          const sampleKey = Object.keys(resultsData)[0];
          const sampleValue = resultsData[sampleKey];
          
          if (sampleValue && sampleValue.test && sampleValue.result) {
            console.log('[RESULTS-DEBUG] Results already in correct format, using directly');
            // This data already has the correct structure, so we can use it directly
            
            // Update the test results state with raw test results
            setTestResults(Object.values(resultsData).map(item => ({
              test_id: item.test.id,
              test_name: item.test.name,
              test_category: item.test.category,
              status: item.result.pass ? 'success' : 'failed',
              score: item.result.score,
              ...item
            })));
            
            // Set compliance scores if available
            if (scoresData) {
              console.log('[RESULTS-DEBUG] Setting compliance scores:', scoresData);
              setComplianceScores(scoresData);
            }
            
            // Save properly formatted object to context
            saveTestResults(resultsData, scoresData || {});
            console.log('[RESULTS-DEBUG] Saved test results to context directly');
            
            // Mark tests as completed
            setTestComplete(true);
            
            // For model-specific results, also save to local storage
            if (modelConfig && modelConfig.id) {
              try {
                console.log('[RESULTS-DEBUG] Saving model test results to local storage for model ID:', modelConfig.id);
                saveModelTestResults(modelConfig.id, Object.values(resultsData).map(item => ({
                  test_id: item.test.id,
                  test_name: item.test.name,
                  test_category: item.test.category,
                  status: item.result.pass ? 'success' : 'failed',
                  score: item.result.score,
                  ...item
                })));
              } catch (e) {
                console.error('[RESULTS-DEBUG] Error saving model test results:', e);
              }
            }
            
            return resultsData;
          }
        }
      }
      
      // Normalize results format
      let normalizedResults = resultsData;
      
      // If resultsData is an object with a 'results' property, use that
      if (!Array.isArray(resultsData) && resultsData.results) {
        console.log('[RESULTS-DEBUG] Results data is in object format with results property');
        normalizedResults = resultsData.results;
      }
      
      // If results is still not an array, make it one
      if (!Array.isArray(normalizedResults)) {
        console.warn('[RESULTS-DEBUG] Results data is not an array, attempting to convert');
        // Convert object to array if it's an object of test objects
        if (typeof normalizedResults === 'object') {
          normalizedResults = Object.values(normalizedResults);
      } else {
          normalizedResults = [normalizedResults];
        }
      }
      
      console.log('[RESULTS-DEBUG] Normalized results:', normalizedResults);
      
      // Update the test results state
      setTestResults(normalizedResults);
      
      // Process compliance scores if available
      if (scoresData) {
        console.log('[RESULTS-DEBUG] Setting compliance scores:', scoresData);
        setComplianceScores(scoresData);
      } else if (resultsData.scores) {
        console.log('[RESULTS-DEBUG] Setting compliance scores from results data:', resultsData.scores);
        setComplianceScores(resultsData.scores);
      }
      
      // IMPORTANT FIX: Convert array to object with test_id as keys for Results page compatibility
      const resultsObject = {};
      normalizedResults.forEach(result => {
        if (result && result.test_id) {
          // Format expected by Results page
          resultsObject[result.test_id] = {
            test: {
              id: result.test_id,
              name: result.test_name,
              category: result.test_category,
              description: result.description || `Test for ${result.test_name}`,
              severity: result.severity || 'medium'
            },
            result: {
              pass: result.status === 'success' || result.status === 'passed',
              score: result.score,
              message: result.message || (result.status === 'success' ? 'Test passed successfully' : 'Test failed'),
              details: result.analysis || {},
              issues_found: result.issues_found || 0,
              metrics: result.metrics || {},
              timestamp: result.created_at || new Date().toISOString()
            }
          };
        }
      });
      
      console.log('[RESULTS-DEBUG] Formatted results for context:', resultsObject);
      
      // Save properly formatted object to context
      saveTestResults(resultsObject, scoresData || resultsData.scores || {});
      console.log('[RESULTS-DEBUG] Saved test results to context');
      
      // Mark tests as completed
      setTestComplete(true);
      
      // For model-specific results, also save to local storage
      if (modelConfig && modelConfig.id) {
        try {
          console.log('[RESULTS-DEBUG] Saving model test results to local storage for model ID:', modelConfig.id);
          saveModelTestResults(modelConfig.id, normalizedResults);
        } catch (e) {
          console.error('[RESULTS-DEBUG] Error saving model test results:', e);
        }
      }
      
      return resultsObject;
    } catch (error) {
      console.error('[RESULTS-DEBUG] Error processing test results:', error);
      return {};
    }
  };
  
  // Add this function to test websocket connection state
  const debugWebSocketState = () => {
    console.log('[RESULTS-DEBUG] Testing websocket connection state');
    // Log the current websocket state
    console.log('[RESULTS-DEBUG] WebSocket connected:', websocketService.isConnected());
    // Log current listeners
    Object.keys(websocketService.eventListeners).forEach(type => {
      console.log(`[RESULTS-DEBUG] WebSocket listeners for ${type}:`, websocketService.eventListeners[type].length);
    });
  }
  
  // Function to manually trigger a test_complete event for debugging
  const testWebSocketListeners = () => {
    console.log('[LISTENER-DEBUG] === MANUALLY TESTING WEBSOCKET LISTENERS ===');
    
    // Create a fake test_complete event
    const fakeTestCompleteEvent = {
      type: 'test_complete',
      test_run_id: 'fake-test-run-id',
      results_available: true,
      message: 'Test execution completed successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log('[LISTENER-DEBUG] Created fake test_complete event:', fakeTestCompleteEvent);
    
    // Log current listeners before manual test
    logActiveListeners('Before manual test');
    
    // Try to process the message using our websocketService
    try {
      console.log('[LISTENER-DEBUG] Manually processing fake test_complete event');
      websocketService.processMessage(fakeTestCompleteEvent);
      
      // Also try direct notification
      console.log('[LISTENER-DEBUG] Directly notifying test_complete listeners');
      websocketService.notifyListeners('test_complete', fakeTestCompleteEvent);
      
      // Log listeners after manual test
      logActiveListeners('After manual test');
      
      console.log('[LISTENER-DEBUG] Manual test complete');
    } catch (error) {
      console.error('[LISTENER-DEBUG] Error during manual test:', error);
    }
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
              
              {/* Debug section - only visible in development mode */}
              {import.meta.env.DEV && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Debug Tools (Development Only)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => logActiveListeners('Manual check')}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Log Listeners
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={testWebSocketListeners}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Test WebSocket Handlers
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => websocketService.reset()}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Reset WebSocket
                    </Button>
                  </Box>
                </Box>
              )}
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