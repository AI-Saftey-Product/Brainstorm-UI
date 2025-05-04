import React, {useState, useEffect} from 'react';
import {useNavigate, useLocation, useParams} from 'react-router-dom';
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
import {useAppContext} from '../context/AppContext';
import {createModelAdapter} from '../services/modelAdapter';
import {saveModelConfig} from '../services/modelStorageService';
import {fetchWithAuth} from "@/pages/Login.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const ModelConfigPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {configureModel, modelConfigured} = useAppContext();

    // Check if we have a config passed in from location state (for editing)
    const {model_id} = useParams();

    const [passedConfig, setSavedConfigs] = useState([]);
    useEffect(() => {
        if (model_id) {
            fetchWithAuth(`${API_BASE_URL}/api/models/get_models?model_id=${model_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type':  'application/json',
                },
            })
                .then(res => {
                    if (!res.ok) throw new Error("Network error");
                    return res.json();
                })
                .then(data => {
                    setSavedConfigs(data);
                })
        }
    }, []); // empty dependency array = run once on mount


    const [formValues, setFormValues] = useState({
        model_id: 'my_model',
        name: 'My Model',
        description: '',

        modality: 'NLP',
        sub_type: '',
        provider: '',
        provider_model: '',

        endpoint_url: '',
        api_key: '',
    });

    useEffect(() => {
        if (passedConfig.length > 0) {
            console.log(passedConfig);
            setFormValues(
                passedConfig[0]
            );
        }
    }, [passedConfig]);

    // Load config from passedConfig or modelConfigured on mount
    // useEffect(() => {
    //   if (passedConfig) {
    //     // Normalize the passed config to ensure it has the new field names
    //     const normalizedConfig = {
    //       name: passedConfig.name || passedConfig.modelName || '',
    //       modality: passedConfig.modality || passedConfig.modelCategory || 'NLP',
    //       sub_type: passedConfig.sub_type || passedConfig.modelType || '',
    //       source: passedConfig.source || 'huggingface',
    //       model_id: passedConfig.model_id || passedConfig.modelId || passedConfig.selectedModel || '',
    //       api_key: passedConfig.api_key || passedConfig.apiKey || '',
    //       verbose: passedConfig.verbose || false
    //     };
    //     setFormValues(normalizedConfig);
    //   } else if (modelConfigured) {
    //     // Normalize the existing model config
    //     const normalizedConfig = {
    //       name: modelConfigured.name || modelConfigured.modelName || '',
    //       modality: modelConfigured.modality || modelConfigured.modelCategory || 'NLP',
    //       sub_type: modelConfigured.sub_type || modelConfigured.modelType || '',
    //       source: modelConfigured.source || 'huggingface',
    //       model_id: modelConfigured.model_id || modelConfigured.modelId || modelConfigured.selectedModel || '',
    //       api_key: modelConfigured.api_key || modelConfigured.apiKey || '',
    //       verbose: modelConfigured.verbose || false
    //     };
    //     setFormValues(normalizedConfig);
    //   }
    // }, [passedConfig, modelConfigured]);

    const [validationErrors, setValidationErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [configSuccess, setConfigSuccess] = useState(false);
    const [configError, setConfigError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [modelInitStatus, setModelInitStatus] = useState('');

    const handleFormChange = (values) => {
        setFormValues(values);

        // Clear validation errors for changed fields
        const updatedErrors = {...validationErrors};
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

        // // Validate OpenAI specific parameters
        // if (formValues.source === 'openai') {
        //     if (formValues.temperature < 0 || formValues.temperature > 2) {
        //         errors.temperature = 'Temperature must be between 0 and 2';
        //     }
        //
        //     if (formValues.max_tokens < 1 || formValues.max_tokens > 4096) {
        //         errors.max_tokens = 'Max tokens must be between 1 and 4096';
        //     }
        //
        //     if (formValues.frequency_penalty < -2 || formValues.frequency_penalty > 2) {
        //         errors.frequency_penalty = 'Frequency penalty must be between -2 and 2';
        //     }
        //
        //     if (formValues.presence_penalty < -2 || formValues.presence_penalty > 2) {
        //         errors.presence_penalty = 'Presence penalty must be between -2 and 2';
        //     }
        // }

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
            const modelConfig = formValues;

            setModelInitStatus(`${formValues.source} model "${formValues.model_id}" initialized successfully!`);

            fetchWithAuth(`${API_BASE_URL}/api/models/create_or_update_model`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelConfig),
            })
                .then(res => {
                    if (!res.ok) throw new Error("Network error");
                })

            setConfigSuccess(true);
            setSnackbarOpen(true);
            setLoading(false);

            navigate("/")
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
                sx={{mb: 4}}
            >
                {model_id ? 'Model Configuration' : 'New Model Configuration'}
            </Typography>

            <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>
                <ModelConfigForm
                    initialValues={formValues}
                    onChange={handleFormChange}
                    errors={validationErrors}
                />

                <Box sx={{mt: 4, display: 'flex', justifyContent: 'flex-end'}}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24}/> : 'Save Configuration'}
                    </Button>
                </Box>

                {configError && (
                    <Alert severity="error" sx={{mt: 3}}>
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