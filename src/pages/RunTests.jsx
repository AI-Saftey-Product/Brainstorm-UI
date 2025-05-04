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
  Stack,
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
import { getModelConfigById, saveModelTestResults } from '../services/modelStorageService';
import websocketService from '../services/websocketService';
import testResultsService from '../services/testResultsService';
import { fetchWithAuth } from "@/pages/Login.jsx";

// Extract the API_BASE_URL from environment for direct API calls
const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

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
    const configs = [];
    setSavedConfigs(configs);
  };
  
  // Load model configuration on mount
  useEffect(() => {
    const loadModelConfig = async () => {
      try {
        setLoading(true);
        // Use the model config passed from the wizard
        let config = location.state?.modelConfig;
        
        if (!config) {
          // Only show error if no configuration was passed
          setError('No model configuration provided. Please go back to the test wizard.');
          setLoading(false);
          return;
        }
        
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
        
        // Immediately initialize the model adapter
        try {
          const adapter = await createModelAdapter(config);
          setModelAdapter(adapter);
          
          // Use the selected tests from navigation state
          if (location.state?.selectedTests && location.state.selectedTests.length > 0) {
            setSelectedTests(location.state.selectedTests);
          }
          
        } catch (adapterError) {
          setError(`Failed to initialize model adapter: ${adapterError.message}`);
          setErrorSeverity('error');
        }
      } catch (err) {
        setError('Failed to load model configuration');
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
      
      // Create a test configuration object that explicitly includes all required fields for the API
      const testConfig = {
        // Ensure we have all the required fields with the correct names
        name: modelConfig?.name || modelConfig?.modelName || 'Unnamed Model',
        modality: modelConfig?.modality || modelConfig?.modelCategory || 'NLP',
        sub_type: modelConfig?.sub_type || modelConfig?.modelType || '',
        source: modelConfig?.source || 'huggingface',
        model_id: modelConfig?.model_id || modelConfig?.modelId || modelConfig?.selectedModel || modelAdapter?.modelId || '',
        api_key: modelConfig?.api_key || modelConfig?.apiKey || '',
        test_ids: selectedTests // Add selected test IDs to the config
      };
      
      addLog(`Preparing test configuration with model ID: ${testConfig.model_id}`);
      
      try {
        // First, create an eval definition to get an eval_id
        const evalDefinition = {
          eval_id: `test_run_${Date.now()}`,
          name: testConfig.name,
          modality: testConfig.modality,
          sub_type: testConfig.sub_type,
          source: testConfig.source,
          model_id: testConfig.model_id,
          api_key: testConfig.api_key,
          test_ids: selectedTests,
          // Add required fields
          dataset_id: location.state?.testParameters?.datasets?.[0] || 'MuSR', // Get dataset from location state or use default
          scorer: location.state?.testParameters?.scorer || 'ExactStringMatchScorer' // Use the scorer from the wizard or default to a valid one
        };
        
        // Create or update the eval definition
        addLog(`Creating eval with dataset_id: ${evalDefinition.dataset_id} and scorer: ${evalDefinition.scorer}`);
        console.log('Creating eval definition:', evalDefinition);
        
        const createEvalResponse = await fetchWithAuth(`${API_BASE_URL}/api/evals/create_or_update_eval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evalDefinition),
        });
        
        if (!createEvalResponse.ok) {
          const errorText = await createEvalResponse.text();
          console.error('Error creating eval definition:', errorText);
          throw new Error(`Failed to create evaluation configuration: ${errorText}`);
        }
        
        addLog(`Created evaluation with ID: ${evalDefinition.eval_id}`);
        
        // Now run the eval with the eval_id - using the approach from EvalResults.jsx
        const response = await fetchWithAuth(`${API_BASE_URL}/api/evals/run_eval?eval_id=${evalDefinition.eval_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `API error (${response.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorJson.message || errorMessage;
          } catch (e) {
            // Use the raw error text if JSON parsing fails
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        // Process streaming response - simplified approach like in EvalResults.jsx
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        addLog('Starting to read streaming test results...');
        
        try {
          while (true) {
            const {value, done} = await reader.read();
            if (done) {
              addLog('Stream complete');
              break;
            }
            
            const text = decoder.decode(value, {stream: true});
            buffer += text;
            
            // Process complete JSON lines
            const lines = buffer.split('\n');
            // Keep the last line which might be incomplete
            buffer = lines.pop() || '';
            
            if (lines.length > 0) {
              addLog(`Processing ${lines.length} new result lines`);
            }
            
            // Process each complete line
            for (let line of lines) {
              if (line.trim()) { // Skip empty lines
                try {
                  const parsed = JSON.parse(line);
                  console.log("Received test result:", parsed);
                  
                  // Add to testResults array - this works more like the EvalResults page
                  if (parsed.input || parsed.output || parsed.score !== undefined) {
                    setTestResults(prev => [...prev, parsed]);
                  }
                  
                  // Also process with the existing method for compatibility with TestDetailsPanel
                  processTestUpdate(parsed);
                } catch (e) {
                  console.error('Error parsing JSON line:', e, 'Line:', line);
                  addLog(`Error processing result data: ${e.message}`);
                }
              }
            }
          }
          
          // Process any remaining data in buffer
          if (buffer.trim()) {
            try {
              const final = JSON.parse(buffer);
              setTestResults(prev => [...prev, final]);
              processTestUpdate(final);
            } catch (e) {
              console.warn('Error parsing final buffer:', e);
              addLog(`Error processing final data: ${e.message}`);
            }
          }
          
          setTestComplete(true);
          setRunningTests(false);
          
          // Set success message here within the try block
          setError('Tests completed successfully!');
          setErrorSeverity('success');
          
        } catch (streamError) {
          console.error('Stream reading error:', streamError);
          addLog(`Error while reading stream: ${streamError.message}`);
          setError(`Error reading test results: ${streamError.message}`);
          setErrorSeverity('error');
          setRunningTests(false);
        }
        
      } catch (error) {
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
  
  // Helper function to process streaming test updates
  const processTestUpdate = (data) => {
    // Log the update
    addLog(`Received update: ${data.type || 'unknown'}`);
    console.log("Received test update:", data);
    
    // Helper function to normalize test IDs for consistency
    const normalizeTestId = (testId) => {
      if (!testId) return testId;
      
      // Find the matching test from selectedTests if possible
      const originalTestId = selectedTests.find(id => {
        const idNorm = id.toLowerCase().replace(/[-_\s]+/g, '');
        const testIdNorm = testId.toLowerCase().replace(/[-_\s]+/g, '');
        return idNorm.includes(testIdNorm) || testIdNorm.includes(idNorm);
      });
      
      // Return the original test ID from selectedTests if found, otherwise the input test ID
      return originalTestId || testId;
    };
    
    // Check if this is an input/output/score update
    if (data.input !== undefined || data.output !== undefined || data.score !== undefined) {
      const testId = normalizeTestId(data.test_id);
      
      // Create test detail entries for TestDetailsPanel
      if (data.input) {
        setTestDetails(prev => [...prev, {
          type: 'input',
          testId: testId || 'unknown',
          content: data.input,
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      }
      
      if (data.output) {
        setTestDetails(prev => [...prev, {
          type: 'output',
          testId: testId || 'unknown',
          content: data.output,
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      }
      
      if (data.score !== undefined) {
        setTestDetails(prev => [...prev, {
          type: 'evaluation',
          testId: testId || 'unknown',
          content: {score: data.score},
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      }
      
      // Log what we received
      if (data.input) addLog(`Received input for test ${testId || 'unknown'}`);
      if (data.output) addLog(`Received output for test ${testId || 'unknown'}`);
      if (data.score !== undefined) addLog(`Received score ${data.score} for test ${testId || 'unknown'}`);
      
      return; // Exit early, we've handled the test data
    }
    
    // Handle test status and completion updates
    if (data.type === 'test_status_update' || data.status_update) {
      // Update progress
      if (data.progress) {
        setTestProgress(data.progress);
      }
      // Update current test
      if (data.current_test) {
        setCurrentTestName(data.current_test);
        addLog(`Running test: ${data.current_test}`);
      }
    } 
    else if (data.type === 'test_complete' || data.summary) {
      // Process final summary results
      const summary = data.summary || data;
      
      // Mark test as complete
      setTestComplete(true);
      
      // Extract test run ID from the response
      const taskId = summary.task_id || summary.id || Date.now().toString();
      
      // Format the results for the results page
      const resultsObject = {};
      testResults.forEach(result => {
        if (result && result.test_id) {
          resultsObject[result.test_id] = {
            test: {
              id: result.test_id,
              name: result.test_name || result.test_id,
              category: result.test_category || 'unknown',
              description: result.description || `Test for ${result.test_name || result.test_id}`,
              severity: result.severity || 'medium'
            },
            result: {
              pass: result.status === 'success' || result.status === 'passed' || (result.score > 0.5),
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
      
      // Extract scores if available
      const scoresData = summary.scores || {};
      
      // Save results to context
      if (typeof saveTestResults === 'function') {
        saveTestResults(resultsObject, scoresData);
      }
      
      // Store for navigation
      setTestResultsDataSource({
        taskId: taskId,
        results: resultsObject,
        scores: scoresData
      });
      
      // Also save to database for future retrieval if service is available
      if (typeof testResultsService !== 'undefined' && testResultsService.saveResults) {
        testResultsService.saveResults(taskId, resultsObject, scoresData)
          .then(() => {})
          .catch(error => {});
      }
      
      // Set current task ID for view results button
      setCurrentTask(taskId);
      
      // Update UI to show completion status
      setError('Tests completed successfully!');
      setErrorSeverity('success');
      addLog(`All tests complete. View results with "View Full Results" button.`);
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
            Test Execution
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error && !modelConfig ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
              <Button
                color="inherit"
                onClick={() => navigate('/run-tests')}
                sx={{ ml: 2 }}
              >
                Back to Test Wizard
              </Button>
            </Alert>
          ) : modelConfig ? (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Model: {modelConfig.name || modelConfig.modelName}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Chip 
                    size="small" 
                    label={modelConfig.modality || modelConfig.modelCategory || 'NLP'} 
                    color="primary" 
                    variant="outlined" 
                  />
                  <Chip 
                    size="small" 
                    label={modelConfig.sub_type || modelConfig.modelType || 'Text Generation'} 
                    color="secondary" 
                    variant="outlined" 
                  />
                  <Chip 
                    size="small" 
                    label={modelConfig.source || 'Provider'} 
                    color="default" 
                    variant="outlined" 
                  />
                </Box>
              </Box>
              
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
              
              {selectedTests.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No tests selected. Please go back to configure tests.
                  <Button
                    color="primary"
                    onClick={() => navigate('/run-tests')}
                    sx={{ ml: 2 }}
                  >
                    Back to Test Wizard
                  </Button>
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {selectedTests.length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleRunTests}
                    disabled={!modelConfig || !selectedTests.length || loading || runningTests}
                    startIcon={<PlayArrowIcon />}
                  >
                    Run {selectedTests.length} Test{selectedTests.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Alert severity="info">
              Loading model configuration...
            </Alert>
          )}
        </Paper>
      </Box>
      
      {/* Only show test section if a model is selected */}
      {modelConfig ? (
        <>
          {selectedTests.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No tests have been selected. Please go back to Test Configuration to select tests.
            </Alert>
          ) : (
            (runningTests || testComplete) && (
              <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {runningTests ? `Running: ${currentTestName}` : 'Test execution complete'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Add summary card */}
                {testResults.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Test Summary</Typography>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Total Tests</Typography>
                            <Typography variant="h5">{testResults.length}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Passed</Typography>
                            <Typography variant="h5" color="success.main">
                              {testResults.filter(r => r.score > 0.5 || r.status === 'success').length}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Failed</Typography>
                            <Typography variant="h5" color="error.main">
                              {testResults.filter(r => r.score <= 0.5 && r.status !== 'success').length}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Paper>
            )
          )}
        </>
      ) : null}
      
      {/* Keep the advanced test details panel */}
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