import React, {useEffect, useState} from 'react';
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
        "TEXT_GENERATION"
    ]
};

// We're only supporting NLP models currently
const MODEL_SOURCES = [
    "OPENAI",
    "GCP_MAAS",
];

// OpenAI model options
const OPENAI_MODELS = [
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "text-davinci-003",
    "gpt-4-vision-preview"
];

// Llama model options
const LLAMA_MODELS = [
    // Llama 4 models
    "llama4-maverick",
    "llama4-scout",

    // Llama 3.3 models
    "llama3.3-70b",

    // Llama 3.2 models
    "llama3.2-90b-vision",
    "llama3.2-11b-vision",
    "llama3.2-3b",
    "llama3.2-1b",

    // Llama 3.1 models
    "llama3.1-405b",
    "llama3.1-70b",
    "llama3.1-8b",

    // Llama 3 models
    "llama3-70b",
    "llama3-8b",

    // DeepSeek models
    "deepseek-r1",
    "deepseek-v3",

    // Gemma models
    "gemma2-27b",
    "gemma2-9b",
    "gemma-7b",
    "gemma-2b",

    // Mixtral models
    "mixtral-8x22b-instruct",
    "mixtral-8x7b-instruct",

    // Mistral models
    "mistral-7b-instruct",

    // Qwen models
    "Qwen2-72B",
    "Qwen1.5-72B-Chat",
    "Qwen1.5-110B-Chat",
    "Qwen1.5-32B-Chat",
    "Qwen1.5-14B-Chat",
    "Qwen1.5-7B-Chat",
    "Qwen1.5-4B-Chat",
    "Qwen1.5-1.8B-Chat",
    "Qwen1.5-0.5B-Chat",

    // Nous models
    "Nous-Hermes-2-Mixtral-8x7B-DPO",
    "Nous-Hermes-2-Yi-34B"
];

const ModelConfigForm = ({
                             initialValues = {},
                             onChange,
                             errors = {}
                         }) => {
    const [formValues, setFormValues] = useState(
        initialValues
    );

    useEffect(() => {
        setFormValues(initialValues);
    }, [initialValues]);

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

    // Show API key field for HuggingFace, OpenAI, and Llama models
    const showApiKey = formValues.source === 'huggingface' || formValues.source === 'openai' || formValues.source === 'llama';

    // Show OpenAI specific fields only for OpenAI models
    const showOpenAIFields = formValues.source === 'openai';

    // Show Llama specific fields only for Llama models
    const showLlamaFields = formValues.source === 'llama';

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Model ID"
                        value={formValues.model_id}
                        onChange={handleChange('model_id')}
                        error={!!errors.model_id}
                        helperText={errors.model_id}
                    />
                </Grid>

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

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Description"
                        value={formValues.description}
                        onChange={handleChange('description')}
                        error={!!errors.description}
                        helperText={errors.description}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
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

                <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!errors.source}>
                        <InputLabel>Provider</InputLabel>
                        <Select
                            value={formValues.provider}
                            label="Provider"
                            onChange={handleChange('provider')}
                        >
                            {MODEL_SOURCES.map((source) => (
                                <MenuItem key={source} value={source}>
                                    {source}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.source && (
                            <FormHelperText>{errors.source}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!errors.source}>
                        <InputLabel>Provider Model</InputLabel>
                        <Select
                            value={formValues.provider_model}
                            label="Provider Model"
                            onChange={handleChange('provider_model')}
                        >
                            <MenuItem value="gpt-4o">gpt-4o</MenuItem>
                            <MenuItem value="gpt-4o-mini">gpt-4o-mini</MenuItem>
                            <MenuItem
                                value="meta/llama-4-scout-17b-16e-instruct-maas">meta/llama-4-scout-17b-16e-instruct-maas</MenuItem>
                            <MenuItem
                                value="hirundo-io/debiased-Llama-4-Scout-17B-16E-Instruct">hirundo-io/debiased-Llama-4-Scout-17B-16E-Instruct</MenuItem>
                        </Select>
                        {errors.source && (
                            <FormHelperText>{errors.source}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>


                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="API Key"
                        value={formValues.api_key}
                        onChange={handleChange('api_key')}
                        error={!!errors.api_key}
                        helperText={errors.api_key || `Your ${formValues.source === 'openai' ? 'OpenAI' : formValues.source === 'llama' ? 'Llama' : 'HuggingFace'} API key`}
                        type="password"
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Endpoint URL"
                        value={formValues.endpoint_url}
                        onChange={handleChange('endpoint_url')}
                        error={!!errors.endpoint_url}
                        helperText={errors.endpoint_url}
                    />
                </Grid>


                {/* OpenAI specific parameters */}
                {/*{showOpenAIFields && (*/}
                {/*  <>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Temperature"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: 0, max: 2, step: 0.1 }}*/}
                {/*        value={formValues.temperature}*/}
                {/*        onChange={handleChange('temperature')}*/}
                {/*        helperText="Controls randomness (0.1-2.0)"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Max Tokens"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: 1, max: 4096, step: 1 }}*/}
                {/*        value={formValues.max_tokens}*/}
                {/*        onChange={handleChange('max_tokens')}*/}
                {/*        helperText="Maximum tokens to generate"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Frequency Penalty"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: -2, max: 2, step: 0.1 }}*/}
                {/*        value={formValues.frequency_penalty}*/}
                {/*        onChange={handleChange('frequency_penalty')}*/}
                {/*        helperText="Prevents repetition (-2.0 to 2.0)"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Presence Penalty"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: -2, max: 2, step: 0.1 }}*/}
                {/*        value={formValues.presence_penalty}*/}
                {/*        onChange={handleChange('presence_penalty')}*/}
                {/*        helperText="Controls topic diversity (-2.0 to 2.0)"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*    <Grid item xs={12}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Organization ID (Optional)"*/}
                {/*        value={formValues.organization_id || ''}*/}
                {/*        onChange={handleChange('organization_id')}*/}
                {/*        helperText="Your OpenAI organization ID (if applicable)"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*  </>*/}
                {/*)}*/}

                {/* Llama specific parameters */}
                {/*{showLlamaFields && (*/}
                {/*  <>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Temperature"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: 0, max: 1, step: 0.1 }}*/}
                {/*        value={formValues.temperature}*/}
                {/*        onChange={handleChange('temperature')}*/}
                {/*        helperText="Controls randomness (0.0-1.0)"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*    <Grid item xs={12} md={6}>*/}
                {/*      <TextField*/}
                {/*        fullWidth*/}
                {/*        label="Max Tokens"*/}
                {/*        type="number"*/}
                {/*        inputProps={{ min: 1, max: 4096, step: 1 }}*/}
                {/*        value={formValues.max_tokens}*/}
                {/*        onChange={handleChange('max_tokens')}*/}
                {/*        helperText="Maximum tokens to generate"*/}
                {/*      />*/}
                {/*    </Grid>*/}
                {/*  </>*/}
                {/*)}*/}

                {/*  <Grid item xs={12}>*/}
                {/*    <FormControlLabel*/}
                {/*      control={*/}
                {/*        <Switch*/}
                {/*          checked={formValues.verbose}*/}
                {/*          onChange={(e) => handleChange('verbose')({ target: { value: e.target.checked } })}*/}
                {/*          color="primary"*/}
                {/*        />*/}
                {/*      }*/}
                {/*      label="Enable Verbose Logging"*/}
                {/*    />*/}
                {/*    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>*/}
                {/*      Show detailed logs during model initialization and testing*/}
                {/*    </Typography>*/}
                {/*  </Grid>*/}
            </Grid>
        </Box>
    );
};

export default ModelConfigForm;