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
const DATASET_ADAPTERS = {
    "NLP": [
        "TruthfulQA",
        "MuSR",
        "BBQ"
    ]
};

const DatasetConfigForm = ({
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


    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Dataset ID"
                        value={formValues.dataset_id}
                        onChange={handleChange('dataset_id')}
                        error={!!errors.dataset_id}
                        helperText={errors.dataset_id}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Dataset Name"
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
                    <FormControl fullWidth error={!!errors.dataset_adapter}>
                        <InputLabel>Dataset Adapter</InputLabel>
                        <Select
                            value={formValues.dataset_adapter}
                            label="Dataset Adapter"
                            onChange={handleChange('dataset_adapter')}
                        >
                            {DATASET_ADAPTERS["NLP"].map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.dataset_adapter && (
                            <FormHelperText>{errors.dataset_adapter}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>


                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Sample Size"
                        value={formValues.sample_size}
                        onChange={handleChange('sample_size')}
                        error={!!errors.sample_size}
                        helperText={errors.sample_size}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default DatasetConfigForm;