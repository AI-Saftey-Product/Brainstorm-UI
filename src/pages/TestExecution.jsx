import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Container,
  Grid,
  Stack,
} from '@mui/material';
import { runTests, getTestResults } from '../services/testsService';
import websocketService from '../services/websocketService';
import { useAppContext } from '../context/AppContext';
import WebSocketLogger from '../components/WebSocketLogger';

const TestExecution = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTests, modelConfig, testParameters } = location.state || {};
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState({ running: false, complete: false, error: null });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState([]);
  const [detailedExecution, setDetailedExecution] = useState([]);
  const logsEndRef = useRef(null);
  const detailedExecutionRef = useRef(null);
  const { saveTestResults } = useAppContext();

  useEffect(() => {
    const startTests = async () => {
      if (!selectedTests || !modelConfig) {
        setError('Missing test configuration');
        setLoading(false);
        return;
      }

      console.log('🚀 TEST EXECUTION: Starting tests with configuration:', {
        selectedTests,
        modelConfig: {...modelConfig, api_key: '***REDACTED***'},
        testParameters
      });

      try {
        const newTaskId = await runTests(selectedTests, modelConfig, testParameters);
        console.log('🚀 TEST EXECUTION: Received taskId:', newTaskId);
        setTaskId(newTaskId);
        setLoading(false);
      } catch (error) {
        console.error('❌ TEST EXECUTION: Failed to start tests:', error);
        setError('Failed to start tests');
        setLoading(false);
      }
    };

    startTests();
  }, [selectedTests, modelConfig, testParameters]);

  useEffect(() => {
    if (!taskId) return;

    console.log('🔄 TEST EXECUTION: Setting up WebSocket with taskId:', taskId);

    const setupWebSocket = async () => {
      try {
        // Connect to WebSocket for real-time updates
        console.log('🔄 TEST EXECUTION: Attempting to connect to WebSocket');
        await websocketService.connect(taskId);
        console.log('✅ TEST EXECUTION: WebSocket connection established');
        
        // Handle test status updates
        websocketService.on('test_status_update', (data) => {
          console.log('📊 TEST STATUS UPDATE received:', data);
          // Update UI with status information
          setStatus({
            status: 'running',
            progress: data.summary?.progress || 0,
            currentTest: data.summary?.current_test || 'Processing...'
          });
        });
        
        // Handle individual test results
        websocketService.on('test_result', (data) => {
          // We could handle individual test results here if needed
        });
        
        // Handle model input events
        websocketService.on('model_input', (data) => {
          console.log('[TestExecution] WebSocket Model Input:', data);
          setDetailedExecution(prev => [...prev, {
            type: 'input',
            testId: data.test_id,
            content: data.prompt,
            promptType: data.prompt_type,
            timestamp: data.timestamp
          }]);
          
          // Add to logs
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Model Input (${data.test_id}): ${data.prompt_type} prompt received`]);
        });
        
        // Handle model output events
        websocketService.on('model_output', (data) => {
          console.log('[TestExecution] WebSocket Model Output:', data);
          setDetailedExecution(prev => [...prev, {
            type: 'output',
            testId: data.test_id,
            content: data.output,
            timestamp: data.timestamp
          }]);
          
          // Add to logs
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Model Output (${data.test_id}): response received`]);
        });
        
        // Handle evaluation result events
        websocketService.on('evaluation_result', (data) => {
          console.log('[TestExecution] WebSocket Evaluation Result:', data);
          setDetailedExecution(prev => [...prev, {
            type: 'evaluation',
            testId: data.test_id,
            content: data.evaluation,
            timestamp: data.timestamp
          }]);
          
          // Add to logs
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation (${data.test_id}): score ${data.evaluation.strong_reject_score || 'N/A'}`]);
        });
        
        // Handle issue found events
        websocketService.on('issue_found', (data) => {
          console.log('[TestExecution] WebSocket Issue Found:', data);
          setDetailedExecution(prev => [...prev, {
            type: 'issue',
            testId: data.test_id,
            issueType: data.issue_type,
            content: data.details,
            timestamp: data.timestamp
          }]);
          
          // Add to logs
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ISSUE FOUND (${data.test_id}): ${data.issue_type}`]);
        });
        
        // Handle test completion
        websocketService.on('test_complete', async (data) => {
          try {
            // Fetch the final complete results
            const resultsData = await getTestResults(taskId);
            setResults(resultsData);
            setStatus({
              status: 'completed',
              progress: 1.0
            });
          } catch (error) {
            setError(`Failed to fetch final results: ${error.message}`);
          }
        });
        
        // Handle test failure
        websocketService.on('test_failed', (data) => {
          setError(data.message || 'Test execution failed');
          setStatus({
            status: 'failed',
            progress: 0,
            error: data.message || 'Test execution failed'
          });
        });
        
        // Handle WebSocket connection errors
        websocketService.on('error', (error) => {
          setError(`WebSocket error: ${error.message || 'Connection error'}`);
        });
      } catch (error) {
        setError(`Failed to establish real-time connection: ${error.message}`);
      }
    };
    
    setupWebSocket();
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      websocketService.disconnect();
    };
  }, [taskId]);

  // Automatically scroll to the bottom of logs when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Scroll to bottom of detailed execution when it updates
  useEffect(() => {
    if (detailedExecutionRef.current) {
      detailedExecutionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailedExecution]);

  // Fetch the final results when tests are complete
  useEffect(() => {
    if (status.complete && taskId) {
      fetchFinalResults();
    }
  }, [status.complete, taskId]);

  const fetchFinalResults = async () => {
    try {
      // In a real implementation, you might want to fetch the complete
      // results from your API here using the taskId
      
      // For now, we'll use the results we received from the WebSocket
      if (saveTestResults && testResults.length > 0) {
        await saveTestResults(testResults, taskId);
      }
    } catch (error) {
      setError(`Failed to fetch final results: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/test-config')}>
              Return to Test Configuration
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <WebSocketLogger testRunId={taskId} />
      
      <Typography variant="h4" gutterBottom>
        Test Execution
      </Typography>

      {status && (
        <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Status: {status.status}
          </Typography>
          {status.status === 'running' && (
            <>
              <LinearProgress variant="determinate" value={status.progress * 100} sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Progress: {(status.progress * 100).toFixed(1)}%
              </Typography>
            </>
          )}
          {status.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {status.error}
            </Alert>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Real-time Test Execution
        </Typography>
        
        <Box sx={{ mt: 2, maxHeight: '400px', overflowY: 'auto', bgcolor: 'background.paper', p: 1 }}>
          {detailedExecution.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No test execution data yet. This will update in real-time as tests run.
            </Typography>
          ) : (
            <List>
              {detailedExecution.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between">
                          <Typography component="span" variant="subtitle2" color="primary">
                            {item.type === 'input' ? 'Model Input' : 
                             item.type === 'output' ? 'Model Output' : 
                             item.type === 'evaluation' ? 'Evaluation' : 
                             item.type === 'issue' ? 'ISSUE FOUND' : 'Event'}
                          </Typography>
                          <Typography component="span" variant="caption" color="textSecondary">
                            {new Date(item.timestamp).toLocaleString()}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textSecondary">
                            Test: {item.testId}
                            {item.type === 'input' && `, Type: ${item.promptType}`}
                            {item.type === 'issue' && `, Type: ${item.issueType}`}
                          </Typography>
                          
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                            {item.type === 'input' || item.type === 'output' ? (
                              <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {item.content}
                              </Typography>
                            ) : item.type === 'evaluation' ? (
                              <>
                                <Typography variant="subtitle2">Scores:</Typography>
                                <Typography variant="body2">
                                  Refusal: {item.content.scores?.refusal ?? 'N/A'}
                                </Typography>
                                <Typography variant="body2">
                                  Convincingness: {item.content.scores?.convincingness ?? 'N/A'}
                                </Typography>
                                <Typography variant="body2">
                                  Specificity: {item.content.scores?.specificity ?? 'N/A'}
                                </Typography>
                                <Typography variant="body2">
                                  StrongREJECT Score: {item.content.strong_reject_score ?? 'N/A'}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ mt: 1 }}>Explanation:</Typography>
                                <Typography variant="body2">
                                  {item.content.explanation || 'No explanation provided'}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2">
                                {JSON.stringify(item.content, null, 2)}
                              </Typography>
                            )}
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
              <div ref={detailedExecutionRef} />
            </List>
          )}
        </Box>
      </Paper>
      
      {logs.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Logs
          </Typography>
          <Box sx={{ mt: 2, maxHeight: '200px', overflowY: 'auto' }}>
            <List>
              {logs.map((log, index) => (
                <ListItem key={index}>
                  <ListItemText primary={log} />
                </ListItem>
              ))}
              <div ref={logsEndRef} />
            </List>
          </Box>
        </Paper>
      )}

      {results && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              
              {Object.entries(results.results).map(([testId, testData]) => (
                <Box key={testId} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      {testData.test.name}
                    </Typography>
                    <Chip
                      label={testData.result.pass ? 'Passed' : 'Failed'}
                      color={testData.result.pass ? 'success' : 'error'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {testData.result.message}
                  </Typography>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      Score: {(testData.result.score * 100).toFixed(1)}%
                    </Typography>
                    {testData.result.metrics && (
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(testData.result.metrics).map(([key, value]) => (
                          <Typography key={key} variant="body2">
                            {key}: {value}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                  
                  {testData.result.recommendations?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommendations:
                      </Typography>
                      <List dense>
                        {testData.result.recommendations.map((rec, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={rec} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Compliance Scores by Category
              </Typography>
              
              {Object.entries(results.compliance_scores).map(([category, score]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    {category}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Passed: {score.passed} / {score.total} ({(score.passed / score.total * 100).toFixed(1)}%)
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={() => navigate('/test-config')}
        >
          Return to Test Configuration
        </Button>
      </Box>
    </Container>
  );
};

export default TestExecution; 