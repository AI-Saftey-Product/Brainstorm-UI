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
  
  const validateStep = () => {
    const errors = {};
    
    switch (activeStep) {
      case 0: // Model Type validation
        if (!formValues.modelCategory) {
          errors.modelCategory = 'Please select a model category';
        }
        if (!formValues.modelType) {
          errors.modelType = 'Please select a model type';
        }
        break;
        
      case 1: // Model Access validation
        if (formValues.accessType === 'API Endpoint' && !formValues.apiEndpoint) {
          errors.apiEndpoint = 'API endpoint is required';
        } else if (formValues.accessType === 'Local Model' && !formValues.modelPath) {
          errors.modelPath = 'Model path is required';
        }
        break;
        
      case 2: // Use Case & Risk Profile validation
        if (!formValues.industry) {
          errors.industry = 'Please select an industry';
        }
        if (!formValues.deploymentEnv) {
          errors.deploymentEnv = 'Please select a deployment environment';
        }
        if (!formValues.userAccess) {
          errors.userAccess = 'Please select a user access pattern';
        }
        break;
        
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setConfigError('');
    
    try {
      // Simulate model initialization delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock model adapter for demonstration
      const mockModelAdapter = {
        modelType: formValues.modelType,
        getPrediction: (input) => {
          return {
            prediction: [0.7, 0.3],
            confidence: 0.7,
            input_length: input.length
          };
        }
      };
      
      // Gather configuration
      const modelConfig = {
        ...formValues,
        modelAdapter: mockModelAdapter,
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
                onClick={handleSubmit}
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