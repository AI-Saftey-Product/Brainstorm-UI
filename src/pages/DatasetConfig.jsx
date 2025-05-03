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
import {useAppContext} from '../context/AppContext';
import {createModelAdapter} from '../services/modelAdapter';
import {saveModelConfig} from '../services/modelStorageService';
import DatasetConfigForm from "@/components/widgets/DatasetConfigForm.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const DatasetConfigPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {configureModel, modelConfigured} = useAppContext();
    const [modelInitStatus, setModelInitStatus] = useState('');
    // Check if we have a config passed in from location state (for editing)
    const {dataset_id} = useParams();

    const [passedConfig, setSavedConfigs] = useState([]);
    useEffect(() => {
        if (dataset_id) {
            fetch(`${API_BASE_URL}/api/datasets/get_datasets?dataset_id=${dataset_id}`, {
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
        dataset_id: 'my_dataset',
        name: 'My Dataset',
        description: '',

        modality: 'NLP',
        data_adapter: '',
        sample_size: null,
    });

    useEffect(() => {
        if (passedConfig.length > 0) {
            console.log(passedConfig);
            setFormValues(
                passedConfig[0]
            );
        }
    }, [passedConfig]);


    const [validationErrors, setValidationErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [configError, setConfigError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [configSuccess, setConfigSuccess] = useState(false);

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
            errors.name = 'Dataset name is required';
        }

        // Validate model ID
        if (!formValues.dataset_id) {
            errors.dataset_id = 'Dataset ID is required';
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
            const modelConfig = formValues;

            modelConfig.sample_size = modelConfig.sample_size === '' ? null : parseInt(modelConfig.sample_size);

            setModelInitStatus(`${formValues.source} model "${formValues.dataset_id}" initialized successfully!`);
            console.log(modelConfig)
            fetch(`${API_BASE_URL}/api/datasets/create_or_update_dataset`, {
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
                {dataset_id ? 'Dataset Configuration' : 'New Dataset Configuration'}
            </Typography>

            <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>
                <DatasetConfigForm
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

export default DatasetConfigPage;