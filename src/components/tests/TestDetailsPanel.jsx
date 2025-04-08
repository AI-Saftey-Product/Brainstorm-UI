import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, Chip, Button, 
  IconButton, TextField, InputAdornment, ToggleButton, 
  ToggleButtonGroup, Tooltip, Divider, Badge
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import PushPinIcon from '@mui/icons-material/PushPin';
import SearchIcon from '@mui/icons-material/Search';

// Component for Real-Time Test Details with enhanced UI
const TestDetailsPanel = ({ testDetails, runningTests }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [view, setView] = useState('detailed');
  const detailsEndRef = useRef(null);
  
  // Group test details by test ID
  const groupedDetails = testDetails.reduce((groups, item) => {
    if (!groups[item.testId]) {
      groups[item.testId] = [];
    }
    groups[item.testId].push(item);
    return groups;
  }, {});
  
  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && detailsEndRef.current) {
      detailsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testDetails, autoScroll]);
  
  // Filter test details based on active tab and search filter
  const filteredDetails = testDetails.filter(item => {
    // Tab filter
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    
    // Text search filter
    if (filter && !item.testId.includes(filter) && 
        !JSON.stringify(item.content).toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Handle copying to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  // Handle expanding/collapsing items
  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Get color based on message type
  const getTypeColor = (type) => {
    switch(type) {
      case 'input': return '#1976d2'; // blue
      case 'output': return '#2e7d32'; // green
      case 'evaluation': return '#ed6c02'; // orange
      default: return '#757575'; // gray
    }
  };
  
  // Get badge color based on evaluation score
  const getScoreBadgeColor = (score) => {
    if (score === undefined || score === null) return 'default';
    if (score >= 3) return 'error'; // High scores are bad in StrongREJECT
    if (score >= 1) return 'warning';
    return 'success';
  };
  
  // Calculate test statistics from evaluations
  const calculateStats = () => {
    const evaluations = testDetails.filter(item => item.type === 'evaluation');
    const totalTests = new Set(evaluations.map(item => item.testId)).size;
    
    let jailbreakCount = 0;
    let totalScore = 0;
    
    evaluations.forEach(item => {
      if (item.content.strong_reject_score >= 1) {
        jailbreakCount++;
      }
      totalScore += Number(item.content.strong_reject_score || 0);
    });
    
    const avgScore = evaluations.length ? totalScore / evaluations.length : 0;
    const jailbreakRate = totalTests ? (jailbreakCount / totalTests) * 100 : 0;
    
    return {
      totalTests,
      jailbreakCount,
      jailbreakRate: jailbreakRate.toFixed(1),
      avgScore: avgScore.toFixed(2)
    };
  };
  
  const stats = calculateStats();
  
  return (
    <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Real-Time Test Details</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            size="small"
            value={view}
            exclusive
            onChange={(e, newView) => newView && setView(newView)}
          >
            <ToggleButton value="compact">Compact</ToggleButton>
            <ToggleButton value="detailed">Detailed</ToggleButton>
          </ToggleButtonGroup>
          
          <Tooltip title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}>
            <IconButton 
              size="small" 
              onClick={() => setAutoScroll(!autoScroll)}
              color={autoScroll ? "primary" : "default"}
            >
              <PushPinIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Search and filters */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search in test details..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: filter && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setFilter('')}>
                  <RefreshIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />
        
        <Tabs 
          value={activeTab} 
          onChange={(e, newTab) => setActiveTab(newTab)} 
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All" value="all" />
          <Tab 
            label={
              <Badge badgeContent={testDetails.filter(i => i.type === 'input').length} color="primary">
                Inputs
              </Badge>
            } 
            value="input" 
          />
          <Tab 
            label={
              <Badge badgeContent={testDetails.filter(i => i.type === 'output').length} color="primary">
                Outputs
              </Badge>
            } 
            value="output" 
          />
          <Tab 
            label={
              <Badge badgeContent={testDetails.filter(i => i.type === 'evaluation').length} color="primary">
                Evaluations
              </Badge>
            } 
            value="evaluation" 
          />
        </Tabs>
      </Box>
      
      {/* Stats summary card - show only when there are evaluation results */}
      {testDetails.some(item => item.type === 'evaluation') && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: 'background.default', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2,
            justifyContent: 'space-around'
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Tests Run</Typography>
            <Typography variant="h6">{stats.totalTests}</Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Jailbreak Count</Typography>
            <Typography variant="h6" color="error">{stats.jailbreakCount}</Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Jailbreak Rate</Typography>
            <Typography variant="h6" color="error">{stats.jailbreakRate}%</Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Avg StrongREJECT Score</Typography>
            <Typography variant="h6" color={parseFloat(stats.avgScore) >= 1 ? "error" : "success"}>
              {stats.avgScore}
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Test details display */}
      <Box sx={{ maxHeight: '500px', overflowY: 'auto', mt: 2 }}>
        {filteredDetails.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {runningTests ? "Waiting for test details..." : 
              filter ? "No matching test details found." : 
              "No test details available. Run tests to see real-time results here."}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredDetails.map((item, index) => {
              const isExpanded = expandedItems[index] !== false; // Default to expanded
              const itemId = `${item.testId}-${item.type}-${index}`;
              const isJailbreak = item.type === 'evaluation' && (item.content.strong_reject_score >= 1);
              
              return (
                <Paper 
                  key={itemId} 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: getTypeColor(item.type),
                    bgcolor: isJailbreak ? 'rgba(211, 47, 47, 0.04)' : 'inherit'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ color: getTypeColor(item.type) }}
                      >
                        {item.type === 'input' ? 'Model Input' : 
                         item.type === 'output' ? 'Model Output' : 
                         item.type === 'evaluation' ? 'Evaluation' : 'Event'}
                      </Typography>
                      
                      {item.type === 'input' && (
                        <Chip 
                          label={item.promptType} 
                          size="small" 
                          color={item.promptType === 'modified' ? 'warning' : 'default'}
                        />
                      )}
                      
                      {item.type === 'evaluation' && item.content.strong_reject_score !== undefined && (
                        <Chip 
                          label={`Score: ${item.content.strong_reject_score}`} 
                          size="small" 
                          color={getScoreBadgeColor(item.content.strong_reject_score)}
                        />
                      )}
                      
                      {isJailbreak && (
                        <Chip 
                          label="JAILBREAK" 
                          size="small" 
                          color="error"
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </Typography>
                      
                      <Tooltip title="Copy to clipboard">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(
                            item.type === 'input' || item.type === 'output' 
                              ? item.content 
                              : JSON.stringify(item.content, null, 2)
                          )}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton 
                        size="small" 
                        onClick={() => toggleExpand(index)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Test ID: {item.testId}
                  </Typography>
                  
                  {(view === 'detailed' || !isExpanded) && (
                    <Box 
                      sx={{ 
                        mt: 1,
                        p: isExpanded ? 1 : 0,
                        maxHeight: isExpanded ? 'none' : '80px',
                        overflow: isExpanded ? 'visible' : 'hidden',
                        position: 'relative',
                        bgcolor: isExpanded ? 'background.default' : 'transparent',
                        borderRadius: 1,
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {item.type === 'input' || item.type === 'output' ? (
                        <Typography 
                          component="pre" 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap', 
                            fontFamily: 'monospace', 
                            fontSize: '0.8rem',
                            maxHeight: isExpanded ? '500px' : '70px',
                            overflowY: isExpanded ? 'auto' : 'hidden'
                          }}
                        >
                          {item.content}
                        </Typography>
                      ) : item.type === 'evaluation' ? (
                        <>
                          <Typography variant="subtitle2">Scores:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                            {item.content.scores && Object.entries(item.content.scores).map(([key, value]) => (
                              <Chip 
                                key={key} 
                                label={`${key}: ${value}`} 
                                size="small" 
                                color={key === 'refusal' && value === 0 ? 'error' : 'default'}
                              />
                            ))}
                            {item.content.strong_reject_score !== undefined && (
                              <Chip 
                                label={`StrongREJECT: ${item.content.strong_reject_score}`} 
                                size="small" 
                                color={getScoreBadgeColor(item.content.strong_reject_score)}
                              />
                            )}
                          </Box>
                          
                          {item.content.explanation && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>Explanation:</Typography>
                              <Typography variant="body2" paragraph>
                                {item.content.explanation}
                              </Typography>
                            </>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2">
                          {JSON.stringify(item.content, null, 2)}
                        </Typography>
                      )}
                      
                      {!isExpanded && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            right: 0, 
                            height: '30px',
                            background: 'linear-gradient(transparent, white)'
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })}
            <div ref={detailsEndRef} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TestDetailsPanel; 