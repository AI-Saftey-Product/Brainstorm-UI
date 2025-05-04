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

const EvalConfigForm = ({
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
                        label="Eval ID"
                        value={formValues.eval_id}
                        onChange={handleChange('eval_id')}
                        error={!!errors.eval_id}
                        helperText={errors.eval_id}
                    />
                </Grid>

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
                        label="Scorer"
                        value={formValues.scorer}
                        onChange={handleChange('scorer')}
                        error={!!errors.scorer}
                        helperText={errors.scorer}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Scorer Aggregate Functions"
                        value={formValues.scorer_agg_functions}
                        onChange={handleChange('scorer_agg_functions')}
                        error={!!errors.scorer_agg_functions}
                        helperText={errors.scorer_agg_functions}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Scorer Aggregate Dimensions"
                        value={formValues.scorer_agg_dimensions}
                        onChange={handleChange('scorer_agg_dimensions')}
                        error={!!errors.scorer_agg_dimensions}
                        helperText={errors.scorer_agg_dimensions}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Eval Name"
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
            </Grid>
        </Box>
    );
};

export default EvalConfigForm;