import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { fetchWithAuth } from '../pages/Login';
import { 
  ArrowForward,
  ArrowBack,
  PlayArrow,
  ModelTraining,
  Storage,
  Settings,
  Check,
  DeleteOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const RunTestsWizard = () => {
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Models', 'Choose Datasets', 'Select Evaluators', 'Review & Run'];
  
  // Data states
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [suggestedScorers, setSuggestedScorers] = useState({});
  const [selectedScorer, setSelectedScorer] = useState('ExactStringMatchScorer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  // Load models and datasets
  useEffect(() => {
    fetchModels();
    fetchDatasets();
  }, []);
  
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/models/get_models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      setModels(data);
    } catch (error) {
      setError('Error loading models. Please try again.');
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/datasets/get_datasets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch datasets");
      const data = await response.json();
      setDatasets(data);
    } catch (error) {
      setError('Error loading datasets. Please try again.');
      console.error('Error fetching datasets:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleModelToggle = (model) => {
    setSelectedModels(prev => {
      if (prev.some(m => m.model_id === model.model_id)) {
        return prev.filter(m => m.model_id !== model.model_id);
      } else {
        return [...prev, model];
      }
    });
  };
  
  const handleDatasetToggle = (dataset) => {
    setSelectedDatasets(prev => {
      if (prev.some(d => d.dataset_id === dataset.dataset_id)) {
        return prev.filter(d => d.dataset_id !== dataset.dataset_id);
      } else {
        return [...prev, dataset];
      }
    });
  };
  
  // Fetch suggested scorers for selected datasets
  const fetchSuggestedScorers = async () => {
    if (selectedDatasets.length === 0) return;
    
    setLoading(true);
    try {
      // Use the first dataset to get suggested scorers
      const datasetId = selectedDatasets[0].dataset_id;
      
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/datasets/get_dataset_suggested_scorers_and_dimensions?dataset_id=${datasetId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch suggested scorers");
      const data = await response.json();
      
      // Initialize safe default values in case the API returns unexpected data
      let scorersData = {
        suggested_scorers: [],
        suggested_agg_dimensions: []
      };
      
      // Safely extract data from the API response
      if (data) {
        if (Array.isArray(data.suggested_scorers)) {
          scorersData.suggested_scorers = data.suggested_scorers;
        }
        
        if (Array.isArray(data.suggested_agg_dimensions)) {
          scorersData.suggested_agg_dimensions = data.suggested_agg_dimensions;
        }
      }
      
      // Save the structured data
      setSuggestedScorers(scorersData);
      
      // Define available scorers based on what's in the backend SCORERS_MAP
      const availableScorers = ["ExactStringMatchScorer", "LLMQAMatchScorer"];
      
      // Check if suggested scorers are valid and available in the backend
      if (scorersData.suggested_scorers && scorersData.suggested_scorers.length > 0) {
        const validScorers = scorersData.suggested_scorers.filter(scorer => 
          availableScorers.includes(scorer)
        );
        
        // Set default scorer if available
        if (validScorers.length > 0) {
          setSelectedScorer(validScorers[0]);
        } else {
          setSelectedScorer("ExactStringMatchScorer"); // Default
        }
      } else {
        setSelectedScorer("ExactStringMatchScorer"); // Default
      }
    } catch (error) {
      setError('Error loading suggested scorers. Please try again.');
      console.error('Error fetching scorers:', error);
      // Set a safe default value
      setSelectedScorer("ExactStringMatchScorer");
      // Also set safe default values for suggested scorers
      setSuggestedScorers({
        suggested_scorers: [],
        suggested_agg_dimensions: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Call fetchSuggestedScorers when datasets are selected and we navigate to the evaluator step
  useEffect(() => {
    if (activeStep === 2 && selectedDatasets.length > 0) {
      fetchSuggestedScorers();
    }
  }, [activeStep, selectedDatasets]);
  
  const handleScorerSelect = (scorer) => {
    setSelectedScorer(scorer);
  };
  
  const handleRunTests = async () => {
    if (selectedModels.length === 0 || selectedDatasets.length === 0) {
      setError('Please select at least one model and one dataset.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare test configuration
      const testConfig = {
        models: selectedModels.map(model => model.model_id),
        datasets: selectedDatasets.map(dataset => dataset.dataset_id),
        scorer: selectedScorer
      };
      
      console.log('Running tests with config:', testConfig);
      
      // Instead of showing an alert, navigate to the RunTests page
      // with the selected models and datasets
      setTimeout(() => {
        setLoading(false);
        
        // Navigate to the RunTests page
        navigate('/run-tests/execute', { 
          state: { 
            selectedTests: selectedDatasets.map(dataset => dataset.dataset_id),
            modelConfig: selectedModels[0], // Pass the first selected model as the config
            testParameters: {
              datasets: selectedDatasets.map(dataset => dataset.dataset_id),
              scorer: selectedScorer
            }
          } 
        });
      }, 1000);
      
    } catch (error) {
      setError('Failed to start tests. Please try again.');
      console.error('Error running tests:', error);
      setLoading(false);
    }
  };
  
  // Step content components
  const ModelSelectionStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Models to Test
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose one or more models to run your tests against.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {models.map((model) => (
            <Grid item xs={12} md={6} key={model.model_id}>
              <Card 
                variant="outlined"
                sx={{ 
                  borderColor: selectedModels.some(m => m.model_id === model.model_id) 
                    ? 'primary.main' 
                    : 'divider',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1
                  }
                }}
                onClick={() => handleModelToggle(model)}
              >
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" component="div">
                        {model.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {model.provider || 'Provider'} • {model.sub_type || 'Type'}
                      </Typography>
                    </Box>
                    <Checkbox 
                      checked={selectedModels.some(m => m.model_id === model.model_id)}
                      onChange={() => handleModelToggle(model)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {models.length === 0 && !loading && (
            <Grid item xs={12}>
              <Alert severity="info">
                No models available. Please add a model first.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
  
  const DatasetSelectionStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Datasets
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose datasets to test your models against.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {datasets.map((dataset) => (
            <Grid item xs={12} md={6} key={dataset.dataset_id}>
              <Card 
                variant="outlined"
                sx={{ 
                  borderColor: selectedDatasets.some(d => d.dataset_id === dataset.dataset_id) 
                    ? 'primary.main' 
                    : 'divider',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1
                  }
                }}
                onClick={() => handleDatasetToggle(dataset)}
              >
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" component="div">
                        {dataset.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dataset.items_count || 0} items • {dataset.category || 'Uncategorized'}
                      </Typography>
                    </Box>
                    <Checkbox 
                      checked={selectedDatasets.some(d => d.dataset_id === dataset.dataset_id)}
                      onChange={() => handleDatasetToggle(dataset)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {datasets.length === 0 && !loading && (
            <Grid item xs={12}>
              <Alert severity="info">
                No datasets available. Please add a dataset first.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
  
  // Add new Evaluator Selection Step
  const EvaluatorSelectionStep = () => {
    // Define available scorers based on what's in the backend SCORERS_MAP
    const availableScorers = ["ExactStringMatchScorer", "LLMQAMatchScorer"];
    
    // Safely handle suggested scorers - ensure it's an array before filtering
    const validSuggestedScorers = Array.isArray(suggestedScorers?.suggested_scorers) 
      ? suggestedScorers.suggested_scorers.filter(scorer => availableScorers.includes(scorer))
      : [];
    
    // If no valid suggested scorers, use all available scorers
    const displayScorers = validSuggestedScorers.length > 0
      ? validSuggestedScorers 
      : availableScorers;
    
    // If the current selected scorer isn't valid, update it
    useEffect(() => {
      if (!availableScorers.includes(selectedScorer)) {
        setSelectedScorer("ExactStringMatchScorer"); // Default to ExactStringMatchScorer
      }
    }, []);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Select Evaluators
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Choose the appropriate evaluator for your test datasets.
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {displayScorers.length > 0 ? (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Available Scorers for {selectedDatasets.length > 1 
                    ? `${selectedDatasets.length} datasets` 
                    : selectedDatasets[0]?.name}
                </Typography>
                <Grid container spacing={2}>
                  {displayScorers.map((scorer) => (
                    <Grid item xs={12} md={6} key={scorer}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          borderColor: selectedScorer === scorer ? 'primary.main' : 'divider',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 1
                          }
                        }}
                        onClick={() => handleScorerSelect(scorer)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="h6" component="div">
                                {scorer}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getEvaluatorDescription(scorer)}
                              </Typography>
                            </Box>
                            <Checkbox 
                              checked={selectedScorer === scorer}
                              onChange={() => handleScorerSelect(scorer)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {Array.isArray(suggestedScorers?.suggested_agg_dimensions) && 
                  suggestedScorers.suggested_agg_dimensions.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggested Dimensions
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {suggestedScorers.suggested_agg_dimensions.map((dimension) => (
                          <Chip 
                            key={dimension} 
                            label={dimension} 
                            variant="outlined" 
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info">
                No suggested scorers available. Using "ExactStringMatchScorer" by default.
              </Alert>
            )}
          </Box>
        )}
      </Box>
    );
  };
  
  // Helper function to get evaluator descriptions
  const getEvaluatorDescription = (scorer) => {
    const descriptions = {
      'ExactStringMatchScorer': 'Compares outputs for exact string match, case-insensitive',
      'LLMQAMatchScorer': 'Uses an LLM to evaluate whether an answer is correct',
      'exact_match': 'Compares outputs for exact string match',
      'semantic_similarity': 'Evaluates semantic similarity between outputs',
      'rouge': 'Calculates ROUGE metrics for text summarization',
      'bleu': 'Computes BLEU score for machine translation',
      'f1_score': 'Calculates F1 score for classification tasks',
      'accuracy': 'Measures prediction accuracy',
      'coherence': 'Evaluates text coherence and flow',
      'toxicity': 'Measures harmful or toxic content',
      'multi_choice': 'Evaluates multiple choice question responses',
    };
    
    return descriptions[scorer] || 'Evaluator for model outputs';
  };
  
  // Update ReviewStep to include scorer information
  const ReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Test Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Verify your test setup before running.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Selected Models ({selectedModels.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List dense>
              {selectedModels.map((model) => (
                <ListItem 
                  key={model.model_id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleModelToggle(model)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  }
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon>
                    <ModelTraining fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={model.name}
                    secondary={`${model.provider || 'Provider'} • ${model.sub_type || 'Type'}`}
                  />
                </ListItem>
              ))}
              
              {selectedModels.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ my: 2, ml: 2 }}>
                  No models selected
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Selected Datasets ({selectedDatasets.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List dense>
              {selectedDatasets.map((dataset) => (
                <ListItem 
                  key={dataset.dataset_id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleDatasetToggle(dataset)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  }
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon>
                    <Storage fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={dataset.name}
                    secondary={`${dataset.items_count || 0} items • ${dataset.category || 'Uncategorized'}`}
                  />
                </ListItem>
              ))}
              
              {selectedDatasets.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ my: 2, ml: 2 }}>
                  No datasets selected
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Selected Evaluator
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ px: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {selectedScorer}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getEvaluatorDescription(selectedScorer)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {(selectedModels.length === 0 || selectedDatasets.length === 0) && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Please select at least one model and one dataset to run tests.
        </Alert>
      )}
    </Box>
  );
  
  // Get content for current step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <ModelSelectionStep />;
      case 1:
        return <DatasetSelectionStep />;
      case 2:
        return <EvaluatorSelectionStep />;
      case 3:
        return <ReviewStep />;
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4, mb: 6, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Run Tests
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4, pt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          {getStepContent(activeStep)}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleRunTests}
                disabled={loading || selectedModels.length === 0 || selectedDatasets.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
              >
                {loading ? 'Starting...' : 'Run Tests'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
                disabled={
                  (activeStep === 0 && selectedModels.length === 0) ||
                  (activeStep === 1 && selectedDatasets.length === 0)
                }
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default RunTestsWizard; 