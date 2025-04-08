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
  Tooltip,
  Chip,
  ListItemSecondaryAction
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getRecentResults, deleteResults } from '../../services/testResultsService';

/**
 * Component that displays test run history and allows loading previous results
 */
const TestRunHistory = ({ onViewResults }) => {
  const [testRuns, setTestRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load test run history on mount
  useEffect(() => {
    loadTestRunHistory();
  }, []);

  // Function to load test run history
  const loadTestRunHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await getRecentResults();
      
      // Group results by task ID
      const groupedResults = {};
      
      for (const result of results) {
        if (!groupedResults[result.task_id]) {
          groupedResults[result.task_id] = [];
        }
        groupedResults[result.task_id].push(result);
      }
      
      // Create history items
      const historyItems = Object.keys(groupedResults).map(taskId => {
        const taskResults = groupedResults[taskId];
        const timestamp = Math.max(...taskResults.map(r => new Date(r.timestamp).getTime()));
        const testCount = taskResults.length;
        const modelName = taskResults[0]?.model_name || 'Unknown model';
        
        return {
          taskId,
          timestamp,
          testCount,
          modelName,
          results: taskResults
        };
      });
      
      // Sort by timestamp (newest first)
      historyItems.sort((a, b) => b.timestamp - a.timestamp);
      
      setTestRuns(historyItems);
    } catch (error) {
      setError('Failed to load test run history');
    } finally {
      setLoading(false);
    }
  };

  // Function to view a previous test run
  const viewTestRun = (item) => {
    if (typeof onViewResults === 'function') {
      onViewResults(item.results);
    }
  };

  // Function to delete a test run
  const deleteTestRun = async (taskId) => {
    try {
      setError(null);
      await deleteResults(taskId);
      await loadTestRunHistory();
    } catch (error) {
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

  // Render a single history item
  const renderHistoryItem = (item) => {
    const date = new Date(item.timestamp);
    const timeAgo = formatDistanceToNow(date, { addSuffix: true });
    
    return (
      <React.Fragment key={item.taskId}>
        <ListItem>
          <ListItemText
            primary={
              <Typography variant="subtitle1">
                {item.modelName}
                <Chip 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }} 
                  label={`${item.testCount} tests`} 
                />
              </Typography>
            }
            secondary={
              <Typography variant="body2" color="textSecondary">
                {timeAgo} ({date.toLocaleString()})
              </Typography>
            }
          />
          <ListItemSecondaryAction>
            <Tooltip title="View results">
              <IconButton 
                edge="end" 
                onClick={() => viewTestRun(item)}
                size="small"
                sx={{ mr: 1 }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                edge="end" 
                onClick={() => deleteTestRun(item.taskId)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
        <Divider />
      </React.Fragment>
    );
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
          {testRuns.map(renderHistoryItem)}
        </List>
      )}
    </Paper>
  );
};

export default TestRunHistory; 