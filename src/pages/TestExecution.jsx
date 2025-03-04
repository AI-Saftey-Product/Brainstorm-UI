import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { runTests, getTestStatus, getTestResults } from '../services/testsService';

const TestExecution = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTests, modelConfig, testParameters } = location.state || {};
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startTests = async () => {
      if (!selectedTests || !modelConfig) {
        setError('Missing test configuration');
        setLoading(false);
        return;
      }

      try {
        const newTaskId = await runTests(selectedTests, modelConfig, testParameters);
        setTaskId(newTaskId);
        setLoading(false);
      } catch (error) {
        console.error('Error starting tests:', error);
        setError('Failed to start tests');
        setLoading(false);
      }
    };

    startTests();
  }, [selectedTests, modelConfig, testParameters]);

  useEffect(() => {
    if (!taskId) return;

    const pollStatus = async () => {
      try {
        const statusData = await getTestStatus(taskId);
        setStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          const resultsData = await getTestResults(taskId);
          setResults(resultsData);
        } else if (statusData.status === 'running') {
          // Continue polling
          setTimeout(pollStatus, 2000);
        }
      } catch (error) {
        console.error('Error polling test status:', error);
        setError('Failed to get test status');
      }
    };

    pollStatus();
  }, [taskId]);

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
      <Typography variant="h4" gutterBottom>
        Test Execution
      </Typography>

      {status && (
        <Paper sx={{ p: 3, mb: 3 }}>
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

      {results && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
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
            <Paper sx={{ p: 3 }}>
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