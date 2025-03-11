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
} from 'recharts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { getModelConfigById, getModelTestResults } from '../services/modelStorageService';

const ModelOverview = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [modelConfig, setModelConfig] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    loadModelData();
  }, [modelId]);

  const loadModelData = () => {
    const config = getModelConfigById(modelId);
    if (!config) {
      navigate('/');
      return;
    }
    
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
    setTestResults(results);

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
            <Typography variant="h4" component="h1" gutterBottom>
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
        <Paper sx={{ p: 3, mb: 4 }}>
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
            <Paper sx={{ p: 3, mb: 4 }}>
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

            {/* Test History Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Test History
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Overall Score</TableCell>
                      <TableCell>Tests Run</TableCell>
                      <TableCell>Tests Passed</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testResults.slice().reverse().map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          {new Date(result.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
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
                            {result.results.overallScore}%
                          </Typography>
                        </TableCell>
                        <TableCell>{result.results.totalTests}</TableCell>
                        <TableCell>{result.results.passedTests}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate('/results', { state: { testResult: result } })}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
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