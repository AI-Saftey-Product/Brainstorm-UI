import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Collapse,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  TableSortLabel,
  TextField,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getModelConfigById, getModelTestResults } from '../services/modelStorageService';
import { fetchWithAuth } from "../pages/Login.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const ModelOverview = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [modelConfig, setModelConfig] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: 'timestamp', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    score: 'all',
    groupBy: 'none'
  });

  useEffect(() => {
    loadModelData();
  }, [modelId]);

  const loadModelData = () => {
    // First try to get the model from localStorage
    let config = getModelConfigById(modelId);
    
    // If not found in localStorage, fetch from API
    if (!config) {
      // Fetch from the API
      fetchWithAuth(`${API_BASE_URL}/api/models/get_models?model_id=${modelId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(res => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          config = data[0];
          processModelData(config);
        } else {
          // If not found in API either, redirect to home
          navigate('/');
        }
      })
      .catch(error => {
        console.error("Error fetching model:", error);
        navigate('/');
      });
      
      return; // Return early as we're handling async
    }
    
    // Process the model data if found in localStorage
    processModelData(config);
  };
  
  // Helper function to process model data once we have it
  const processModelData = (config) => {
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

    const results = getModelTestResults(modelId);
    
    // Enhance each test result with the model configuration for grouping
    const enhancedResults = results.map(result => ({
      ...result,
      config: normalizedConfig  // Add model config to each result
    }));
    
    setTestResults(enhancedResults);

    // Process test results for time series visualization
    const timeData = results.map(result => ({
      date: new Date(result.timestamp).toLocaleDateString(),
      overallScore: result.results.overallScore,
      ...Object.entries(result.results.categoryScores || {}).reduce((acc, [category, score]) => ({
        ...acc,
        [category]: score.passed && score.total ? (score.passed / score.total) * 100 : 0
      }), {})
    }));
    setTimeSeriesData(timeData);
  };

  const handleRunTests = () => {
    navigate('/test-config', { state: { modelConfig } });
  };

  const handleEditConfig = () => {
    navigate('/model-config', { state: { config: modelConfig } });
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredResults = () => {
    const filteredResults = testResults.filter(result => {
      if (filters.status !== 'all') {
        const passed = result.results.overallScore >= 80;
        if (filters.status === 'passed' && !passed) return false;
        if (filters.status === 'failed' && passed) return false;
      }
      
      if (filters.dateRange !== 'all') {
        const date = new Date(result.timestamp);
        const now = new Date();
        if (filters.dateRange === 'week' && date < new Date(now - 7 * 24 * 60 * 60 * 1000)) return false;
        if (filters.dateRange === 'month' && date < new Date(now - 30 * 24 * 60 * 60 * 1000)) return false;
      }
      
      if (filters.score !== 'all') {
        const score = result.results.overallScore;
        if (filters.score === 'high' && score < 80) return false;
        if (filters.score === 'medium' && (score < 50 || score >= 80)) return false;
        if (filters.score === 'low' && score >= 50) return false;
      }
      
      return true;
    });
    
    if (filters.groupBy === 'none') {
      return filteredResults;
    }
    
    // Group results based on selected grouping
    const groupedResults = [];
    const groups = {};
    
    // First, organize results into groups
    filteredResults.forEach(result => {
      let groupKey;
      
      if (filters.groupBy === 'modality') {
        groupKey = result.config?.modality || result.config?.modelCategory || 'Unknown';
      } else if (filters.groupBy === 'modelType') {
        groupKey = result.config?.sub_type || result.config?.modelType || 'Unknown';
      } else if (filters.groupBy === 'source') {
        groupKey = result.config?.source || 'Unknown';
      } else {
        groupKey = 'Other';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(result);
    });
    
    // Then, convert groups to array format with group headers
    Object.entries(groups).forEach(([groupName, groupResults]) => {
      // Add a special row as a group header
      groupedResults.push({
        id: `group_${groupName}`,
        isGroupHeader: true,
        groupName: groupName,
        count: groupResults.length
      });
      
      // Add all results in this group
      groupResults.forEach(result => {
        groupedResults.push({
          ...result,
          groupName // Add the group name to each result for reference
        });
      });
    });
    
    return groupedResults;
  };

  const handleBulkAction = (action) => {
    switch (action) {
      case 'export':
        // Handle export
        break;
      case 'delete':
        // Handle delete
        break;
      default:
        break;
    }
  };

  if (!modelConfig) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4 
        }}>
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ mb: 4 }}
            >
              {modelConfig.name || modelConfig.modelName}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {modelConfig.sub_type || modelConfig.modelType} • {modelConfig.modality || modelConfig.modelCategory || 'NLP'}
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Edit Configuration">
              <IconButton 
                onClick={handleEditConfig}
                sx={{ mr: 1 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunTests}
            >
              Run New Tests
            </Button>
          </Box>
        </Box>

        {/* Model Information */}
        <Paper sx={{ p: 3, mb: 4, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Model Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Model ID
                </Typography>
                <Typography variant="body1">
                  {modelConfig.modelId}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {new Date(modelConfig.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {testResults.length > 0 ? (
          <>
            {/* Test Results Timeline */}
            <Paper sx={{ p: 3, mb: 4, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Compliance Score History
              </Typography>
              <Box sx={{ height: 400, mt: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeSeriesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="overallScore" 
                      name="Overall Score"
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                    {Object.keys(timeSeriesData[0] || {})
                      .filter(key => key !== 'date' && key !== 'overallScore')
                      .map((category, index) => (
                        <Line
                          key={category}
                          type="monotone"
                          dataKey={category}
                          name={category}
                          stroke={`hsl(${index * 45}, 70%, 50%)`}
                          strokeWidth={2}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Enhanced Test History Table */}
            <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                Test History
              </Typography>
                
                {/* Filters */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      label="Status"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="passed">Passed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small">
                    <InputLabel>Date Range</InputLabel>
                    <Select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      label="Date Range"
                    >
                      <MenuItem value="all">All Time</MenuItem>
                      <MenuItem value="week">Last Week</MenuItem>
                      <MenuItem value="month">Last Month</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small">
                    <InputLabel>Score</InputLabel>
                    <Select
                      value={filters.score}
                      onChange={(e) => setFilters(prev => ({ ...prev, score: e.target.value }))}
                      label="Score"
                    >
                      <MenuItem value="all">All Scores</MenuItem>
                      <MenuItem value="high">High (≥80%)</MenuItem>
                      <MenuItem value="medium">Medium (50-79%)</MenuItem>
                      <MenuItem value="low">Low (≤49%)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small">
                    <InputLabel>Group By</InputLabel>
                    <Select
                      value={filters.groupBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
                      label="Group By"
                    >
                      <MenuItem value="none">No Grouping</MenuItem>
                      <MenuItem value="modality">Modality</MenuItem>
                      <MenuItem value="modelType">Model Type</MenuItem>
                      <MenuItem value="source">Source</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Bulk Actions */}
              {selectedRows.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      bgcolor: 'primary.lighter'
                    }}
                  >
                    <Typography variant="body2">
                      {selectedRows.length} items selected
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleBulkAction('export')}
                    >
                      Export Selected
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleBulkAction('delete')}
                    >
                      Delete Selected
                    </Button>
                  </Paper>
                </Box>
              )}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.length === getFilteredResults().length}
                          indeterminate={selectedRows.length > 0 && selectedRows.length < getFilteredResults().length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(getFilteredResults().map(r => r.id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortConfig.field === 'timestamp'}
                          direction={sortConfig.field === 'timestamp' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('timestamp')}
                        >
                          Date
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortConfig.field === 'overallScore'}
                          direction={sortConfig.field === 'overallScore' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('overallScore')}
                        >
                          Overall Score
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Tests Run</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredResults()
                      .sort((a, b) => {
                        // Don't sort group headers - they should always be first in their group
                        if (a.isGroupHeader) return -1;
                        if (b.isGroupHeader) return 1;
                        
                        const direction = sortConfig.direction === 'asc' ? 1 : -1;
                        if (sortConfig.field === 'timestamp') {
                          return direction * (new Date(a.timestamp) - new Date(b.timestamp));
                        }
                        if (sortConfig.field === 'overallScore') {
                          return direction * (a.results.overallScore - b.results.overallScore);
                        }
                        return 0;
                      })
                      .map((result) => {
                        // Render group header row
                        if (result.isGroupHeader) {
                          return (
                            <TableRow 
                              key={result.id}
                              sx={{ 
                                backgroundColor: theme => theme.palette.background.neutral || '#f5f5f5',
                                '&:hover': {
                                  backgroundColor: theme => theme.palette.background.neutral || '#f5f5f5',
                                },
                              }}
                            >
                              <TableCell 
                                colSpan={7} 
                                sx={{ 
                                  py: 1.5, 
                                  pl: 2,
                                  borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                  fontWeight: 'bold',
                                  color: theme => theme.palette.text.primary
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {filters.groupBy === 'source' && (
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        mr: 1, 
                                        p: 0.75, 
                                        borderRadius: 1, 
                                        backgroundColor: theme => theme.palette.primary.light,
                                        color: theme => theme.palette.primary.contrastText,
                                        fontSize: '0.75rem',
                                        fontWeight: 'medium',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}
                                    >
                                      {result.groupName}
                                    </Box>
                                  )}
                                  
                                  {filters.groupBy === 'modality' && (
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        mr: 1, 
                                        p: 0.75, 
                                        borderRadius: 1, 
                                        backgroundColor: theme => theme.palette.secondary.light,
                                        color: theme => theme.palette.secondary.contrastText,
                                        fontSize: '0.75rem',
                                        fontWeight: 'medium',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}
                                    >
                                      {result.groupName}
                                    </Box>
                                  )}
                                  
                                  {filters.groupBy === 'modelType' && (
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        mr: 1, 
                                        p: 0.75, 
                                        borderRadius: 1, 
                                        backgroundColor: theme => theme.palette.info.light,
                                        color: theme => theme.palette.info.contrastText,
                                        fontSize: '0.75rem',
                                        fontWeight: 'medium',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}
                                    >
                                      {result.groupName}
                                    </Box>
                                  )}
                                  
                                  <Typography variant="body1" component="span">
                                    {result.count} {result.count === 1 ? 'Result' : 'Results'}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        // Regular result row (existing code)
                        return (
                          <React.Fragment key={result.id}>
                            <TableRow
                              hover
                              selected={selectedRows.includes(result.id)}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedRows.includes(result.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRows(prev => [...prev, result.id]);
                                    } else {
                                      setSelectedRows(prev => prev.filter(id => id !== result.id));
                                    }
                                  }}
                                />
                              </TableCell>
                          <TableCell>
                            {new Date(result.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              sx={{
                                color: theme => {
                                  const score = result.results.overallScore;
                                  return score >= 80 ? theme.palette.success.main :
                                         score >= 50 ? theme.palette.warning.main :
                                         theme.palette.error.main;
                                },
                                fontWeight: 'bold'
                              }}
                            >
                                    {(result.results.overallScore !== undefined && result.results.overallScore !== null) 
                                     ? result.results.overallScore.toFixed(1) + '%' 
                                     : 'N/A'}
                            </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}
                                  >
                                    {expandedRow === result.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                  </IconButton>
                                </Box>
                          </TableCell>
                          <TableCell>{result.results.totalTests}</TableCell>
                              <TableCell>{result.duration || '2m 30s'}</TableCell>
                          <TableCell>
                                <Chip
                                  label={result.results.overallScore >= 80 ? 'Passed' : 'Failed'}
                                  color={result.results.overallScore >= 80 ? 'success' : 'error'}
                              size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="View Details">
                                  <IconButton size="small" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                                    <InfoIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            
                            {/* Expandable Row */}
                            <TableRow>
                              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                <Collapse in={expandedRow === result.id} timeout="auto" unmountOnExit>
                                  <Box sx={{ margin: 2 }}>
                                    <Typography variant="h6" gutterBottom component="div">
                                      Test Details
                                    </Typography>
                                    
                                    <Grid container spacing={3}>
                                      {/* Category Scores */}
                                      <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                          Category Scores
                                        </Typography>
                                        {Object.entries(result.results.categoryScores || {}).map(([category, score]) => (
                                          <Box key={category} sx={{ mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                              <Typography variant="body2">{category}</Typography>
                                              <Typography variant="body2">
                                                {score && score.passed !== undefined && score.total ? 
                                                  `${score.passed}/${score.total} (${((score.passed/score.total) * 100).toFixed(1)}%)` :
                                                  'N/A'
                                                }
                                              </Typography>
                                            </Box>
                                            <LinearProgress
                                              variant="determinate"
                                              value={score && score.passed !== undefined && score.total ? 
                                                (score.passed/score.total) * 100 : 0}
                                              sx={{ height: 4, borderRadius: 1 }}
                                            />
                                          </Box>
                                        ))}
                                      </Grid>
                                      
                                      {/* Test Configuration */}
                                      <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                          Test Configuration
                                        </Typography>
                                        <TableContainer component={Paper} variant="outlined">
                                          <Table size="small">
                                            <TableBody>
                                              {Object.entries(result.config || {}).map(([key, value]) => (
                                                <TableRow key={key}>
                                                  <TableCell component="th" scope="row">
                                                    {key}
                                                  </TableCell>
                                                  <TableCell>{value}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </Grid>
                                      
                                      {/* Notes */}
                                      <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                          Notes
                                        </Typography>
                                        <TextField
                                          fullWidth
                                          multiline
                                          rows={2}
                                          placeholder="Add notes about this test run..."
                                          value={result.notes || ''}
                                          onChange={(e) => {
                                            // Handle notes update
                                          }}
                                        />
                                      </Grid>
                                    </Grid>
                                  </Box>
                                </Collapse>
                          </TableCell>
                        </TableRow>
                          </React.Fragment>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              No Test Results Yet
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Run your first test to see the results and track changes over time.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunTests}
            >
              Run First Test
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default ModelOverview; 