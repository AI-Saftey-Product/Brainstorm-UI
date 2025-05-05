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
    Button,
    Tabs,
    Tab,
    Paper,
    Divider,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    IconButton,
    InputAdornment,
    Tooltip,
    Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

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

// Data source options
const DATA_SOURCES = [
    { value: 'existing', label: 'Use Existing Dataset' },
    { value: 'huggingface', label: 'Search Hugging Face' },
    { value: 'csv', label: 'Upload CSV File' }
];

const DatasetConfigForm = ({
                               formValues = {},
                               onChange,
                               errors = {}
                           }) => {
    const [activeTab, setActiveTab] = useState('existing');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreview, setCsvPreview] = useState(null);
    const [selectedDataset, setSelectedDataset] = useState(null);
    
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        
        // Update the source in the form values
        const newSource = newValue === 'existing' ? 'existing' : 
                          newValue === 'huggingface' ? 'huggingface' : 'csv';
        
        onChange({
            ...formValues,
            source: newSource
        });
    };
    
    const handleSearchQueryChange = (event) => {
        setSearchQuery(event.target.value);
    };
    
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setSearching(true);
        setSearchError('');
        
        try {
            // Use the actual Hugging Face API to search for datasets
            const response = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(searchQuery)}&limit=20`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform the API response into our expected format
            const formattedResults = data.map(dataset => ({
                id: dataset.id,
                name: dataset.id.split('/').pop(), // Extract the dataset name from the id
                description: dataset.description || 'No description available',
                downloads: dataset.downloads || 0,
                likes: dataset.likes || 0,
                tags: dataset.tags || []
            }));
            
            setSearchResults(formattedResults);
            
            if (formattedResults.length === 0) {
                setSearchError('No datasets found matching your search criteria.');
            }
            
            setSearching(false);
        } catch (error) {
            console.error('Error searching Hugging Face datasets:', error);
            setSearchError('Failed to search Hugging Face datasets: ' + error.message);
            setSearching(false);
        }
    };
    
    const handleDatasetSelect = (dataset) => {
        setSelectedDataset(dataset);
        
        // Extract name part from the ID (format often contains username/dataset_name)
        const datasetName = dataset.id.includes('/') 
            ? dataset.id.split('/').pop() 
            : dataset.id;
        
        // Determine the best dataset adapter
        // Try to match with known adapters first
        let adapter = 'CustomHuggingFace'; // Default
        
        const normalizedName = datasetName.toLowerCase();
        if (normalizedName.includes('truthful') || normalizedName === 'truthfulqa') {
            adapter = 'TruthfulQA';
        } else if (normalizedName === 'bbq') {
            adapter = 'BBQ';
        } else if (normalizedName === 'musr') {
            adapter = 'MuSR';
        }
        
        onChange({
            ...formValues,
            dataset_id: dataset.id,
            name: dataset.name,
            description: dataset.description || '',
            source: 'huggingface',
            dataset_adapter: adapter,
            hf_dataset_id: dataset.id // Store the original HF ID
        });
    };
    
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setCsvFile(file);
        
        // Read and preview CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const lines = content.split('\n').slice(0, 5); // Preview first 5 lines
            
            // Parse basic CSV structure for preview
            const headers = lines[0].split(',').map(header => header.trim());
            const rows = lines.slice(1).map(line => 
                line.split(',').map(cell => cell.trim())
            );
            
            setCsvPreview({ headers, rows });
            
            // Update form values with file info
            onChange({
                ...formValues,
                source: 'csv',
                dataset_id: file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_').toLowerCase(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                file: { 
                    name: file.name,
                    size: file.size,
                    type: file.type
                }
            });
        };
        
        reader.readAsText(file);
    };

    const handleChange = (field) => (event) => {
        let value = event.target.value;

        // Update form values
        onChange({
            ...formValues,
                [field]: value
        });
    };

    return (
        <Box>
            <Paper sx={{ mb: 3, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value="existing" label="Use Existing Dataset" />
                    <Tab value="huggingface" label="Search Hugging Face" />
                    <Tab value="csv" label="Upload CSV" />
                </Tabs>
                
                <Box sx={{ p: 3 }}>
                    {activeTab === 'existing' && (
            <Grid container spacing={3}>
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
                        </Grid>
                    )}
                    
                    {activeTab === 'huggingface' && (
                        <Box>
                            <TextField
                                fullWidth
                                label="Search Hugging Face Datasets"
                                value={searchQuery}
                                onChange={handleSearchQueryChange}
                                sx={{ mb: 2 }}
                                placeholder="Type dataset name (e.g. 'squad', 'glue', 'imdb')"
                                helperText="Press Enter or click the search icon to search"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        handleSearch();
                                    }
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton 
                                                onClick={handleSearch}
                                                disabled={searching || !searchQuery.trim()}
                                                edge="end"
                                                color="primary"
                                            >
                                                {searching ? <CircularProgress size={24} /> : <SearchIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            
                            {searching && !searchError && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2">
                                        Searching Hugging Face for "{searchQuery}"...
                                    </Typography>
                                </Box>
                            )}
                            
                            {searchError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {searchError}
                                </Alert>
                            )}
                            
                            {!searching && searchResults.length === 0 && searchQuery && !searchError && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    No datasets found matching "{searchQuery}". Try a different search term.
                                </Alert>
                            )}
                            
                            {searchResults.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Search Results ({searchResults.length})
                                    </Typography>
                                    <List sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                        {searchResults.map((dataset) => {
                                            const isSelected = selectedDataset && selectedDataset.id === dataset.id;
                                            return (
                                                <ListItem 
                                                    key={dataset.id}
                                                    secondaryAction={
                                                        <IconButton 
                                                            edge="end" 
                                                            onClick={() => handleDatasetSelect(dataset)}
                                                            color={isSelected ? "success" : "primary"}
                                                            title={isSelected ? "Dataset selected" : "Select dataset"}
                                                        >
                                                            {isSelected ? <CheckCircleIcon /> : <AddIcon />}
                                                        </IconButton>
                                                    }
                                                    divider
                                                    sx={{ 
                                                        flexDirection: 'column', 
                                                        alignItems: 'flex-start', 
                                                        py: 1.5,
                                                        bgcolor: isSelected ? 'rgba(46, 125, 50, 0.08)' : 'inherit',
                                                        borderLeft: isSelected ? '4px solid' : 'none',
                                                        borderLeftColor: 'success.main',
                                                        pl: isSelected ? 2 : 2
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography variant="subtitle1" fontWeight="medium">
                                                            {dataset.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            {dataset.downloads > 0 && (
                                                                <Tooltip title="Downloads">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                                                        <CloudUploadIcon fontSize="small" />
                                                                        <Typography variant="caption">
                                                                            {dataset.downloads.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                </Tooltip>
                                                            )}
                                                            {dataset.likes > 0 && (
                                                                <Tooltip title="Likes">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                                                        ❤️
                                                                        <Typography variant="caption">
                                                                            {dataset.likes.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                </Tooltip>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        {dataset.description}
                                                    </Typography>
                                                    {dataset.tags && dataset.tags.length > 0 && (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {dataset.tags.slice(0, 5).map((tag, index) => (
                                                                <Chip 
                                                                    key={index} 
                                                                    label={tag} 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    sx={{ fontSize: '0.7rem' }}
                                                                />
                                                            ))}
                                                            {dataset.tags.length > 5 && (
                                                                <Chip 
                                                                    label={`+${dataset.tags.length - 5} more`} 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    sx={{ fontSize: '0.7rem' }}
                                                                />
                                                            )}
                                                        </Box>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end', mt: 1 }}>
                                                        ID: {dataset.id}
                                                    </Typography>
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                </Box>
                            )}
                        </Box>
                    )}
                    
                    {activeTab === 'csv' && (
                        <Box>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mb: 3 }}
                                fullWidth
                            >
                                Upload CSV File
                                <input
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>
                            
                            {csvFile && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    File uploaded: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                                </Alert>
                            )}
                            
                            {csvPreview && (
                                <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto' }}>
                                    <Typography variant="subtitle2" sx={{ p: 1, bgcolor: 'background.paper' }}>
                                        CSV Preview (first {csvPreview.rows.length} rows):
                                    </Typography>
                                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <Box component="thead" sx={{ bgcolor: 'background.paper' }}>
                                            <Box component="tr">
                                                {csvPreview.headers.map((header, idx) => (
                                                    <Box component="th" key={idx} sx={{ p: 1, border: '1px solid', borderColor: 'divider', textAlign: 'left' }}>
                                                        {header}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                        <Box component="tbody">
                                            {csvPreview.rows.map((row, rowIdx) => (
                                                <Box component="tr" key={rowIdx}>
                                                    {row.map((cell, cellIdx) => (
                                                        <Box component="td" key={cellIdx} sx={{ p: 1, border: '1px solid', borderColor: 'divider' }}>
                                                            {cell}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>

            <Divider sx={{ mb: 3 }} />
            
            {selectedDataset && formValues.source === 'huggingface' && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(46, 125, 50, 0.08)', borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                            Selected Dataset: {selectedDataset.name}
                        </Typography>
                        <Button 
                            size="small" 
                            startIcon={<RestartAltIcon />} 
                            onClick={() => {
                                setSelectedDataset(null);
                                setSearchResults([]);
                                setSearchQuery('');
                                onChange({
                                    ...formValues,
                                    dataset_id: '',
                                    name: '',
                                    description: '',
                                    source: 'huggingface',
                                    hf_dataset_id: ''
                                });
                            }}
                        >
                            Reset
                        </Button>
                    </Box>
                    <Typography variant="body2" gutterBottom>
                        ID: {selectedDataset.id}
                    </Typography>
                    {selectedDataset.tags && selectedDataset.tags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedDataset.tags.slice(0, 5).map((tag, index) => (
                                <Chip 
                                    key={index} 
                                    label={tag} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ fontSize: '0.75rem' }}
                                />
                            ))}
                        </Box>
                    )}
                </Box>
            )}
            
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Dataset ID"
                        value={formValues.dataset_id || ''}
                        onChange={handleChange('dataset_id')}
                        error={!!errors.dataset_id}
                        helperText={errors.dataset_id || 'Unique identifier for this dataset'}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Dataset Name"
                        value={formValues.name || ''}
                        onChange={handleChange('name')}
                        error={!!errors.name}
                        helperText={errors.name || 'Display name for this dataset'}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Description"
                        value={formValues.description || ''}
                        onChange={handleChange('description')}
                        error={!!errors.description}
                        helperText={errors.description}
                        multiline
                        rows={2}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Sample Size"
                        value={formValues.sample_size || ''}
                        onChange={handleChange('sample_size')}
                        error={!!errors.sample_size}
                        helperText={errors.sample_size || 'Number of examples to use (leave empty for all)'}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Prompt Template"
                        value={formValues.prompt_template || ''}
                        onChange={handleChange('prompt_template')}
                        error={!!errors.prompt_template}
                        helperText={errors.prompt_template || 'Use formatted string with the real data fields e.g. "Q: {question}"'}
                        multiline
                        rows={4}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default DatasetConfigForm;