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
  "custom"
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
    const recommendations = {
      'Text Generation': " Try: gpt2, EleutherAI/gpt-neo-125M, facebook/opt-125m",
      'Text Classification': " Try: distilbert-base-uncased-finetuned-sst-2-english, roberta-base-openai-detector",
      'Summarization': " Try: facebook/bart-large-cnn, sshleifer/distilbart-cnn-12-6",
      'Translation': " Try: Helsinki-NLP/opus-mt-en-fr, t5-small",
      'Question Answering': " Try: distilbert-base-cased-distilled-squad, deepset/roberta-base-squad2"
    };
    
    return recommendations[modelType] || " Popular options: gpt2, bert-base-uncased, facebook/bart-large-cnn";
  };

  // Show API key field only for HuggingFace models
  const showApiKey = formValues.source === 'huggingface';

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
              helperText={errors.api_key || "Your HuggingFace API key"}
              type="password"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Model ID"
            value={formValues.model_id}
            onChange={handleChange('model_id')}
            error={!!errors.model_id}
            helperText={errors.model_id || (formValues.sub_type && getRecommendedModelText(formValues.sub_type))}
          />
        </Grid>

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