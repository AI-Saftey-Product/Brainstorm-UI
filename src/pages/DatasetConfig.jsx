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
    Stepper,
    Step,
    StepLabel,
} from '@mui/material';
import {useAppContext} from '../context/AppContext';
import {createModelAdapter} from '../services/modelAdapter';
import {saveModelConfig} from '../services/modelStorageService';
import DatasetConfigForm from "@/components/widgets/DatasetConfigForm.jsx";
import {fetchWithAuth} from "@/pages/Login.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const DatasetConfigPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {configureModel, modelConfigured} = useAppContext();
    const [modelInitStatus, setModelInitStatus] = useState('');
    // Check if we have a config passed in from location state (for editing)
    const {dataset_id} = useParams();

    const [passedConfig, setSavedConfigs] = useState([]);
    const [fileUploadProgress, setFileUploadProgress] = useState(0);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        if (dataset_id) {
            fetchWithAuth(`${API_BASE_URL}/api/datasets/get_datasets?dataset_id=${dataset_id}`, {
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
        source: 'existing',
        modality: 'NLP',
        dataset_adapter: 'MuSR',
        sample_size: "3",
        prompt_template: '',
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

        // If CSV upload, validate that a file is selected
        if (formValues.source === 'csv' && !formValues.file) {
            errors.file = 'Please upload a CSV file';
        }

        // If Hugging Face, validate dataset ID
        if (formValues.source === 'huggingface' && !formValues.dataset_id) {
            errors.dataset_id = 'Please select a dataset from the search results';
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
            // Create the model adapter with proper configuration
            const modelConfig = {...formValues};

            // Convert sample size to integer if provided
            modelConfig.sample_size = modelConfig.sample_size === '' ? null : parseInt(modelConfig.sample_size);

            // Handle CSV file upload if needed
            if (modelConfig.source === 'csv' && modelConfig.file) {
                setUploadingFile(true);
                
                try {
                    // Simulate file upload progress
                    for (let i = 0; i <= 100; i += 10) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        setFileUploadProgress(i);
                    }
                    
                    // In a real implementation, you would upload the file to the server
                    // const formData = new FormData();
                    // formData.append('file', modelConfig.file);
                    // const uploadResponse = await fetchWithAuth(`${API_BASE_URL}/api/datasets/upload_csv`, {
                    //     method: 'POST',
                    //     body: formData
                    // });
                    
                    // Add CSV adapter info
                    modelConfig.dataset_adapter = 'CSV';
                    
                    setUploadingFile(false);
                } catch (uploadError) {
                    setUploadingFile(false);
                    throw new Error(`Failed to upload file: ${uploadError.message}`);
                }
            }

            setModelInitStatus(`${formValues.source} dataset "${formValues.dataset_id}" initialized successfully!`);
            console.log("Submitting dataset config:", modelConfig);
            
            // Send dataset configuration to API
            const response = await fetchWithAuth(`${API_BASE_URL}/api/datasets/create_or_update_dataset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelConfig),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            setConfigSuccess(true);
            setSnackbarOpen(true);
            setLoading(false);

            // Navigate back to datasets page
            navigate("/datasets");
        } catch (error) {
            setConfigError(`Error initializing dataset: ${error.message || 'Unknown error'}`);
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };

    return (
        <Container maxWidth="lg">
            <Typography
                variant="h3"
                component="h1"
                sx={{mb: 4}}
            >
                {dataset_id ? 'Edit Dataset' : 'Add New Dataset'}
            </Typography>

            <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>
                <DatasetConfigForm
                    formValues={formValues}
                    onChange={handleFormChange}
                    errors={validationErrors}
                />

                {uploadingFile && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" gutterBottom>
                            Uploading file: {fileUploadProgress}%
                        </Typography>
                        <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1, height: 10, overflow: 'hidden' }}>
                            <Box 
                                sx={{ 
                                    width: `${fileUploadProgress}%`, 
                                    bgcolor: 'primary.main', 
                                    height: '100%',
                                    transition: 'width 0.3s ease-in-out'
                                }} 
                            />
                        </Box>
                    </Box>
                )}

                <Box sx={{mt: 4, display: 'flex', justifyContent: 'space-between'}}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/datasets')}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading || uploadingFile}
                    >
                        {loading ? <CircularProgress size={24}/> : 'Save Dataset'}
                    </Button>
                </Box>

                {configError && (
                    <Alert severity="error" sx={{mt: 3}}>
                        {configError}
                    </Alert>
                )}

                {modelInitStatus && (
                    <Alert severity="success" sx={{mt: 3}}>
                        {modelInitStatus}
                    </Alert>
                )}
            </Paper>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                message="Dataset configuration saved successfully"
            />
        </Container>
    );
};

export default DatasetConfigPage;