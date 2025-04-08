import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormHelperText,
  FormControlLabel,
  Switch,
} from '@mui/material';

const MODEL_CATEGORIES = {
  "NLP": [
    "Text Classification", "Token Classification", "Table Question Answering",
    "Question Answering", "Zero-Shot Classification", "Translation",
    "Summarization", "Text Generation"
  ]
};

// We're only supporting NLP models currently
const MODEL_SOURCES = [
  "huggingface",
  "openai",
  "custom"
];

// OpenAI model options
const OPENAI_MODELS = [
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "text-davinci-003",
  "gpt-4-vision-preview"
];

const ModelConfigForm = ({ 
  initialValues = {}, 
  onChange,
  errors = {} 
}) => {
  const [formValues, setFormValues] = useState({
    name: initialValues.name || 'My AI Model',
    modality: 'NLP', // Always set to NLP
    sub_type: initialValues.sub_type || initialValues.modelType || '',
    source: initialValues.source || 'huggingface',
    api_key: initialValues.api_key || '',
    model_id: initialValues.model_id || initialValues.modelId || '',
    verbose: initialValues.verbose || false,
    // OpenAI specific parameters
    temperature: initialValues.temperature || 0.7,
    max_tokens: initialValues.max_tokens || 1024,
    frequency_penalty: initialValues.frequency_penalty || 0,
    presence_penalty: initialValues.presence_penalty || 0,
    organization_id: initialValues.organization_id || '',
    ...initialValues
  });

  const handleChange = (field) => (event) => {
    let value = event.target.value;
    
    // Update form values
    setFormValues(prev => {
      const newValues = {
        ...prev,
        [field]: value
      };
      
      // Call onChange callback if provided
      if (onChange) {
        onChange(newValues);
      }
      
      return newValues;
    });
  };

  const getRecommendedModelText = (modelType) => {
    // If OpenAI is selected, show different recommendations
    if (formValues.source === 'openai') {
      return " Common OpenAI models: gpt-4, gpt-3.5-turbo";
    }
    
    const recommendations = {
      'Text Generation': " Try: gpt2, EleutherAI/gpt-neo-125M, facebook/opt-125m",
      'Text Classification': " Try: distilbert-base-uncased-finetuned-sst-2-english, roberta-base-openai-detector",
      'Summarization': " Try: facebook/bart-large-cnn, sshleifer/distilbart-cnn-12-6",
      'Translation': " Try: Helsinki-NLP/opus-mt-en-fr, t5-small",
      'Question Answering': " Try: distilbert-base-cased-distilled-squad, deepset/roberta-base-squad2"
    };
    
    return recommendations[modelType] || " Popular options: gpt2, bert-base-uncased, facebook/bart-large-cnn";
  };

  // Show API key field for HuggingFace and OpenAI models
  const showApiKey = formValues.source === 'huggingface' || formValues.source === 'openai';
  
  // Show OpenAI specific fields only for OpenAI models
  const showOpenAIFields = formValues.source === 'openai';

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Model Name"
            value={formValues.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled>
            <InputLabel>Modality</InputLabel>
            <Select
              value={formValues.modality}
              label="Modality"
            >
              <MenuItem value="NLP">NLP</MenuItem>
            </Select>
            <FormHelperText>Currently only supporting NLP models</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.source}>
            <InputLabel>Source</InputLabel>
            <Select
              value={formValues.source}
              label="Source"
              onChange={handleChange('source')}
            >
              {MODEL_SOURCES.map((source) => (
                <MenuItem key={source} value={source}>
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </MenuItem>
              ))}
            </Select>
            {errors.source && (
              <FormHelperText>{errors.source}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.sub_type}>
            <InputLabel>Model Type</InputLabel>
            <Select
              value={formValues.sub_type}
              label="Model Type"
              onChange={handleChange('sub_type')}
            >
              {MODEL_CATEGORIES["NLP"].map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            {errors.sub_type && (
              <FormHelperText>{errors.sub_type}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {showApiKey && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="API Key"
              value={formValues.api_key}
              onChange={handleChange('api_key')}
              error={!!errors.api_key}
              helperText={errors.api_key || `Your ${formValues.source === 'openai' ? 'OpenAI' : 'HuggingFace'} API key`}
              type="password"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          {showOpenAIFields ? (
            <FormControl fullWidth error={!!errors.model_id}>
              <InputLabel>Model ID</InputLabel>
              <Select
                value={formValues.model_id}
                label="Model ID"
                onChange={handleChange('model_id')}
              >
                {OPENAI_MODELS.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
              {errors.model_id && (
                <FormHelperText>{errors.model_id}</FormHelperText>
              )}
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Model ID"
              value={formValues.model_id}
              onChange={handleChange('model_id')}
              error={!!errors.model_id}
              helperText={errors.model_id || (formValues.sub_type && getRecommendedModelText(formValues.sub_type))}
            />
          )}
        </Grid>

        {/* OpenAI specific parameters */}
        {showOpenAIFields && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Temperature"
                type="number"
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                value={formValues.temperature}
                onChange={handleChange('temperature')}
                helperText="Controls randomness (0.1-2.0)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Tokens"
                type="number"
                inputProps={{ min: 1, max: 4096, step: 1 }}
                value={formValues.max_tokens}
                onChange={handleChange('max_tokens')}
                helperText="Maximum tokens to generate"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frequency Penalty"
                type="number"
                inputProps={{ min: -2, max: 2, step: 0.1 }}
                value={formValues.frequency_penalty}
                onChange={handleChange('frequency_penalty')}
                helperText="Prevents repetition (-2.0 to 2.0)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Presence Penalty"
                type="number"
                inputProps={{ min: -2, max: 2, step: 0.1 }}
                value={formValues.presence_penalty}
                onChange={handleChange('presence_penalty')}
                helperText="Controls topic diversity (-2.0 to 2.0)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Organization ID (Optional)"
                value={formValues.organization_id || ''}
                onChange={handleChange('organization_id')}
                helperText="Your OpenAI organization ID (if applicable)"
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formValues.verbose}
                onChange={(e) => handleChange('verbose')({ target: { value: e.target.checked } })}
                color="primary"
              />
            }
            label="Enable Verbose Logging"
          />
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            Show detailed logs during model initialization and testing
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelConfigForm;