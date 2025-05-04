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
        sub_type: 'TEXT_GENERATION',
        provider: '',
        provider_model: '',
    });

    useEffect(() => {
        if (passedConfig.length > 0) {
            console.log(passedConfig);
            const config = {
                ...passedConfig[0],
                modality: 'NLP',
                sub_type: 'TEXT_GENERATION'
            };
            setFormValues(config);
        }
    }, [passedConfig]);

    const [validationErrors, setValidationErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [configSuccess, setConfigSuccess] = useState(false);
    const [configError, setConfigError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [modelInitStatus, setModelInitStatus] = useState('');

    const handleFormChange = (values) => {
        setFormValues({
            ...values,
            modality: 'NLP',
            sub_type: 'TEXT_GENERATION'
        });

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

        // Validate model ID
        if (!formValues.model_id) {
            errors.model_id = 'Model ID is required';
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
            setModelInitStatus(`Initializing ${formValues.provider} model...`);

            // Create the model adapter with proper configuration
            const modelConfig = {
                ...formValues,
                modality: 'NLP',
                sub_type: 'TEXT_GENERATION',
                // Add these required fields with default values
                endpoint_url: '',
                api_key: ''
            };

            setModelInitStatus(`${formValues.provider} model "${formValues.model_id}" initialized successfully!`);

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