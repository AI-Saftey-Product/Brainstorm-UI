import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
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
import { createModelAdapter } from '../services/modelAdapter';

const ModelConfigPage = () => {
  const navigate = useNavigate();
  const { configureModel, modelConfigured } = useAppContext();
  
  const [formValues, setFormValues] = useState(modelConfigured || {
    modelName: '',
    modelCategory: '',
    modelType: '',
    modelId: '',
    selectedModel: '' // This will store the Hugging Face model ID
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [modelInitStatus, setModelInitStatus] = useState('');
  
  const handleFormChange = (values) => {
    setFormValues({
      ...values,
      selectedModel: values.modelId // Ensure selectedModel is always synced with modelId
    });
    
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
    
    // Validate model ID
    if (!formValues.modelId) {
      errors.modelId = 'Model ID is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setConfigError('');
    setModelInitStatus('');
    
    try {
      setModelInitStatus('Initializing Hugging Face model...');
      
      // Create the model adapter with proper configuration
      const modelAdapter = await createModelAdapter({
        selectedModel: formValues.modelId, // Use modelId as the selectedModel
        modelType: formValues.modelType,
        modelCategory: formValues.modelCategory
      });

      setModelInitStatus(`Hugging Face model "${formValues.modelId}" initialized successfully!`);
      
      // Gather configuration with the properly initialized adapter
      const modelConfig = {
        ...formValues,
        modelAdapter, // This should now have getPrediction properly defined
        type: formValues.modelType
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
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Model Configuration
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <ModelConfigForm
          initialValues={formValues}
          onChange={handleFormChange}
          errors={validationErrors}
        />
        
        {configSuccess ? (
          <Box sx={{ mt: 4 }}>
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
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="textSecondary">Hugging Face Model:</Typography>
                    <Typography variant="body1">
                      {formValues.modelId}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {modelInitStatus && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  {modelInitStatus}
                </Alert>
              )}
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleContinue}
                >
                  Continue to Tests
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Configuration'}
            </Button>
          </Box>
        )}

        {configError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {configError}
          </Alert>
        )}
      </Paper>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Model configuration saved successfully"
      />
    </Container>
  );
};

export default ModelConfigPage;