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
import { MOCK_TESTS, TEST_CATEGORIES } from '../constants/testCategories';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip';

const TestConfigPage = () => {
  const navigate = useNavigate();
  const { 
    selectedTests, 
    saveTestConfiguration, 
    testParameters, 
    updateTestParameter, 
    modelType,
    modelCategory
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
  
  // Add useRealModel state
  const [useRealModel, setUseRealModel] = useState(false);
  
  // Add selectedModel state
  const [selectedModel, setSelectedModel] = useState('gpt2');
  
  // Add available models list
  const availableModels = [
    { id: 'gpt2', name: 'GPT-2 (Small)' },
    { id: 'gpt2-medium', name: 'GPT-2 (Medium)' },
    { id: 'facebook/bart-large-cnn', name: 'BART (Large CNN)' },
    { id: 'microsoft/DialoGPT-medium', name: 'DialoGPT (Medium)' },
    { id: 'distilbert-base-uncased', name: 'DistilBERT' }
  ];
  
  // Get categories based on available tests
  const categories = Object.keys(TEST_CATEGORIES);
  
  // Initialize local state from context
  useEffect(() => {
    setLocalSelectedTests(selectedTests || []);
  }, [selectedTests]);
  
  // Update select all state based on selections
  useEffect(() => {
    const newSelectAllState = {};
    categories.forEach(category => {
      const testsInCategory = MOCK_TESTS[category].map(test => test.id);
      const selectedInCategory = testsInCategory.filter(id => localSelectedTests.includes(id));
      newSelectAllState[category] = selectedInCategory.length === testsInCategory.length;
    });
    setSelectAllInCategory(newSelectAllState);
  }, [localSelectedTests, categories]);
  
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
    const testsInCategory = MOCK_TESTS[category].map(test => test.id);
    
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
    setLoading(true);
    
    // Simulate saving with a delay
    setTimeout(() => {
      saveTestConfiguration(localSelectedTests);
      setSaveSuccess(true);
      setSnackbarOpen(true);
      setLoading(false);
    }, 1000);
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
    
    // Create model configuration
    const modelConfig = {
      useRealModel,
      selectedModel,
      parameters: {}  // We can add more parameters here if needed
    };
    
    // Navigate to test execution page with selected tests and model config
    navigate('/run-tests', { 
      state: { 
        selectedTests: localSelectedTests,
        modelConfig
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
                {/* Input Validation Test */}
                {currentTestForConfig.id === 'tech_safety_1' && (
                  <Box>
                    <Typography id="success-rate-slider" gutterBottom>
                      Minimum Success Rate: {(currentParams.min_success_rate || 0.8) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="success-rate-slider"
                      value={currentParams.min_success_rate || 0.8}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { min_success_rate: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                  </Box>
                )}
                
                {/* Consistency Test */}
                {currentTestForConfig.id === 'tech_safety_2' && (
                  <>
                    <Typography id="stability-slider" gutterBottom>
                      Stability Threshold: {(currentParams.stability_threshold || 0.8) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="stability-slider"
                      value={currentParams.stability_threshold || 0.8}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { stability_threshold: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                    
                    <Typography id="consistency-slider" gutterBottom sx={{ mt: 3 }}>
                      Consistency Threshold: {(currentParams.consistency_threshold || 0.7) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="consistency-slider"
                      value={currentParams.consistency_threshold || 0.7}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { consistency_threshold: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                  </>
                )}
                
                {/* Error Recovery Test */}
                {currentTestForConfig.id === 'tech_safety_3' && (
                  <Box>
                    <Typography id="recovery-slider" gutterBottom>
                      Minimum Recovery Score: {(currentParams.min_recovery_score || 0.7) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="recovery-slider"
                      value={currentParams.min_recovery_score || 0.7}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { min_recovery_score: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                  </Box>
                )}
                
                {/* Load Test */}
                {currentTestForConfig.id === 'tech_safety_4' && (
                  <Box>
                    <Typography id="performance-slider" gutterBottom>
                      Minimum Performance Score: {(currentParams.min_performance_score || 0.7) * 100}%
                    </Typography>
                    <Slider
                      aria-labelledby="performance-slider"
                      value={currentParams.min_performance_score || 0.7}
                      onChange={(e, value) => updateTestParameter(currentTestForConfig.id, { min_performance_score: value })}
                      step={0.05}
                      marks
                      min={0}
                      max={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${value * 100}%`}
                    />
                  </Box>
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
          <Button onClick={handleSaveTestParameters} variant="contained" color="primary">
            Save Parameters
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  const renderTestList = (category) => {
    const testsInCategory = MOCK_TESTS[category] || [];
    
    // Filter tests for NLP category if the model isn't an NLP or multimodal model
    const filteredTests = category === 'NLP-Specific' && 
                         !['NLP', 'Multimodal'].includes(modelCategory) 
                         ? [] 
                         : testsInCategory;
    
    if (filteredTests.length === 0) {
      return (
        <Paper variant="outlined" sx={{ mt: 2, p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No applicable tests for this model type in this category.
          </Typography>
        </Paper>
      );
    }
    
    return (
      <Paper variant="outlined" sx={{ mt: 2 }}>
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
                            sx={{ ml: 1 }}
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
    if (modelCategory === 'NLP') {
      return ['Technical Safety', 'NLP-Specific', 'Fairness & Bias'];
    } else if (modelCategory === 'Vision') {
      return ['Technical Safety', 'Fairness & Bias', 'Privacy Protection'];
    } else {
      return ['Technical Safety', 'Regulatory Compliance'];
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Test Configuration
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recommended Tests
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Based on your model type ({modelType}) and configuration, we recommend the following test categories:
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {recommendedCategories().map(category => (
            <Chip 
              key={category}
              label={category}
              onClick={() => {
                const index = categories.indexOf(category);
                if (index !== -1) {
                  setCurrentTab(index);
                }
              }}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
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
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography>
          <strong>{localSelectedTests.length}</strong> tests selected
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setLocalSelectedTests([])}
            disabled={localSelectedTests.length === 0 || loading}
          >
            Clear Selection
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveConfiguration}
            disabled={localSelectedTests.length === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleOutlineIcon />}
          >
            Save Configuration
          </Button>
        </Box>
      </Box>
      
      {saveSuccess && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Test configuration saved successfully!
          </Alert>
          
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunTests}
            >
              Proceed to Run Tests
            </Button>
          </Box>
        </Box>
      )}
      
      {renderConfigurationDialog()}
      
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