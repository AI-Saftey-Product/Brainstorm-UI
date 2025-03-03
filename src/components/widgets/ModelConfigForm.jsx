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
  FormControlLabel,
  Checkbox,
  FormHelperText,
  RadioGroup,
  Radio,
  Chip,
  OutlinedInput,
  ListItemText,
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
    accessType: initialValues.accessType || 'API Endpoint',
    apiEndpoint: initialValues.apiEndpoint || 'https://api.example.com/v1/predict',
    apiKey: initialValues.apiKey || '',
    modelPath: initialValues.modelPath || '/path/to/model',
    industry: initialValues.industry || '',
    riskLevel: initialValues.riskLevel || 'Medium',
    dataSensitivity: initialValues.dataSensitivity || ['No Sensitive Data'],
    deploymentEnv: initialValues.deploymentEnv || '',
    userAccess: initialValues.userAccess || '',
    useRealModel: initialValues.useRealModel || false,
    categoryConfig: initialValues.categoryConfig || {},
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

  const handleCheckboxChange = (field) => (event) => {
    const value = event.target.checked;
    
    setFormValues(prev => {
      const newValues = {
        ...prev,
        [field]: value
      };
      
      if (onChange) {
        onChange(newValues);
      }
      
      return newValues;
    });
  };

  const handleCategoryConfigChange = (field) => (event) => {
    const value = event.target.value;
    
    setFormValues(prev => {
      const newValues = {
        ...prev,
        categoryConfig: {
          ...prev.categoryConfig,
          [field]: value
        }
      };
      
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

  const renderCategoryConfig = () => {
    switch (formValues.modelCategory) {
      case 'Vision':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Vision Model Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Input Image Size"
                  type="number"
                  value={formValues.categoryConfig.imageSize || 224}
                  onChange={handleCategoryConfigChange('imageSize')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Color Mode</InputLabel>
                  <Select
                    value={formValues.categoryConfig.colorMode || 'RGB'}
                    label="Color Mode"
                    onChange={handleCategoryConfigChange('colorMode')}
                  >
                    <MenuItem value="RGB">RGB</MenuItem>
                    <MenuItem value="Grayscale">Grayscale</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );
      case 'NLP':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>NLP Model Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Sequence Length"
                  type="number"
                  value={formValues.categoryConfig.maxLength || 512}
                  onChange={handleCategoryConfigChange('maxLength')}
                  error={!!errors.maxLength}
                  helperText={errors.maxLength}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tokenizer Type</InputLabel>
                  <Select
                    value={formValues.categoryConfig.tokenizerType || 'WordPiece'}
                    label="Tokenizer Type"
                    onChange={handleCategoryConfigChange('tokenizerType')}
                  >
                    <MenuItem value="WordPiece">WordPiece</MenuItem>
                    <MenuItem value="BPE">BPE</MenuItem>
                    <MenuItem value="SentencePiece">SentencePiece</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );
      case 'Audio':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Audio Model Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sample Rate (Hz)"
                  type="number"
                  value={formValues.categoryConfig.sampleRate || 16000}
                  onChange={handleCategoryConfigChange('sampleRate')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Audio Channels</InputLabel>
                  <Select
                    value={formValues.categoryConfig.audioChannels || 'Mono'}
                    label="Audio Channels"
                    onChange={handleCategoryConfigChange('audioChannels')}
                  >
                    <MenuItem value="Mono">Mono</MenuItem>
                    <MenuItem value="Stereo">Stereo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );
      case 'Tabular':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Tabular Model Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Number of Input Features"
                  type="number"
                  value={formValues.categoryConfig.inputFeatures || 10}
                  onChange={handleCategoryConfigChange('inputFeatures')}
                />
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required margin="normal" error={!!errors.modelCategory}>
            <InputLabel>Model Category</InputLabel>
            <Select
              value={formValues.modelCategory}
              label="Model Category"
              onChange={handleChange('modelCategory')}
            >
              {Object.keys(MODEL_CATEGORIES).map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
            {errors.modelCategory && (
              <FormHelperText>{errors.modelCategory}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl 
            fullWidth 
            required 
            margin="normal" 
            disabled={!formValues.modelCategory}
            error={!!errors.modelType}
          >
            <InputLabel>Model Type</InputLabel>
            <Select
              value={formValues.modelType}
              label="Model Type"
              onChange={handleChange('modelType')}
            >
              {formValues.modelCategory && MODEL_CATEGORIES[formValues.modelCategory].map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
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
            label="Model Name"
            value={formValues.modelName}
            onChange={handleChange('modelName')}
            margin="normal"
            error={!!errors.modelName}
            helperText={errors.modelName}
          />
        </Grid>
        
        {formValues.modelCategory && renderCategoryConfig()}
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={formValues.useRealModel} 
                onChange={handleCheckboxChange('useRealModel')}
              />
            }
            label="Load real pretrained model (may take longer)"
          />
          {formValues.useRealModel && (
            <>
              <FormHelperText>
                When enabled, will load actual pretrained models from Hugging Face for testing.
              </FormHelperText>
              <TextField
                fullWidth
                margin="normal"
                label="Hugging Face Model ID"
                placeholder="e.g., gpt2, facebook/bart-large-cnn"
                value={formValues.modelId || ''}
                onChange={handleChange('modelId')}
                required
                error={!!errors.modelId}
                helperText={
                  errors.modelId || 
                  <>
                    Enter the exact model ID as it appears on Hugging Face. 
                    {formValues.modelType && getRecommendedModelText(formValues.modelType)}
                  </>
                }
              />
            </>
          )}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Model Access
        </Typography>
        
        <FormControl component="fieldset" margin="normal">
          <RadioGroup
            value={formValues.accessType}
            onChange={handleChange('accessType')}
          >
            <FormControlLabel 
              value="API Endpoint" 
              control={<Radio />} 
              label="API Endpoint" 
            />
            <FormControlLabel 
              value="Local Model" 
              control={<Radio />} 
              label="Local Model" 
            />
          </RadioGroup>
        </FormControl>
        
        <Box sx={{ mt: 2 }}>
          {formValues.accessType === 'API Endpoint' ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Endpoint URL"
                  value={formValues.apiEndpoint}
                  onChange={handleChange('apiEndpoint')}
                  required
                  error={!!errors.apiEndpoint}
                  helperText={errors.apiEndpoint}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key (if required)"
                  type="password"
                  value={formValues.apiKey}
                  onChange={handleChange('apiKey')}
                />
              </Grid>
            </Grid>
          ) : (
            <TextField
              fullWidth
              label="Local Model Path"
              value={formValues.modelPath}
              onChange={handleChange('modelPath')}
              required
              error={!!errors.modelPath}
              helperText={errors.modelPath}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Use Case & Risk Profile
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required margin="normal" error={!!errors.industry}>
              <InputLabel>Industry</InputLabel>
              <Select
                value={formValues.industry}
                label="Industry"
                onChange={handleChange('industry')}
              >
                {["Healthcare", "Finance", "Retail", "Manufacturing", "Education", "Government", "Other"].map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
              {errors.industry && (
                <FormHelperText>{errors.industry}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required margin="normal">
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={formValues.riskLevel}
                label="Risk Level"
                onChange={handleChange('riskLevel')}
              >
                {["Low", "Medium", "High", "Critical"].map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
              <FormHelperText>Higher risk models require more rigorous compliance testing</FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Data Sensitivity</InputLabel>
              <Select
                multiple
                value={formValues.dataSensitivity}
                onChange={handleChange('dataSensitivity')}
                input={<OutlinedInput label="Data Sensitivity" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {[
                  "Personal Identifiable Information (PII)", 
                  "Protected Health Information (PHI)",
                  "Financial Data",
                  "Biometric Data",
                  "Location Data",
                  "Children's Data",
                  "No Sensitive Data"
                ].map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox checked={formValues.dataSensitivity.indexOf(option) > -1} />
                    <ListItemText primary={option} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required margin="normal" error={!!errors.deploymentEnv}>
              <InputLabel>Deployment Environment</InputLabel>
              <Select
                value={formValues.deploymentEnv}
                label="Deployment Environment"
                onChange={handleChange('deploymentEnv')}
              >
                {["Cloud (Public)", "Cloud (Private)", "On-Premises", "Edge/IoT", "Mobile"].map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
              {errors.deploymentEnv && (
                <FormHelperText>{errors.deploymentEnv}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required margin="normal" error={!!errors.userAccess}>
              <InputLabel>User Access Pattern</InputLabel>
              <Select
                value={formValues.userAccess}
                label="User Access Pattern"
                onChange={handleChange('userAccess')}
              >
                {[
                  "Public-Facing", 
                  "Authenticated Users Only", 
                  "Internal (Employee-Facing)", 
                  "Limited Access (Specific Roles)"
                ].map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
              {errors.userAccess && (
                <FormHelperText>{errors.userAccess}</FormHelperText>
              )}
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ModelConfigForm;