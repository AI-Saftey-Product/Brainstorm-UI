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
import EvalConfigForm from "@/components/widgets/EvalConfigForm.jsx";
import {fetchWithAuth} from "@/pages/Login.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const EvalConfigPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {configureModel, modelConfigured} = useAppContext();
    const [modelInitStatus, setModelInitStatus] = useState('');
    // Check if we have a config passed in from location state (for editing)
    const {eval_id} = useParams();

    const [passedConfig, setSavedConfigs] = useState([]);
    useEffect(() => {
        if (eval_id) {
            fetchWithAuth(`${API_BASE_URL}/api/evals/get_evals?eval_id=${eval_id}`, {
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
        eval_id: 'my_eval',
        dataset_id: 'my_dataset',
        model_id: 'my_model',

        name: 'My Eval',
        description: '',

        scorer: 'ExactStringMatchScorer',
        scorer_agg_functions: 'average',
        scorer_agg_dimensions: "",
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
        if (!formValues.eval_id) {
            errors.eval_id = 'Dataset ID is required';
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

            modelConfig.scorer_agg_functions = modelConfig.scorer_agg_functions.split(',').map(item => item.trim());
            modelConfig.scorer_agg_dimensions = modelConfig.scorer_agg_dimensions.split(',').map(item => item.trim());

            setModelInitStatus(`${formValues.source} model "${formValues.eval_id}" initialized successfully!`);
            console.log(modelConfig)
            fetchWithAuth(`${API_BASE_URL}/api/evals/create_or_update_eval`, {
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

            navigate("/evals")
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
                {eval_id ? 'Eval Configuration' : 'New Eval Configuration'}
            </Typography>

            <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>
                <EvalConfigForm
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

export default EvalConfigPage;