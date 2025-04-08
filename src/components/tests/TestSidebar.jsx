import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemText, 
  Chip,
  CircularProgress,
  Divider,
  LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Category colors (copy from RunTests.jsx)
const CATEGORY_COLORS = {
  'security': '#e53935',
  'bias': '#7b1fa2',
  'toxicity': '#d32f2f',
  'hallucination': '#1565c0',
  'robustness': '#2e7d32',
  'ethics': '#6a1b9a',
  'performance': '#0277bd',
  'quality': '#00695c',
  'privacy': '#283593',
  'safety': '#c62828',
  'compliance': '#4527a0',
  'unknown': '#757575'
};

/**
 * Component to display selected tests and their status in a sidebar
 */
const TestSidebar = ({ 
  selectedTests, 
  testResults, 
  availableTests, 
  testDetails,
  runningTests, 
  currentTestName,
  onSelectTest, 
  selectedTestId 
}) => {
  
  const handleSelectTest = (testId) => {
    console.log("Test selected:", testId);
    onSelectTest(testId);
  };
  
  // Get test information from available tests and results
  const getTestInfo = (testId) => {
    console.log("getTestInfo called for testId:", testId);
    
    // Get test details from available tests
    const availableTest = availableTests?.find(test => test.id === testId);
    
    // Get test results if available
    const testResult = testResults?.find(result => result.test_id === testId);
    
    // Get test name from available sources
    const testName = availableTest?.name || testResult?.test_name || testId;
    
    // Prepare a normalized version of strings for more flexible matching
    const normalizeString = (str) => str.toString().toLowerCase().trim().replace(/[-_\s]+/g, '');
    const currentNameNormalized = currentTestName ? normalizeString(currentTestName) : '';
    const testIdNormalized = normalizeString(testId);
    const testNameNormalized = testName ? normalizeString(testName) : '';
    
    // Find test details that might match this test, even with partial ID matching
    const matchingTestDetails = testDetails.filter(detail => {
      if (detail.testId === testId) return true; // Exact match
      
      // Try partial/fuzzy matching
      const detailIdNormalized = normalizeString(detail.testId);
      return testIdNormalized.includes(detailIdNormalized) || 
             detailIdNormalized.includes(testIdNormalized);
    });
    
    // Check if we have any matching details
    const hasDetails = matchingTestDetails.length > 0;
    
    console.log("Test matching debug:", { 
      currentTestName, 
      currentNameNormalized, 
      testId, 
      testIdNormalized,
      testName,
      testNameNormalized,
      runningTests,
      hasDetails,
      matchingTestDetails: matchingTestDetails.length
    });
    
    // Improved test status detection
    let status;
    if (testResult?.status) {
      // If we have a result, use its status
      status = testResult.status;
    } else if (
      // Check if this test is currently running by comparing the test ID or name
      runningTests && currentTestName && (
        // Direct matches
        currentTestName === testId ||
        currentTestName === testName ||
        // Normalized fuzzy matches for more resilience
        currentNameNormalized.includes(testIdNormalized) ||
        testIdNormalized.includes(currentNameNormalized) ||
        currentNameNormalized.includes(testNameNormalized) ||
        testNameNormalized.includes(currentNameNormalized)
      )
    ) {
      // This test is currently running
      status = 'running';
      console.log("Test status set to running for:", testId);
    } else if (runningTests && hasDetails) {
      // If tests are running and we have details for this test but no result yet
      // it's likely running or just completed
      status = 'running'; 
      console.log("Test status set to running (has details) for:", testId);
    } else {
      // Otherwise, it's queued
      status = 'queued';
    }
    
    return {
      id: testId,
      name: testName,
      category: availableTest?.category || testResult?.test_category || 'unknown',
      status: status,
      hasDetails
    };
  };
  
  // Get status icon based on test status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'passed':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'running':
        return <CircularProgress size={16} />;
      default:
        return <AccessTimeIcon fontSize="small" color="disabled" />;
    }
  };
  
  // Get message counts for each test
  const getTestMessageCounts = (testId) => {
    // Normalize strings for matching
    const normalizeString = (str) => str.toString().toLowerCase().trim().replace(/[-_\s]+/g, '');
    const testIdNormalized = normalizeString(testId);
    
    // Find messages that match this test, with partial ID matching
    const messages = testDetails.filter(detail => {
      if (detail.testId === testId) return true; // Exact match
      
      // Try partial/fuzzy matching
      const detailIdNormalized = normalizeString(detail.testId);
      return testIdNormalized.includes(detailIdNormalized) || 
             detailIdNormalized.includes(testIdNormalized);
    });
    
    return {
      total: messages.length,
      inputs: messages.filter(m => m.type === 'input').length,
      outputs: messages.filter(m => m.type === 'output').length,
      evaluations: messages.filter(m => m.type === 'evaluation').length
    };
  };

  return (
    <Paper 
      sx={{ 
        height: '500px', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: 'none', 
        border: '1px solid', 
        borderColor: 'divider'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6">Test Queue</Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedTests.length} tests selected
        </Typography>
      </Box>
      
      <List 
        sx={{ 
          overflow: 'auto', 
          flexGrow: 1,
          '& .MuiListItemButton-root.Mui-selected': {
            bgcolor: 'rgba(25, 118, 210, 0.08)',
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            pl: 1.5
          }
        }}
      >
        <ListItemButton 
          onClick={() => onSelectTest(null)}
          selected={selectedTestId === null}
          sx={{
            bgcolor: 'background.default',
            mb: 1
          }}
        >
          <ListItemText 
            primary={
              <Typography variant="body2" fontWeight={500}>
                Show All Tests
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {testDetails.length} messages
              </Typography>
            }
          />
        </ListItemButton>

        <Divider sx={{ my: 1 }} />
        
        {selectedTests.map(testId => {
          const testInfo = getTestInfo(testId);
          const categoryColor = CATEGORY_COLORS[testInfo.category.toLowerCase()] || CATEGORY_COLORS.unknown;
          const messageCounts = getTestMessageCounts(testId);
          
          return (
            <React.Fragment key={testId}>
              <ListItemButton 
                selected={selectedTestId === testId}
                onClick={() => handleSelectTest(testId)}
                sx={{ 
                  borderLeft: '4px solid', 
                  borderColor: testInfo.hasDetails ? categoryColor : 'transparent',
                  opacity: testInfo.hasDetails ? 1 : 0.6,
                  pl: 1.5
                }}
                disabled={messageCounts.total === 0 && testInfo.status !== 'running'}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: testInfo.hasDetails ? 500 : 400,
                          maxWidth: '60%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {testInfo.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {messageCounts.total > 0 && (
                          <Chip 
                            size="small" 
                            label={messageCounts.total}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              mr: 1
                            }} 
                          />
                        )}
                        {getStatusIcon(testInfo.status)}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Chip 
                        label={testInfo.category} 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          bgcolor: `${categoryColor}22`,
                          color: categoryColor,
                          fontWeight: 500
                        }} 
                      />
                      {messageCounts.total > 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {messageCounts.inputs}i/{messageCounts.outputs}o/{messageCounts.evaluations}e
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          No details yet
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
              <Divider variant="fullWidth" component="li" />
            </React.Fragment>
          );
        })}
      </List>
      
      <Box 
        sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        {runningTests ? (
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            {currentTestName ? `Running: ${currentTestName}` : 'Tests running...'}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {testResults.length ? 'Test execution complete' : 'Ready to run tests'}
          </Typography>
        )}
        
        {testResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Chip 
                  size="small" 
                  label={`${testResults.filter(r => r.status === 'success' || r.status === 'passed').length} passed`}
                  color="success"
                  sx={{ mr: 1 }}
                />
                <Chip 
                  size="small" 
                  label={`${testResults.filter(r => r.status === 'failed').length} failed`} 
                  color="error"
                />
              </Box>
              <Typography variant="body2">
                {`${testResults.length}/${selectedTests.length}`}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(testResults.length / selectedTests.length) * 100}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TestSidebar; 