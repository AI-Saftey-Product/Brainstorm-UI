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
} from '@mui/material';

const MODEL_CATEGORIES = {
  "Multimodal": [
    "Audio-Text-to-Text", "Image-Text-to-Text", "Visual Question Answering",
    "Document Question Answering", "Video-Text-to-Text", "Visual Document Retrieval",
    "Any-to-Any"
  ],
  "Vision": [
    "Computer Vision", "Depth Estimation", "Image Classification", "Object Detection",
    "Image Segmentation", "Text-to-Image", "Image-to-Text", "Image-to-Image"
  ],
  "NLP": [
    "Text Classification", "Token Classification", "Table Question Answering",
    "Question Answering", "Zero-Shot Classification", "Translation",
    "Summarization", "Text Generation"
  ],
  "Audio": [
    "Text-to-Speech", "Text-to-Audio", "Automatic Speech Recognition",
    "Audio-to-Audio", "Audio Classification", "Voice Activity Detection"
  ],
  "Tabular": [
    "Tabular Classification", "Tabular Regression", "Time Series Forecasting"
  ]
};

const ModelConfigForm = ({ 
  initialValues = {}, 
  onChange,
  errors = {} 
}) => {
  const [formValues, setFormValues] = useState({
    modelName: initialValues.modelName || 'My AI Model',
    modelCategory: initialValues.modelCategory || '',
    modelType: initialValues.modelType || '',
    modelId: initialValues.modelId || '',
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
      'Question Answering': " Try: distilbert-base-cased-distilled-squad, deepset/roberta-base-squad2",
      'Image Classification': " Try: google/vit-base-patch16-224, microsoft/resnet-50",
      'Object Detection': " Try: facebook/detr-resnet-50",
      'Audio Classification': " Try: superb/hubert-large-superb-er"
    };
    
    return recommendations[modelType] || " Popular options: gpt2, bert-base-uncased, facebook/bart-large-cnn";
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Model Name"
            value={formValues.modelName}
            onChange={handleChange('modelName')}
            error={!!errors.modelName}
            helperText={errors.modelName}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.modelCategory}>
            <InputLabel>Model Category</InputLabel>
            <Select
              value={formValues.modelCategory}
              label="Model Category"
              onChange={handleChange('modelCategory')}
            >
              {Object.keys(MODEL_CATEGORIES).map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
            {errors.modelCategory && (
              <FormHelperText>{errors.modelCategory}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.modelType}>
            <InputLabel>Model Type</InputLabel>
            <Select
              value={formValues.modelType}
              label="Model Type"
              onChange={handleChange('modelType')}
              disabled={!formValues.modelCategory}
            >
              {formValues.modelCategory && MODEL_CATEGORIES[formValues.modelCategory].map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            {errors.modelType && (
              <FormHelperText>{errors.modelType}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Hugging Face Model ID"
            value={formValues.modelId}
            onChange={handleChange('modelId')}
            error={!!errors.modelId}
            helperText={errors.modelId || (formValues.modelType && getRecommendedModelText(formValues.modelType))}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelConfigForm;