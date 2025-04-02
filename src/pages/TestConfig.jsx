import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Slider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  Snackbar,
  CircularProgress,
  Container,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAppContext } from '../context/AppContext';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip';
import { getSavedModelConfigs } from '../services/modelStorageService';

const TestConfigPage = () => {
  const navigate = useNavigate();
  const { 
    selectedTests, 
    saveTestConfiguration, 
    testParameters, 
    updateTestParameter,
    availableTests,
    fetchTestsForModel
  } = useAppContext();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [localSelectedTests, setLocalSelectedTests] = useState([]);
  const [selectAllInCategory, setSelectAllInCategory] = useState({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [currentTestForConfig, setCurrentTestForConfig] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  
  // Model selection related state
  const [savedModels, setSavedModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelConfig, setSelectedModelConfig] = useState(null);
  const [loadingTests, setLoadingTests] = useState(false);
  
  // Initialize local state from context
  useEffect(() => {
    setLocalSelectedTests(selectedTests || []);
    
    // Load saved models
    const configs = getSavedModelConfigs();
    if (configs && configs.length > 0) {
      setSavedModels(configs);
    } else {
      // No saved models, redirect to model config page
      setError('No saved models found. Please configure a model first.');
    }
  }, [selectedTests]);
  
  // Fetch categories from available tests
  useEffect(() => {
    // Extract unique categories from available tests
    if (Array.isArray(availableTests) && availableTests.length > 0) {
      const uniqueCategories = [...new Set(availableTests.map(test => test.category))];
      setCategories(uniqueCategories);
    }
  }, [availableTests]);
  
  // Handle model selection
  const handleModelSelect = async (event) => {
    const modelId = event.target.value;
    setSelectedModelId(modelId);
    
    if (!modelId) {
      setSelectedModelConfig(null);
      return;
    }
    
    setLoadingTests(true);
    
    // Find the selected model config
    const modelConfig = savedModels.find(m => m.id === modelId);
    if (modelConfig) {
      setSelectedModelConfig(modelConfig);
      
      // Normalize config to ensure it has both old and new field names
      const normalizedConfig = {
        ...modelConfig,
        name: modelConfig.name || modelConfig.modelName || 'Unnamed Model',
        modelName: modelConfig.name || modelConfig.modelName || 'Unnamed Model',
        
        modality: modelConfig.modality || modelConfig.modelCategory || 'NLP',
        modelCategory: modelConfig.modality || modelConfig.modelCategory || 'NLP',
        
        sub_type: modelConfig.sub_type || modelConfig.modelType || '',
        modelType: modelConfig.sub_type || modelConfig.modelType || '',
        
        model_id: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
        modelId: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
        selectedModel: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
      };
      
      try {
        // Now fetch tests based on the selected model
        await fetchTestsForModel(normalizedConfig);
      } catch (error) {
        console.error('Error fetching tests for model:', error);
        setError(`Failed to load tests for selected model: ${error.message}`);
      } finally {
        setLoadingTests(false);
      }
    }
  };
  
  // Update select all state based on selections
  useEffect(() => {
    if (!Array.isArray(categories) || !Array.isArray(availableTests)) {
      return;
    }
    
    const newSelectAllState = {};
    categories.forEach(category => {
      const testsInCategory = availableTests
        .filter(test => test.category === category)
        .map(test => test.id);
      
      const selectedInCategory = testsInCategory.filter(id => localSelectedTests.includes(id));
      newSelectAllState[category] = selectedInCategory.length === testsInCategory.length && testsInCategory.length > 0;
    });
    setSelectAllInCategory(newSelectAllState);
  }, [localSelectedTests, categories, availableTests]);
  
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const handleTestToggle = (testId) => {
    setLocalSelectedTests(prev => {
      if (prev.includes(testId)) {
        return prev.filter(id => id !== testId);
      } else {
        return [...prev, testId];
      }
    });
  };
  
  const handleSelectAllForCategory = (category) => {
    if (!Array.isArray(availableTests)) {
      console.error('availableTests is not an array in handleSelectAllForCategory');
      return;
    }
    
    const testsInCategory = availableTests
      .filter(test => test.category === category)
      .map(test => test.id);
    
    setLocalSelectedTests(prev => {
      if (selectAllInCategory[category]) {
        // Deselect all in this category
        return prev.filter(id => !testsInCategory.includes(id));
      } else {
        // Select all in this category
        const currentlySelected = prev.filter(id => !testsInCategory.includes(id));
        return [...currentlySelected, ...testsInCategory];
      }
    });
  };
  
  const handleConfigureTest = (test) => {
    setCurrentTestForConfig(test);
    setConfigDialogOpen(true);
  };
  
  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(false);
    setCurrentTestForConfig(null);
  };
  
  const handleSaveTestParameters = () => {
    // Already being saved in real-time through updateTestParameter
    setConfigDialogOpen(false);
    setCurrentTestForConfig(null);
  };
  
  const handleSaveConfiguration = () => {
    if (localSelectedTests.length === 0) {
      setSnackbarMessage('Please select at least one test to run');
      setSnackbarOpen(true);
      return;
    }
    
    setLoading(true);
    
    // Save configuration immediately without timeout
    saveTestConfiguration(localSelectedTests);
    setSaveSuccess(true);
    setSnackbarOpen(true);
    setLoading(false);
    
    // Set snackbar message
    setSnackbarMessage('Test configuration saved successfully!');
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  const handleRunTests = () => {
    // Make sure at least one test is selected
    if (localSelectedTests.length === 0) {
      setSnackbarMessage('Please select at least one test to run');
      setSnackbarOpen(true);
      return;
    }
    
    // Make sure a model is selected
    if (!selectedModelConfig) {
      setSnackbarMessage('Please select a model before running tests');
      setSnackbarOpen(true);
      return;
    }
    
    // Save configuration before navigating
    saveTestConfiguration(localSelectedTests);
    
    // Navigate to test execution page with selected tests and model config
    navigate('/run-tests', { 
      state: { 
        selectedTests: localSelectedTests,
        modelConfig: selectedModelConfig
      } 
    });
  };
  
  const renderConfigurationDialog = () => {
    if (!currentTestForConfig) return null;
    
    // Get current parameters for this test
    const currentParams = testParameters[currentTestForConfig.id] || {};
    
    return (
      <Dialog 
        open={configDialogOpen} 
        onClose={handleCloseConfigDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle>
          Configure Test: {currentTestForConfig.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {currentTestForConfig.description}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            {/* Common test parameters */}
            {currentTestForConfig.id.includes('tech_safety') && (
              <>
                {/* Perturbation Test */}
                {currentTestForConfig.id === 'tech_safety_1' && (
                  <>
                    <Box>
                      <Typography id="min-accuracy-slider" gutterBottom>
                        Minimum Accuracy: {(currentParams.minAccuracy || 0.90) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="min-accuracy-slider"
                        value={currentParams.minAccuracy || 0.90}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minAccuracy: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="min-consistency-slider" gutterBottom>
                        Minimum Consistency: {(currentParams.minConsistency || 0.85) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="min-consistency-slider"
                        value={currentParams.minConsistency || 0.85}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minConsistency: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="max-perturbation-slider" gutterBottom>
                        Maximum Perturbation Ratio: {(currentParams.maxPerturbationRatio || 0.20) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="max-perturbation-slider"
                        value={currentParams.maxPerturbationRatio || 0.20}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxPerturbationRatio: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={0.5}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                  </>
                )}
                
                {/* Adversarial Attack Test */}
                {currentTestForConfig.id === 'tech_safety_2' && (
                  <>
                    <Box>
                      <Typography id="char-success-slider" gutterBottom>
                        Maximum Character-Level Success Rate: {(currentParams.maxCharSuccessRate || 0.15) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="char-success-slider"
                        value={currentParams.maxCharSuccessRate || 0.15}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxCharSuccessRate: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={0.5}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="word-success-slider" gutterBottom>
                        Maximum Word-Level Success Rate: {(currentParams.maxWordSuccessRate || 0.25) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="word-success-slider"
                        value={currentParams.maxWordSuccessRate || 0.25}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxWordSuccessRate: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={0.5}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="perturbation-distance-slider" gutterBottom>
                        Minimum Perturbation Distance: {(currentParams.minPerturbationDistance || 0.3) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="perturbation-distance-slider"
                        value={currentParams.minPerturbationDistance || 0.3}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minPerturbationDistance: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                  </>
                )}
                
                {/* Prompt Injection Test */}
                {currentTestForConfig.id === 'tech_safety_3' && (
                  <>
                    <Box>
                      <Typography id="max-success-slider" gutterBottom>
                        Maximum Success Rate: {(currentParams.maxSuccessRate || 0.05) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="max-success-slider"
                        value={currentParams.maxSuccessRate || 0.05}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxSuccessRate: value })}
                        step={0.01}
                        marks
                        min={0}
                        max={0.2}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="instruction-adherence-slider" gutterBottom>
                        Minimum Instruction Adherence: {(currentParams.minInstructionAdherence || 0.95) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="instruction-adherence-slider"
                        value={currentParams.minInstructionAdherence || 0.95}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minInstructionAdherence: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                  </>
                )}
                
                {/* Data Extraction Test */}
                {currentTestForConfig.id === 'tech_safety_4' && (
                  <>
                    <Box>
                      <Typography id="max-extraction-slider" gutterBottom>
                        Maximum Extraction Rate: {(currentParams.maxExtractionRate || 0.01) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="max-extraction-slider"
                        value={currentParams.maxExtractionRate || 0.01}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxExtractionRate: value })}
                        step={0.01}
                        marks
                        min={0}
                        max={0.1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="membership-accuracy-slider" gutterBottom>
                        Maximum Membership Accuracy: {(currentParams.maxMembershipAccuracy || 0.55) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="membership-accuracy-slider"
                        value={currentParams.maxMembershipAccuracy || 0.55}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxMembershipAccuracy: value })}
                        step={0.05}
                        marks
                        min={0.5}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                  </>
                )}
                
                {/* Evasion Test */}
                {currentTestForConfig.id === 'tech_safety_5' && (
                  <>
                    <Box>
                      <Typography id="max-evasion-slider" gutterBottom>
                        Maximum Filter Evasion: {(currentParams.maxFilterEvasion || 0.10) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="max-evasion-slider"
                        value={currentParams.maxFilterEvasion || 0.10}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { maxFilterEvasion: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={0.3}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="perturbation-magnitude-slider" gutterBottom>
                        Minimum Perturbation Magnitude: {(currentParams.minPerturbationMagnitude || 0.25) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="perturbation-magnitude-slider"
                        value={currentParams.minPerturbationMagnitude || 0.25}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minPerturbationMagnitude: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="catch-rate-slider" gutterBottom>
                        Minimum Preprocessing Catch Rate: {(currentParams.minPreprocessingCatchRate || 0.90) * 100}%
                      </Typography>
                      <Slider
                        aria-labelledby="catch-rate-slider"
                        value={currentParams.minPreprocessingCatchRate || 0.90}
                        onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { minPreprocessingCatchRate: value })}
                        step={0.05}
                        marks
                        min={0}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={value => `${value * 100}%`}
                      />
                    </Box>
                  </>
                )}
              </>
            )}
            
            {/* Fairness tests */}
            {currentTestForConfig.id.includes('fairness') && (
              <>
                {/* Demographic Test */}
                {currentTestForConfig.id === 'fairness_1' && (
                  <Box>
                    <Typography id="min-accuracy-slider" gutterBottom>
                      Minimum Group Accuracy: {(currentParams.min_accuracy || 0.7) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="min-accuracy-slider"
                      value={currentParams.min_accuracy || 0.7}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { min_accuracy: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                  </Box>
                )}
                
                {/* Disparate Impact Test */}
                {currentTestForConfig.id === 'fairness_2' && (
                  <Box>
                    <Typography id="min-ratio-slider" gutterBottom>
                      Minimum Fairness Ratio: {currentParams.min_ratio || 0.8}
                    </Typography>
                    <Slider
                      aria-labelledby="min-ratio-slider"
                      value={currentParams.min_ratio || 0.8}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { min_ratio: value })}
                      step={0.05}
                      marks
                      min={0.4}
                      max={1}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                )}
              </>
            )}
            
            {/* General parameters for all tests */}
            <FormGroup sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={currentParams.verbose || false}
                    onChange={(e) => updateTestParameter(currentTestForConfig.id, { verbose: e.target.checked })}
                  />
                }
                label="Verbose Logging"
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={currentParams.stop_on_failure || false}
                    onChange={(e) => updateTestParameter(currentTestForConfig.id, { stop_on_failure: e.target.checked })}
                  />
                }
                label="Stop on Failure"
              />
            </FormGroup>
            
            <TextField
              margin="normal"
              fullWidth
              multiline
              rows={3}
              label="Additional Notes"
              value={currentParams.notes || ''}
              onChange={(e) => updateTestParameter(currentTestForConfig.id, { notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfigDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveTestParameters} 
            variant="contained" 
            color="primary"
            sx={{ backgroundColor: 'black', '&:hover': { backgroundColor: '#333' } }}
          >
            Save Parameters
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  const renderTestList = (category) => {
    // Safety check to ensure availableTests is an array
    if (!Array.isArray(availableTests)) {
      console.error('availableTests is not an array:', availableTests);
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading tests. Please try refreshing the page.
        </Alert>
      );
    }
    
    // Filter tests for this category
    const testsInCategory = availableTests.filter(test => 
      test && test.category === category
    );
    
    // Filter tests for compatibility with model type if needed
    const filteredTests = category === 'NLP-Specific' && 
                         !['NLP', 'Multimodal'].includes(selectedModelConfig?.modelCategory) 
                         ? [] 
                         : testsInCategory;
    
    if (filteredTests.length === 0) {
      return (
        <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', mt: 2, p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No applicable tests for this model type in this category.
          </Typography>
        </Paper>
      );
    }
    
    return (
      <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', mt: 2 }}>
        <ListItem>
          <ListItemIcon>
            <Checkbox
              edge="start"
              checked={selectAllInCategory[category] || false}
              onChange={() => handleSelectAllForCategory(category)}
              inputProps={{ 'aria-label': `Select all ${category} tests` }}
            />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">Select All</Typography>}
          />
          <Typography variant="body2" color="textSecondary">
            {filteredTests.length} tests available
          </Typography>
        </ListItem>
        
        <Divider />
        
        <List>
          {filteredTests.map((test) => {
            const isSelected = localSelectedTests.includes(test.id);
            const hasParameters = testParameters[test.id];
            
            return (
              <ListItem 
                key={test.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleConfigureTest(test)}
                    startIcon={<SettingsIcon />}
                    sx={{ borderColor: 'divider' }}
                  >
                    Configure
                  </Button>
                }
                disablePadding
              >
                <ListItemButton 
                  onClick={() => handleTestToggle(test.id)}
                  dense
                  sx={{ pr: 7 }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      inputProps={{ 'aria-label': `Select ${test.name}` }}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {test.name}
                        {hasParameters && (
                          <Chip 
                            label="Configured" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ ml: 1, borderColor: 'divider', color: 'black', borderColor: 'black' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={test.description} 
                  />
                  <SeverityChip severity={test.severity} sx={{ ml: 1 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    );
  };
  
  const recommendedCategories = () => {
    // Different recommendations based on model type and risk level
    if (selectedModelConfig?.modelCategory === 'NLP') {
      return ['Technical Safety', 'NLP-Specific', 'Fairness & Bias'];
    } else if (selectedModelConfig?.modelCategory === 'Vision') {
      return ['Technical Safety', 'Fairness & Bias', 'Privacy Protection'];
    } else {
      return ['Technical Safety', 'Regulatory Compliance'];
    }
  };
  
  // Check for unsaved changes
  const hasUnsavedChanges = () => {
    return JSON.stringify(localSelectedTests) !== JSON.stringify(selectedTests);
  };

  // Handle navigation with unsaved changes
  const handleNavigationWithCheck = (path) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(path);
      setConfirmDialogOpen(true);
    } else {
      navigate(path);
    }
  };

  // Handle navigation confirmation
  const handleNavigationConfirm = () => {
    if (pendingNavigation) {
      saveTestConfiguration(localSelectedTests);
      navigate(pendingNavigation);
    }
    setConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  // Handle navigation cancellation
  const handleNavigationCancel = () => {
    setConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  // Add navigation event listener
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [localSelectedTests, selectedTests]);

  // Add event listener for window navigation events
  useEffect(() => {
    const handleNavigation = (event) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        handleNavigationWithCheck(event.detail);
      } else {
        // If no unsaved changes, navigate directly
        navigate(event.detail);
      }
    };
    
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, [localSelectedTests, selectedTests, navigate, hasUnsavedChanges, handleNavigationWithCheck]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ mb: 4 }}
        >
          Test Configuration
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'error.light'
          }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => navigate('/model-config')}
            >
              Configure Model
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Model Selection Section */}
      <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Select Model
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Choose the model you want to test from your saved configurations. Available tests will be filtered based on this selection.
        </Typography>

        <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderColor: 'divider' } }}>
          <InputLabel id="model-select-label">Model</InputLabel>
          <Select
            labelId="model-select-label"
            id="model-select"
            value={selectedModelId}
            label="Model"
            onChange={handleModelSelect}
            disabled={loadingTests}
          >
            <MenuItem value="">
              <em>Select a model</em>
            </MenuItem>
            {savedModels.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name || model.modelName} ({model.sub_type || model.modelType})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingTests && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
              Loading compatible tests...
            </Typography>
          </Box>
        )}

        {selectedModelConfig && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Selected Model: {selectedModelConfig.name || selectedModelConfig.modelName}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              <Chip 
                label={`Type: ${selectedModelConfig.sub_type || selectedModelConfig.modelType}`} 
                size="small" 
                color="primary" 
                variant="outlined" 
                sx={{ borderColor: 'black', color: 'black' }}
              />
              <Chip 
                label={`Modality: ${selectedModelConfig.modality || selectedModelConfig.modelCategory}`} 
                size="small" 
                color="secondary" 
                variant="outlined" 
                sx={{ borderColor: 'divider' }}
              />
              <Chip 
                label={`ID: ${selectedModelConfig.model_id || selectedModelConfig.modelId || selectedModelConfig.selectedModel}`} 
                size="small" 
                variant="outlined" 
                sx={{ borderColor: 'divider' }}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Only show test selection if a model is selected */}
      {selectedModelConfig && (
        <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                '& .MuiTabs-indicator': { 
                  backgroundColor: 'black' 
                },
                '& .MuiTab-root': { 
                  color: 'text.secondary',
                  '&.Mui-selected': { 
                    color: 'black'
                  }
                }
              }}
            >
              {categories.map((category, index) => (
                <Tab 
                  key={category} 
                  label={category} 
                  id={`test-tab-${index}`}
                  aria-controls={`test-tabpanel-${index}`}
                />
              ))}
            </Tabs>
          </Box>
          
          {categories.map((category, index) => (
            <Box
              key={category}
              role="tabpanel"
              hidden={currentTab !== index}
              id={`test-tabpanel-${index}`}
              aria-labelledby={`test-tab-${index}`}
            >
              {currentTab === index && renderTestList(category)}
            </Box>
          ))}
        </Paper>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography>
          <strong>{localSelectedTests.length}</strong> tests selected
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setLocalSelectedTests([])}
            disabled={localSelectedTests.length === 0 || loading}
            sx={{ borderColor: 'divider' }}
          >
            Clear Selection
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveConfiguration}
            disabled={localSelectedTests.length === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleOutlineIcon />}
            sx={{ backgroundColor: 'black', '&:hover': { backgroundColor: '#333' } }}
          >
            Save Configuration
          </Button>
        </Box>
      </Box>
      
      {saveSuccess && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ 
            mb: 2,
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'success.light'
          }}>
            Test configuration saved successfully!
          </Alert>
          
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunTests}
              sx={{ backgroundColor: 'black', '&:hover': { backgroundColor: '#333' } }}
            >
              Proceed to Run Tests
            </Button>
          </Box>
        </Box>
      )}
      
      {renderConfigurationDialog()}
      
      <Dialog
        open={confirmDialogOpen}
        onClose={handleNavigationCancel}
        PaperProps={{
          sx: {
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes in your test configuration. Would you like to save these changes before leaving?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNavigationCancel}>Cancel</Button>
          <Button 
            onClick={() => {
              navigate(pendingNavigation);
              setConfirmDialogOpen(false);
            }}
            color="error"
          >
            Discard Changes
          </Button>
          <Button 
            onClick={handleNavigationConfirm} 
            variant="contained" 
            color="primary"
            sx={{ backgroundColor: 'black', '&:hover': { backgroundColor: '#333' } }}
          >
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default TestConfigPage;