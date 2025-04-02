import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon, 
  Paper, 
  Divider,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import testResultsService from '../../services/testResultsService';
import { useNavigate } from 'react-router-dom';

/**
 * Component that displays test run history and allows loading previous results
 */
const TestRunHistory = ({ limit = 10, onSelectResult = null }) => {
  const [testRuns, setTestRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load test run history on mount
  useEffect(() => {
    loadTestRunHistory();
  }, [limit]);

  // Function to load test run history
  const loadTestRunHistory = async () => {
    try {
      setLoading(true);
      const recentRuns = await testResultsService.getRecentResults(limit);
      setTestRuns(recentRuns);
      setLoading(false);
    } catch (error) {
      console.error('Error loading test run history:', error);
      setError('Failed to load test run history');
      setLoading(false);
    }
  };

  // Function to view a previous test run
  const viewTestRun = (run) => {
    if (onSelectResult && typeof onSelectResult === 'function') {
      onSelectResult(run);
    } else {
      // Navigate to results page with the run data
      navigate('/results', { 
        state: { 
          taskId: run.taskId,
          results: run.results,
          scores: run.scores,
          fromHistory: true
        } 
      });
    }
  };

  // Function to delete a test run
  const deleteTestRun = async (event, id) => {
    event.stopPropagation(); // Prevent triggering the parent click
    try {
      await testResultsService.deleteResults(id);
      // Refresh the list
      loadTestRunHistory();
    } catch (error) {
      console.error('Error deleting test run:', error);
      setError('Failed to delete test run');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get summary info about a test run
  const getRunSummary = (run) => {
    const results = run.results || {};
    const totalTests = Object.keys(results).length;
    
    // Count passed tests
    let passedTests = 0;
    Object.values(results).forEach(result => {
      if (result.result && result.result.pass) {
        passedTests++;
      }
    });
    
    // Get model info if available
    const modelName = run.modelInfo?.name || 'Unknown Model';
    
    return {
      totalTests,
      passedTests,
      modelName
    };
  };

  return (
    <Paper sx={{ p: 2, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <HistoryIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Recent Test Runs</Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : testRuns.length === 0 ? (
        <Typography variant="body2" sx={{ py: 2 }}>No previous test runs found</Typography>
      ) : (
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {testRuns.map((run, index) => {
            const summary = getRunSummary(run);
            return (
              <React.Fragment key={run.id || index}>
                {index > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Delete">
                      <IconButton edge="end" onClick={(e) => deleteTestRun(e, run.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton onClick={() => viewTestRun(run)}>
                    <ListItemIcon>
                      <VisibilityIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${summary.modelName} - ${summary.passedTests}/${summary.totalTests} Tests Passed`}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.8rem' }} />
                          <Typography variant="caption">{formatDate(run.timestamp)}</Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default TestRunHistory; 