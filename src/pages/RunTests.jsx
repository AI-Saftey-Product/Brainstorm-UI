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
import TestDetailsPanel from '../components/tests/TestDetailsPanel';
import TestSidebar from '../components/tests/TestSidebar';
import { runTests, getFilteredTests } from '../services/testsService';
import { createModelAdapter } from '../services/modelAdapter';
import { getSavedModelConfigs, getModelConfigById, saveModelTestResults } from '../services/modelStorageService';
import websocketService from '../services/websocketService';
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
  
  // Add new state for real-time test details
  const [testDetails, setTestDetails] = useState([]);
  
  // Add new state for error severity
  const [errorSeverity, setErrorSeverity] = useState('error');
  
  // Add new state for selected test
  const [selectedTestId, setSelectedTestId] = useState(null);
  
  // Initialize test selection when component mounts
  useEffect(() => {
    // Priority: Tests from location state (from TestConfig page)
    // Second priority: tests from context (loaded from localStorage)
    // Default to empty array if neither is available
    const initialTests = location.state?.selectedTests || contextSelectedTests || [];
    setSelectedTests(initialTests);
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
  
  // Add cleanup effect to disconnect WebSocket when leaving the page
  useEffect(() => {
    // This will run when the component unmounts
    return () => {
      // Check if the WebSocket is connected before disconnecting
      if (websocketService.isConnected()) {
        // If test is complete, make sure results are saved before disconnecting
        if (testComplete && testResults.length > 0) {
          // Save test results to context one last time to be safe
          if (typeof saveTestResults === 'function') {
            saveTestResults(testResults, complianceScores);
          }
        }
        
        // Disconnect but don't reset the WebSocket service to preserve persistent handlers
        websocketService.disconnect();
      }
      
      // Don't reset the WebSocket service on unmount to preserve persistent handlers
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
          
          // Get tests compatible with this model (removed fetchTests which is undefined)
          // Load tests for the model by querying the API directly
          const apiParams = {
            modality: normalizedConfig.modality,
            model_type: normalizedConfig.sub_type
          };
          
          // Use the API directly instead of an undefined function
          const compatibleTests = await getFilteredTests(apiParams);
          
          // Now filter the selectedTests to only include compatible ones
          if (Array.isArray(compatibleTests) && selectedTests.length > 0) {
            const compatibleTestIds = compatibleTests.map(test => test.id);
            const filteredSelectedTests = selectedTests.filter(testId => 
              compatibleTestIds.includes(testId)
            );
            
            if (filteredSelectedTests.length !== selectedTests.length) {
              setSelectedTests(filteredSelectedTests);
            }
          }
        } catch (adapterError) {
          setError(`Failed to initialize model adapter: ${adapterError.message}`);
          setErrorSeverity('error');
        }
      } catch (error) {
        setError(`Failed to load model configuration: ${error.message}`);
        setErrorSeverity('error');
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
    // Reset test details and selected test when starting new tests
    setTestDetails([]);
    setSelectedTestId(null);
    
    if (!modelAdapter) {
      setError('No model adapter available. Please select a model configuration.');
      setErrorSeverity('error');
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
    
    try {
      setRunningTests(true);
      setError(null);
      setErrorSeverity('error'); // Reset error severity
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
      
      addLog(`Preparing test configuration with model ID: ${testConfig.model_id}`);
      
      try {
        // Create a reusable handler function that processes any message type
        const processMessage = (data) => {
          // If data doesn't have a type but is a string, try to parse it
          if (!data.type && typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // Silent error
            }
          }
          
          // Get the message type, defaulting to 'unknown' if not present
          const msgType = data.type || 'unknown';
          
          // Use switch statement to handle message types
          switch(msgType) {
            case 'test_status_update':
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
              // Handle individual test results
              const { test_id, test_name, status, score } = data;
              addLog(`Test completed: ${test_name} - ${status} (Score: ${score})`);
              
              // Validate the test result data
              if (!test_id || !test_name) {
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
                
                // If we're receiving individual test results, also construct a proper results object
                // and save it to context immediately (don't wait for test_complete)
                if (newResults.length > 0) {
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
                  
                  // Save the current taskId so we can retrieve it when the test completes
                  if (taskId) {
                    // Save to database using the dedicated service
                    testResultsService.saveResults(taskId, resultsObject, scoresData)
                      .then(savedRecord => {
                        // Success - no need to log
                      })
                      .catch(error => {
                        // Error - no need to log
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
              // Mark test as complete first to update UI state
              setTestComplete(true);
              
              // Extract test run ID from the response
              const taskId = data.task_id || data.id || data.test_run_id;
              
              // Initialize results object
              let resultsForNavigation = {};
              let scoresForNavigation = {};
              
              // Case 1: Results in test_run structure (most common format)
              if (data.test_run && typeof data.test_run === 'object') {
                // Case 1.1: test_run contains results with test_results (newest format)
                if (data.test_run.results && data.test_run.results.test_results) {
                  resultsForNavigation = data.test_run.results.test_results;
                } 
                // Case 1.2: test_run contains test_results directly
                else if (data.test_run.test_results) {
                  resultsForNavigation = data.test_run.test_results;
                }
                // Case 1.3: test_run contains results directly
                else if (data.test_run.results) {
                  resultsForNavigation = data.test_run.results;
                }
                
                // Extract scores if available
                if (data.test_run.compliance_scores) {
                  scoresForNavigation = data.test_run.compliance_scores;
                }
              }
              // Case 2: Results in top-level results object
              else if (data.results) {
                // Case 2.1: results contains test_results
                if (data.results.test_results) {
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
                // Save results to context for global access
                if (typeof saveTestResults === 'function') {
                  saveTestResults(resultsForNavigation, scoresForNavigation);
                }
                
                // Also save to database for future retrieval
                if (typeof testResultsService !== 'undefined' && testResultsService.saveResults) {
                  testResultsService.saveResults(taskId, resultsForNavigation, scoresForNavigation)
                    .then(() => {})
                    .catch(error => {});
                }
                
                // Prepare data for navigation
                const navigationState = {
                  taskId,
                  results: resultsForNavigation,
                  scores: scoresForNavigation
                };
                
                // Just set runningTests to false, but don't navigate away
                setRunningTests(false);
                // Display a success message in the UI
                setError(`Tests completed successfully!`);
                setErrorSeverity('success');
                setCurrentTask(taskId);
              } else {
                setError('No test results were found in the response. Please try again.');
                setErrorSeverity('error');
                setRunningTests(false);
              }
              break;
              
            case 'test_failed':
              // Handle test failure
              setError(`Test failed: ${data.message || 'Unknown error'}`);
              setErrorSeverity('error');
              setRunningTests(false);
              break;
              
            case 'connection_established':
              // Handle connection established
              addLog(`WebSocket connection established for test run ID: ${data.test_run_id}`);
              break;
              
            case 'test_started':
              // Handle test started
              addLog(`Test started: ${data.test_name} (${data.test_category})`);
              break;
              
            // Add handlers for the test detail messages
            case 'model_input':
              addLog(`Model Input (${data.test_id}): ${data.prompt_type} prompt received`);
              // Add to test details
              setTestDetails(prev => [...prev, {
                type: 'input',
                testId: data.test_id,
                content: data.prompt,
                promptType: data.prompt_type,
                timestamp: data.timestamp || new Date().toISOString()
              }]);
              break;
              
            case 'model_output':
              addLog(`Model Output (${data.test_id}): response received`);
              // Add to test details
              setTestDetails(prev => [...prev, {
                type: 'output',
                testId: data.test_id,
                content: data.output,
                timestamp: data.timestamp || new Date().toISOString()
              }]);
              break;
              
            case 'evaluation_result':
              addLog(`Evaluation (${data.test_id}): score ${data.evaluation.strong_reject_score || 'N/A'}`);
              // Add to test details
              setTestDetails(prev => [...prev, {
                type: 'evaluation',
                testId: data.test_id,
                content: data.evaluation,
                timestamp: data.timestamp || new Date().toISOString()
              }]);
              break;
              
            default:
              // Handle unknown message type
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
        
        // Add handlers for the test detail messages
        websocketService.persistentOn('model_input', processMessage);
        websocketService.persistentOn('model_output', processMessage);
        websocketService.persistentOn('evaluation_result', processMessage);
        
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
        
        // Tests will now be executed and results will be received via WebSocket events
        addLog('Tests started. Waiting for results via WebSocket...');
      } catch (error) {
        // Handle errors in test initialization
        setError(`Error running tests: ${error.message}`);
        setErrorSeverity('error');
        addLog(`Error: ${error.message}`);
      }
    } catch (error) {
      // Handle errors in test initialization
      setError(`Error running tests: ${error.message}`);
      setErrorSeverity('error');
      addLog(`Error: ${error.message}`);
    } finally {
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
    navigate('/results', { 
      state: { 
        taskId: currentTask,
        results: testResultsDataSource.results,
        scores: testResultsDataSource.scores
      }
    });
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
      setErrorSeverity('error');
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
    if (!resultsData) {
      return {};
    }
    
    try {
      // Check if results are in test_run property (new API format)
      if (resultsData.test_run && resultsData.test_run.results) {
        const testRun = resultsData.test_run;
        resultsData = testRun.results;
        
        // Also update scores if available
        if (testRun.compliance_scores) {
          scoresData = testRun.compliance_scores;
        }
      }
      
      // Check for deeply nested test_results (new response format)
      if (resultsData.results && resultsData.results.test_results) {
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
              setComplianceScores(scoresData);
            }
            
            // Save properly formatted object to context
            saveTestResults(resultsData, scoresData || {});

            // Mark tests as completed
            setTestComplete(true);
            
            // For model-specific results, also save to local storage
            if (modelConfig && modelConfig.id) {
              try {
                saveModelTestResults(modelConfig.id, Object.values(resultsData).map(item => ({
                  test_id: item.test.id,
                  test_name: item.test.name,
                  test_category: item.test.category,
                  status: item.result.pass ? 'success' : 'failed',
                  score: item.result.score,
                  ...item
                })));
              } catch (e) {
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
        normalizedResults = resultsData.results;
      }
      
      // If results is still not an array, make it one
      if (!Array.isArray(normalizedResults)) {
        normalizedResults = [normalizedResults];
      }
      
      // Update the test results state
      setTestResults(normalizedResults);
      
      // Process compliance scores if available
      if (scoresData) {
        setComplianceScores(scoresData);
      } else if (resultsData.scores) {
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
      
      // Save properly formatted object to context
      saveTestResults(resultsObject, scoresData || {});

      // Mark tests as completed
      setTestComplete(true);
      
      // For model-specific results, also save to local storage
      if (modelConfig && modelConfig.id) {
        try {
          saveModelTestResults(modelConfig.id, normalizedResults);
        } catch (e) {
        }
      }
      
      return resultsObject;
    } catch (error) {
      return {};
    }
  };
  
  // Remove DEBUG effect for tracking changes to test results
  useEffect(() => {
    // Test results and completion state are tracked in state
  }, [testResults, testComplete]);
  
  // Add handler for selecting a test
  const handleSelectTest = (testId) => {
    setSelectedTestId(testId === selectedTestId ? null : testId);
  };
  
  // Listen for the custom event to clear selected test
  useEffect(() => {
    const handleClearSelectedTest = () => {
      setSelectedTestId(null);
    };
    
    window.addEventListener('clearSelectedTest', handleClearSelectedTest);
    return () => {
      window.removeEventListener('clearSelectedTest', handleClearSelectedTest);
    };
  }, []);
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Run Tests
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
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
                <Alert 
                  severity={errorSeverity} 
                  sx={{ mb: 3 }}
                  action={
                    errorSeverity === 'success' && (
                      <Button 
                        color="inherit" 
                        size="small"
                        onClick={handleViewResults}
                      >
                        View Full Results
                      </Button>
                    )
                  }
                >
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
            <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Test Summary ({selectedTests.length} Tests Selected)
                </Typography>
                
                <Grid container spacing={2}>
                  {Object.entries(groupTestsByCategory()).map(([category, tests]) => (
                    <Grid item xs={6} sm={4} md={3} key={category}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(0,0,0,0.03)', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: 'none'
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
      
      {/* Replace the TestDetailsPanel with the split view */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4} lg={3}>
          <TestSidebar
            selectedTests={selectedTests}
            testResults={testResults}
            availableTests={availableTests}
            testDetails={testDetails}
            runningTests={runningTests}
            currentTestName={currentTestName}
            onSelectTest={handleSelectTest}
            selectedTestId={selectedTestId}
          />
        </Grid>
        <Grid item xs={12} md={8} lg={9}>
          <TestDetailsPanel 
            testDetails={testDetails} 
            runningTests={runningTests} 
            selectedTestId={selectedTestId}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default RunTestsPage;