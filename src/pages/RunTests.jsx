import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TEST_CATEGORIES } from '../constants/testCategories';
import StatusChip from '../components/common/StatusChip';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip.jsx';
import ComplianceScoreGauge from '../components/common/ComplianceScoreGauge';
import ProgressBar from '../components/common/ProgressBar';
import { runTests } from '../services/testsService';

const RunTestsPage = () => {
  const navigate = useNavigate();
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
  
  const logContainerRef = useRef(null);
  
  // Group tests by category
  const groupTestsByCategory = () => {
    const grouped = {};
    
    // Using data from MOCK_TESTS to get more info about the tests
    Object.entries(TEST_CATEGORIES).forEach(([category]) => {
      const testsInCategory = selectedTests.filter(testId => {
        const allTests = Object.values(MOCK_TESTS).flat();
        const test = allTests.find(t => t.id === testId);
        return test && test.category === category;
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
  
  const handleRunTests = async () => {
    if (!selectedTests.length) {
      return;
    }
    
    setRunningTests(true);
    setTestProgress(0);
    setCurrentTestName('');
    setTestResults({});
    setComplianceScores({});
    setTotalPassed(0);
    setTotalFailed(0);
    setTestComplete(false);
    setLogs([]);
    
    // Reset expanded rows
    setExpandedRows({});
    
    try {
      addLog(`Starting test run for ${selectedTests.length} tests...`);
      
      // Use the service to run tests
      const { results, complianceScores: scores } = await runTests(
        selectedTests, 
        modelAdapter, 
        testParameters
      );
      
      // Save results to state
      setTestResults(results);
      setComplianceScores(scores);
      
      // Calculate statistics
      const passed = Object.values(results).filter(item => item.result.pass).length;
      const failed = selectedTests.length - passed;
      
      setTotalPassed(passed);
      setTotalFailed(failed);
      
      // Calculate overall score
      const totalScore = Object.values(scores).reduce((sum, category) => sum + category.passed, 0);
      const totalTests = Object.values(scores).reduce((sum, category) => sum + category.total, 0);
      const overall = totalTests > 0 ? (totalScore / totalTests) * 100 : 0;
      
      setOverallScore(overall);
      
      // Save results to context
      saveTestResults(results, scores);
      
      setCurrentTestName('');
      setRunningTests(false);
      setTestComplete(true);
      setTestProgress(100);
      
      addLog(`Test run completed successfully. ${passed} passed, ${failed} failed.`);
    } catch (error) {
      console.error('Error running tests:', error);
      addLog(`Error running tests: ${error.message}`);
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