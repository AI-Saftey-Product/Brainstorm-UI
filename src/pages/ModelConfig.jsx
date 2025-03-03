import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Container,
} from '@mui/material';
import ModelConfigForm from '../components/widgets/ModelConfigForm';
import { useAppContext } from '../context/AppContext';
import huggingFaceService from '../services/huggingFaceService';

const STEPS = ['Model Type', 'Model Access', 'Use Case & Risk Profile', 'Configuration Summary'];

const ModelConfigPage = () => {
  const navigate = useNavigate();
  const { configureModel, modelConfigured } = useAppContext();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formValues, setFormValues] = useState(modelConfigured || {});
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [modelInitStatus, setModelInitStatus] = useState('');
  
  const handleFormChange = (values) => {
    setFormValues(values);
    
    // Clear validation errors for changed fields
    const updatedErrors = { ...validationErrors };
    Object.keys(values).forEach(key => {
      if (updatedErrors[key]) {
        delete updatedErrors[key];
      }
    });
    setValidationErrors(updatedErrors);
  };
  
  const validateForm = () => {
    const errors = {};
    
    // Validate required fields
    if (!formValues.modelName) {
      errors.modelName = 'Model name is required';
    }
    
    if (!formValues.modelCategory) {
      errors.modelCategory = 'Model category is required';
    }
    
    if (!formValues.modelType) {
      errors.modelType = 'Model type is required';
    }
    
    // Validate model ID if using real model
    if (formValues.useRealModel && !formValues.modelId) {
      errors.modelId = 'Model ID is required when using a real model';
    }
    
    // Only validate API endpoint if access type is API
    if (formValues.accessType === 'API Endpoint') {
      if (!formValues.apiEndpoint) {
        errors.apiEndpoint = 'API endpoint is required';
      }
    } else {
      if (!formValues.modelPath) {
        errors.modelPath = 'Model path is required';
      }
    }
    
    // Other validations...
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleNext = () => {
    if (validateForm()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setConfigError('');
    setModelInitStatus('');
    
    try {
      let modelAdapter;
      
      // Check if real model option is selected
      if (formValues.useRealModel) {
        try {
          setModelInitStatus('Initializing Hugging Face model...');
          // Load real model from Hugging Face
          modelAdapter = await huggingFaceService.getHuggingFaceModelAdapter(formValues);
          setModelInitStatus(`Hugging Face model "${formValues.modelId}" initialized successfully!`);
        } catch (error) {
          setConfigError(`Error initializing Hugging Face model: ${error.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
      } else {
        // Use mock model adapter
        setModelInitStatus('Initializing mock model adapter...');
        // Simulate model initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create mock model adapter
        modelAdapter = {
          modelType: formValues.modelType,
          source: 'mock',
          getPrediction: (input) => {
            const mockResponse = `Mock response to: "${input}"`;
            return {
              prediction: mockResponse,
              confidence: 0.7,
              text: mockResponse,
              raw: { generated_text: mockResponse }
            };
          },
          getModelInfo: () => {
            return {
              name: "Mock Model",
              type: formValues.modelType,
              category: formValues.modelCategory,
              parameters: {}
            };
          }
        };
        setModelInitStatus('Mock model adapter initialized successfully!');
      }
      
      // Gather configuration
      const modelConfig = {
        ...formValues,
        modelAdapter,
        type: formValues.modelType // For sidebar display
      };
      
      // Save configuration using context
      configureModel(modelConfig);
      
      setConfigSuccess(true);
      setSnackbarOpen(true);
      setLoading(false);
    } catch (error) {
      setConfigError(`Error initializing model: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  const handleContinue = () => {
    navigate('/test-config');
  };
  
  const handleComplete = () => {
    if (!validateForm()) {
      return;
    }
    
    handleSubmit();
  };
  
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
      case 1:
      case 2:
        return (
          <ModelConfigForm
            initialValues={formValues}
            onChange={handleFormChange}
            errors={validationErrors}
          />
        );
        
      case 3: // Summary
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Paper sx={{ p: 3 }}>
              <Box>
                <Typography variant="subtitle1">Model Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Name:</Typography>
                    <Typography variant="body1">{formValues.modelName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Type:</Typography>
                    <Typography variant="body1">{formValues.modelType}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Category:</Typography>
                    <Typography variant="body1">{formValues.modelCategory}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Access Method:</Typography>
                    <Typography variant="body1">{formValues.accessType}</Typography>
                  </Box>
                  
                  {formValues.accessType === 'API Endpoint' && (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="body2" color="textSecondary">API Endpoint:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {formValues.apiEndpoint}
                      </Typography>
                    </Box>
                  )}
                  
                  {formValues.accessType === 'Local Model' && (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="body2" color="textSecondary">Model Path:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {formValues.modelPath}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="textSecondary">Using Real Model:</Typography>
                    <Typography variant="body1">
                      {formValues.useRealModel ? `Yes - Hugging Face model: ${formValues.modelId}` : 'No (Mock model)'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1">Use Case & Risk Profile</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Industry:</Typography>
                    <Typography variant="body1">{formValues.industry}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Risk Level:</Typography>
                    <Typography variant="body1">{formValues.riskLevel}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="textSecondary">Data Sensitivity:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {formValues.dataSensitivity?.map((value) => (
                        <Typography key={value} variant="body2" component="span" sx={{ 
                          bgcolor: 'rgba(0,0,0,0.08)', 
                          px: 1, 
                          py: 0.5, 
                          borderRadius: 1,
                          fontSize: '0.85rem'
                        }}>
                          {value}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Deployment Environment:</Typography>
                    <Typography variant="body1">{formValues.deploymentEnv}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">User Access Pattern:</Typography>
                    <Typography variant="body1">{formValues.userAccess}</Typography>
                  </Box>
                </Box>
              </Box>
              
              {modelInitStatus && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  {modelInitStatus}
                </Alert>
              )}
              
              {configError && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {configError}
                </Alert>
              )}
              
              {configSuccess && (
                <Alert severity="success" sx={{ mt: 3 }}>
                  Model configuration saved successfully!
                </Alert>
              )}
            </Paper>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Model Configuration
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box>
          {renderStepContent()}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
          >
            Back
          </Button>
          
          <Box>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleComplete}
                disabled={loading || configSuccess}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Processing...' : 'Save Configuration'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
      
      {configSuccess && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary"
            size="large"
            onClick={handleContinue}
          >
            Continue to Test Configuration
          </Button>
        </Box>
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Model configuration saved successfully!"
      />
    </Container>
  );
};

export default ModelConfigPage;