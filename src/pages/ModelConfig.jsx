import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { createModelAdapter } from '../services/modelAdapter';
import { saveModelConfig } from '../services/modelStorageService';

const ModelConfigPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { configureModel, modelConfigured } = useAppContext();
  
  // Check if we have a config passed in from location state (for editing)
  const passedConfig = location.state?.config;
  
  const [formValues, setFormValues] = useState({
    name: '',
    modality: 'NLP',
    sub_type: '',
    source: 'huggingface',
    api_key: '',
    model_id: '',
    verbose: false
  });
  
  // Load config from passedConfig or modelConfigured on mount
  useEffect(() => {
    if (passedConfig) {
      // Normalize the passed config to ensure it has the new field names
      const normalizedConfig = {
        name: passedConfig.name || passedConfig.modelName || '',
        modality: passedConfig.modality || passedConfig.modelCategory || 'NLP',
        sub_type: passedConfig.sub_type || passedConfig.modelType || '',
        source: passedConfig.source || 'huggingface',
        model_id: passedConfig.model_id || passedConfig.modelId || passedConfig.selectedModel || '',
        api_key: passedConfig.api_key || passedConfig.apiKey || '',
        verbose: passedConfig.verbose || false
      };
      setFormValues(normalizedConfig);
    } else if (modelConfigured) {
      // Normalize the existing model config
      const normalizedConfig = {
        name: modelConfigured.name || modelConfigured.modelName || '',
        modality: modelConfigured.modality || modelConfigured.modelCategory || 'NLP',
        sub_type: modelConfigured.sub_type || modelConfigured.modelType || '',
        source: modelConfigured.source || 'huggingface',
        model_id: modelConfigured.model_id || modelConfigured.modelId || modelConfigured.selectedModel || '',
        api_key: modelConfigured.api_key || modelConfigured.apiKey || '',
        verbose: modelConfigured.verbose || false
      };
      setFormValues(normalizedConfig);
    }
  }, [passedConfig, modelConfigured]);
  
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
    if (!formValues.name) {
      errors.name = 'Model name is required';
    }
    
    if (!formValues.sub_type) {
      errors.sub_type = 'Model type is required';
    }
    
    // Validate model ID
    if (!formValues.model_id) {
      errors.model_id = 'Model ID is required';
    }
    
    // Validate API key for HuggingFace models
    if (formValues.source === 'huggingface' && !formValues.api_key) {
      errors.api_key = 'API key is required for HuggingFace models';
    }
    
    // Validate API key for OpenAI models
    if (formValues.source === 'openai' && !formValues.api_key) {
      errors.api_key = 'API key is required for OpenAI models';
    }
    
    // Validate OpenAI specific parameters
    if (formValues.source === 'openai') {
      if (formValues.temperature < 0 || formValues.temperature > 2) {
        errors.temperature = 'Temperature must be between 0 and 2';
      }
      
      if (formValues.max_tokens < 1 || formValues.max_tokens > 4096) {
        errors.max_tokens = 'Max tokens must be between 1 and 4096';
      }
      
      if (formValues.frequency_penalty < -2 || formValues.frequency_penalty > 2) {
        errors.frequency_penalty = 'Frequency penalty must be between -2 and 2';
      }
      
      if (formValues.presence_penalty < -2 || formValues.presence_penalty > 2) {
        errors.presence_penalty = 'Presence penalty must be between -2 and 2';
      }
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
      setModelInitStatus(`Initializing ${formValues.source} model...`);
      
      // Create the model adapter with proper configuration
      const modelConfig = {
        name: formValues.name,
        modality: formValues.modality,
        sub_type: formValues.sub_type,
        source: formValues.source,
        api_key: formValues.api_key,
        model_id: formValues.model_id,
        verbose: formValues.verbose
      };
      
      // Add OpenAI specific parameters if source is OpenAI
      if (formValues.source === 'openai') {
        modelConfig.temperature = Number(formValues.temperature);
        modelConfig.max_tokens = Number(formValues.max_tokens);
        modelConfig.frequency_penalty = Number(formValues.frequency_penalty);
        modelConfig.presence_penalty = Number(formValues.presence_penalty);
        modelConfig.organization_id = formValues.organization_id;
      }
      
      const modelAdapter = await createModelAdapter(modelConfig);

      setModelInitStatus(`${formValues.source} model "${formValues.model_id}" initialized successfully!`);
      
      // Gather configuration with the properly initialized adapter
      const fullModelConfig = {
        ...modelConfig,
        modelAdapter
      };
      
      // Save configuration using context and storage service
      configureModel(fullModelConfig);
      await saveModelConfig(fullModelConfig);
      
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
      <Typography 
        variant="h3" 
        component="h1" 
        sx={{ mb: 4 }}
      >
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
                    <Typography variant="body1">{formValues.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Type:</Typography>
                    <Typography variant="body1">{formValues.sub_type}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Modality:</Typography>
                    <Typography variant="body1">{formValues.modality}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Source:</Typography>
                    <Typography variant="body1">{formValues.source}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="textSecondary">Model ID:</Typography>
                    <Typography variant="body1">
                      {formValues.model_id}
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