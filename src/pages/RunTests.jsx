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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BarChartIcon from '@mui/icons-material/BarChart';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAppContext } from '../context/AppContext';
import { TEST_CATEGORIES, MOCK_TESTS } from '../constants/testCategories';
import StatusChip from '../components/common/StatusChip';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip.jsx';
import ComplianceScoreGauge from '../components/common/ComplianceScoreGauge';
import ProgressBar from '../components/common/ProgressBar';
import { runTests } from '../services/testsService';
import { createModelAdapter } from '../services/modelAdapter';

const RunTestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedTests, 
    testParameters, 
    modelAdapter,
    modelType,
    saveTestResults
  } = useAppContext();
  
  const [runningTests, setRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [currentTestName, setCurrentTestName] = useState('');
  const [testResults, setTestResults] = useState({});
  const [complianceScores, setComplianceScores] = useState({});
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [overallScore, setOverallScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [verbose, setVerbose] = useState(false);
  const [logs, setLogs] = useState([]);
  const [modelAdapterState, setModelAdapter] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [error, setError] = useState(null);
  
  const logContainerRef = useRef(null);
  
  // Group tests by category
  const groupTestsByCategory = () => {
    const testsToUse = location.state?.selectedTests || selectedTests || [];
    const grouped = {};
    
    // Using data from MOCK_TESTS to get more info about the tests
    Object.entries(TEST_CATEGORIES).forEach(([category]) => {
      const testsInCategory = testsToUse.filter(testId => {
        // Look through all mockTest categories to find matching tests by ID
        for (const [cat, tests] of Object.entries(MOCK_TESTS)) {
          const found = tests.find(t => t.id === testId);
          if (found && found.category === category) {
            return true;
          }
        }
        return false;
      });
      
      if (testsInCategory.length > 0) {
        grouped[category] = testsInCategory.length;
      }
    });
    
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
    // Debug what's happening with navigation
    console.log('RunTests: location.state:', location.state);
    console.log('RunTests: selectedTests from context:', selectedTests);
    console.log('RunTests: modelAdapter from context:', modelAdapter);
    
    // Get selected tests and model config from location state or use context values as fallback
    if (location.state?.selectedTests && location.state?.modelConfig) {
      // Use data from navigation state
      console.log('RunTests: Using tests from location.state');
      
      // Create local state variables for tests and config
      const testsFromLocation = location.state.selectedTests;
      setTestResults({});
      
      setModelConfig(location.state.modelConfig);
      
      // Initialize model adapter when component mounts
      const initModelAdapter = async () => {
        try {
          const adapter = await createModelAdapter(location.state.modelConfig);
          setModelAdapter(adapter);
          addLog(`Model adapter created for ${adapter.source === 'huggingface' ? 'Hugging Face model' : 'mock model'}`);
          if (adapter.source === 'huggingface') {
            addLog(`Using model: ${adapter.modelId}`);
          }
        } catch (error) {
          console.error('Error initializing model adapter:', error);
          addLog(`Error initializing model: ${error.message}`);
          setError(`Failed to initialize model: ${error.message}`);
        }
      };
      
      initModelAdapter();
    } else if (selectedTests && selectedTests.length > 0 && modelAdapter) {
      // Fallback to using context values if they exist
      console.log('RunTests: Using tests and model from context');
      addLog('Using configured model from context');
      setModelAdapter(modelAdapter);
      setError(null);
    } else {
      // If no data available, navigate back to test config
      console.log('RunTests: No test data available, redirecting');
      navigate('/test-config', { replace: true });
    }
  }, [location.state, navigate, selectedTests, modelAdapter]);
  
  const handleRunTests = async () => {
    if (!selectedTests || selectedTests.length === 0) {
      setError('No tests selected');
      return;
    }
    
    // Use the local state adapter (modelAdapterState) not the context adapter (modelAdapter)
    const adapter = modelAdapterState || modelAdapter;
    
    if (!adapter) {
      setError('Model not initialized');
      return;
    }
    
    try {
      setRunningTests(true);
      setError(null);
      setTestResults({});
      setComplianceScores({});
      setTestProgress(0);
      setCurrentTestName('Initializing...');
      addLog('Starting test run...');
      
      // Group tests by category for better organization
      const groupedTests = groupTestsByCategory(selectedTests);
      for (const category in groupedTests) {
        addLog(`Preparing ${groupedTests[category]} tests for category: ${category}`);
      }
      
      // Define logCallback for real-time logging
      const logCallback = (message) => {
        addLog(message);
      };
      
      // Log model information with fallback if getModelInfo is not available
      if (typeof adapter.getModelInfo === 'function') {
        const modelInfo = adapter.getModelInfo();
        addLog(`Using model: ${modelInfo.name} (${modelInfo.type})`);
      } else {
        // Fallback when getModelInfo is not available
        addLog(`Using ${adapter.source || 'unknown'} model`);
      }
      
      // Run the tests with the model adapter
      const { results, complianceScores: scores } = await runTests(
        selectedTests.map(testId => testId),
        adapter,
        {}, // Test parameters (empty for now)
        verbose ? logCallback : null
      );
      
      // Update states with results
      setTestResults(results);
      setComplianceScores(scores);
      addLog('All tests completed successfully');
      
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
    } catch (error) {
      console.error('Error running tests:', error);
      setError(`Error running tests: ${error.message}`);
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
          <TableCell component="th" scope="row">
            {item.test.name}
          </TableCell>
          <TableCell>
            <CategoryChip category={item.test.category} />
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
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Run Compliance Tests
      </Typography>
      
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
                          bgcolor: TEST_CATEGORIES[category] || '#757575',
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
                                bgcolor: TEST_CATEGORIES[category] || '#757575',
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
                    {Object.values(testResults).map((item) => (
                      <TestResultRow key={item.test.id} item={item} />
                    ))}
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
    </Container>
  );
};

export default RunTestsPage;