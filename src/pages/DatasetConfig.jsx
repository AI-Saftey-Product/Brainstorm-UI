import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  FormHelperText,
  Container,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { saveDatasetConfig, getDatasetConfigById } from '../services/datasetStorageService';
import { 
  searchDatasets, 
  getDatasetInfo, 
  getDatasetSample,
  parseDatasetFile
} from '../services/huggingFaceDatasetService';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dataset-tabpanel-${index}`}
      aria-labelledby={`dataset-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DatasetConfig = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  // Check if we have a config passed in from location state (for editing)
  const passedConfig = location.state?.config;
  
  // State for form values
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    dataset_id: '',
    source: 'huggingface',
    api_key: '',
    split: 'test',
    sampling: 'random',
    sample_size: 100,
    column_mapping: {},
  });
  
  // Search and UI state
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetSamples, setDatasetSamples] = useState([]);
  const [columns, setColumns] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Column mapping state
  const [columnMappings, setColumnMappings] = useState({
    input: '',
    reference: '',
    label: '',
  });
  
  // Load config from passedConfig on mount
  useEffect(() => {
    if (passedConfig) {
      console.log('Loading passed config:', passedConfig);
      setFormValues({
        name: passedConfig.name || '',
        description: passedConfig.description || '',
        dataset_id: passedConfig.dataset_id || '',
        source: passedConfig.source || 'huggingface',
        api_key: passedConfig.api_key || '',
        split: passedConfig.split || 'test',
        sampling: passedConfig.sampling || 'random',
        sample_size: passedConfig.sample_size || 100,
        column_mapping: passedConfig.column_mapping || {},
      });
      
      if (passedConfig.column_mapping) {
        console.log('Setting column mappings from passed config:', passedConfig.column_mapping);
        setColumnMappings({
          input: passedConfig.column_mapping.input || '',
          reference: passedConfig.column_mapping.reference || '',
          label: passedConfig.column_mapping.label || '',
        });
      }
      
      // If it's a Hugging Face dataset, fetch its details
      if (passedConfig.source === 'huggingface' && passedConfig.dataset_id) {
        handleSelectDataset(passedConfig.dataset_id);
      }
      
      // If it's a custom upload, restore file information
      if (passedConfig.source === 'custom' && passedConfig.file) {
        setUploadedFile(passedConfig.file);
        if (passedConfig.file.data && passedConfig.file.data[0]) {
          const fileColumns = Object.keys(passedConfig.file.data[0]);
          setColumns(fileColumns);
        }
      }
    }
  }, [passedConfig]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // When switching tabs, update the source
    setFormValues(prev => ({
      ...prev,
      source: newValue === 0 ? 'huggingface' : 'custom'
    }));
  };
  
  const handleFormChange = (field) => (event) => {
    setFormValues({
      ...formValues,
      [field]: event.target.value
    });
    
    // Clear validation errors for changed fields
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: null
      });
    }
  };
  
  const handleColumnMappingChange = (field) => (event) => {
    console.log(`Changing column mapping for ${field} to:`, event.target.value);
    
    // Update the column mappings state
    const newColumnMappings = {
      ...columnMappings,
      [field]: event.target.value
    };
    setColumnMappings(newColumnMappings);
    
    // Also update in form values
    setFormValues(prev => {
      const updatedFormValues = {
        ...prev,
        column_mapping: newColumnMappings
      };
      console.log('Updated form values with new column mapping:', updatedFormValues);
      return updatedFormValues;
    });
    
    // Clear any validation errors for this field
    if (validationErrors.input_column && field === 'input') {
      setValidationErrors(prev => ({
        ...prev,
        input_column: null
      }));
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchResults([]);
    
    try {
      const results = await searchDatasets(searchQuery, {}, formValues.api_key);
      setSearchResults(results);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Search error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleSelectDataset = async (datasetId) => {
    console.log('Selecting dataset:', datasetId);
    setLoading(true);
    
    try {
      // Update dataset ID in form values
      setFormValues(prev => {
        const updatedValues = {
          ...prev,
          dataset_id: datasetId
        };
        console.log('Updated form values with dataset ID:', updatedValues);
        return updatedValues;
      });
      
      // Fetch dataset details
      console.log('Fetching dataset info for:', datasetId);
      const datasetInfo = await getDatasetInfo(datasetId, formValues.api_key);
      console.log('Received dataset info:', datasetInfo);
      setSelectedDataset(datasetInfo);
      
      // Update name and description if not already set
      if (!formValues.name) {
        setFormValues(prev => {
          const updatedValues = {
            ...prev,
            name: datasetInfo.name || datasetId.split('/').pop(),
            description: datasetInfo.description || ''
          };
          console.log('Updated form with dataset info:', updatedValues);
          return updatedValues;
        });
      }
      
      // Fetch samples
      console.log('Fetching dataset samples...');
      try {
        const samples = await getDatasetSample(datasetId, formValues.split, 5, formValues.api_key);
        console.log('Received dataset samples:', samples);
        
        if (samples && samples.length > 0) {
          setDatasetSamples(samples);
          
          // Extract columns/features for mapping
          const sampleColumns = Object.keys(samples[0]);
          console.log('Found columns in samples:', sampleColumns);
          setColumns(sampleColumns);
          
          // Auto-detect possible column mappings
          if (sampleColumns.length > 0) {
            const inputCol = sampleColumns.find(col => 
              ['input', 'text', 'question', 'prompt', 'context'].includes(col.toLowerCase())
            ) || sampleColumns[0];
            
            const outputCol = sampleColumns.find(col => 
              ['output', 'target', 'label', 'answer', 'response'].includes(col.toLowerCase())
            ) || (sampleColumns.length > 1 ? sampleColumns[1] : '');
            
            if (inputCol || outputCol) {
              const newMappings = {
                input: inputCol || '',
                reference: outputCol || '',
                label: ''
              };
              console.log('Auto-detected column mappings:', newMappings);
              setColumnMappings(newMappings);
              
              // Also update in form values
              setFormValues(prev => ({
                ...prev,
                column_mapping: newMappings
              }));
            }
          }
        } else {
          // Empty or no samples returned
          setSnackbar({
            open: true,
            message: 'No samples were found for this dataset. Please try a different dataset or split.',
            severity: 'error'
          });
        }
      } catch (sampleError) {
        console.error('Error fetching samples:', sampleError);
        
        setSnackbar({
          open: true,
          message: `Could not fetch samples: ${sampleError.message}. Please try a different dataset.`,
          severity: 'error'
        });
        
        // Reset selected dataset if we couldn't get samples
        setSelectedDataset(null);
        setDatasetSamples([]);
        setColumns([]);
      }
    } catch (error) {
      console.error('Error selecting dataset:', error);
      setSnackbar({
        open: true,
        message: `Failed to load dataset: ${error.message}`,
        severity: 'error'
      });
      
      // Reset state
      setSelectedDataset(null);
      setDatasetSamples([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    
    try {
      // Parse the file
      const parsedFile = await parseDatasetFile(file);
      setUploadedFile(parsedFile);
      
      // Update form values for custom dataset
      setFormValues(prev => ({
        ...prev,
        name: prev.name || file.name.split('.')[0],
        source: 'custom',
        file: parsedFile
      }));
      
      // Extract columns
      if (parsedFile.data && parsedFile.data.length > 0) {
        const fileColumns = Object.keys(parsedFile.data[0]);
        setColumns(fileColumns);
        setDatasetSamples(parsedFile.data.slice(0, 5)); // Show first 5 samples
      }
      
      setSnackbar({
        open: true,
        message: 'File uploaded successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to parse file: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };
  
  const validateForm = () => {
    const errors = {};
    
    // Common validations
    if (!formValues.name) {
      errors.name = 'Dataset name is required';
    }
    
    // Source-specific validations
    if (formValues.source === 'huggingface') {
      if (!formValues.dataset_id) {
        errors.dataset_id = 'Please select a dataset';
      }
      
      // Only enforce column mapping validation if we have columns
      if (columns.length > 0 && !columnMappings.input) {
        errors.input_column = 'Input column is required';
      }
    } else if (formValues.source === 'custom') {
      if (!uploadedFile) {
        errors.file = 'Please upload a dataset file';
      }
      
      // Only enforce column mapping validation if we have uploaded a file with data
      if (uploadedFile?.data?.length > 0 && !columnMappings.input) {
        errors.input_column = 'Input column is required';
      }
    }
    
    setValidationErrors(errors);
    console.log('Form validation results:', errors);
    console.log('Validation passed:', Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    console.log('Submit button clicked');
    console.log('Current form values:', formValues);
    console.log('Column mappings:', columnMappings);
    
    // Check form validation
    if (!validateForm()) {
      console.log('Form validation failed');
      setSnackbar({
        open: true,
        message: 'Please fix the validation errors before saving',
        severity: 'error'
      });
      return;
    }
    
    console.log('Form validation passed, proceeding with save');
    setLoading(true);
    
    try {
      // Prepare configuration object
      const datasetConfig = {
        ...formValues,
        id: passedConfig?.id,
        column_mapping: columnMappings,
      };
      
      console.log('Preparing to save dataset config:', datasetConfig);
      
      // If custom upload, include file data
      if (formValues.source === 'custom' && uploadedFile) {
        datasetConfig.file = uploadedFile;
      }
      
      // Save configuration
      console.log('Calling saveDatasetConfig...');
      const savedConfig = await saveDatasetConfig(datasetConfig);
      console.log('Dataset saved successfully:', savedConfig);
      
      setConfigSuccess(true);
      setSnackbar({
        open: true,
        message: 'Dataset configuration saved successfully',
        severity: 'success'
      });
      
      // Redirect to datasets page after successful save
      console.log('Setting timeout for redirection...');
      setTimeout(() => {
        console.log('Redirecting to /datasets page...');
        navigate('/datasets');
      }, 1500);
    } catch (error) {
      console.error('Error saving dataset:', error);
      setSnackbar({
        open: true,
        message: `Failed to save dataset: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    navigate('/datasets');
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Datasets
        </Button>
        
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ mb: 4 }}
        >
          {passedConfig ? 'Edit Dataset' : 'Configure Dataset'}
        </Typography>
        
        <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="dataset source tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Hugging Face Dataset" />
            <Tab label="Custom Upload" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Hugging Face API Key (optional)"
                  value={formValues.api_key}
                  onChange={handleFormChange('api_key')}
                  type="password"
                  helperText="API key for accessing private datasets or higher rate limits"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Search Datasets"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., text classification, sentiment, squad"
                  />
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    startIcon={<SearchIcon />}
                    disabled={searchLoading}
                  >
                    {searchLoading ? <CircularProgress size={24} /> : 'Search'}
                  </Button>
                </Box>
              </Grid>
              
              {searchResults.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Search Results
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <Grid container spacing={2}>
                      {searchResults.map((dataset) => (
                        <Grid item xs={12} md={6} key={dataset.id}>
                          <Card 
                            sx={{ 
                              boxShadow: 'none', 
                              border: '1px solid', 
                              borderColor: formValues.dataset_id === dataset.id ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              bgcolor: formValues.dataset_id === dataset.id ? 'action.selected' : 'background.paper'
                            }}
                            onClick={() => handleSelectDataset(dataset.id)}
                          >
                            <CardContent>
                              <Typography variant="h6" noWrap>
                                {dataset.name || dataset.id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {dataset.description || 'No description available'}
                              </Typography>
                              <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                                {dataset.tags?.slice(0, 3).map(tag => (
                                  <Chip key={tag} label={tag} size="small" />
                                ))}
                                {dataset.tags?.length > 3 && (
                                  <Chip label={`+${dataset.tags.length - 3}`} size="small" />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Grid>
              )}
              
              {formValues.dataset_id && selectedDataset && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="success">
                      Selected dataset: <strong>{selectedDataset.name || formValues.dataset_id}</strong>
                    </Alert>
                  </Box>
                </Grid>
              )}
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ 
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer'
                }} onClick={triggerFileUpload}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    accept=".json,.csv,.txt"
                  />
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Upload Dataset File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Supported formats: JSON, CSV, TXT
                  </Typography>
                  {uploadedFile ? (
                    <Chip
                      label={uploadedFile.filename}
                      onDelete={() => setUploadedFile(null)}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={triggerFileUpload}
                      sx={{ mt: 1 }}
                    >
                      Select File
                    </Button>
                  )}
                </Box>
                {validationErrors.file && (
                  <FormHelperText error>{validationErrors.file}</FormHelperText>
                )}
              </Grid>
              
              {uploadedFile && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    Uploaded: <strong>{uploadedFile.filename}</strong> ({Math.round(uploadedFile.size / 1024)} KB)
                  </Alert>
                </Grid>
              )}
            </Grid>
          </TabPanel>
        </Paper>
        
        {/* Dataset Configuration */}
        <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Dataset Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dataset Name"
                value={formValues.name}
                onChange={handleFormChange('name')}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Split</InputLabel>
                <Select
                  value={formValues.split}
                  onChange={handleFormChange('split')}
                  label="Split"
                >
                  <MenuItem value="train">Training</MenuItem>
                  <MenuItem value="validation">Validation</MenuItem>
                  <MenuItem value="test">Test</MenuItem>
                </Select>
                <FormHelperText>Dataset split to use for testing</FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sampling Strategy</InputLabel>
                <Select
                  value={formValues.sampling}
                  onChange={handleFormChange('sampling')}
                  label="Sampling Strategy"
                >
                  <MenuItem value="random">Random Sampling</MenuItem>
                  <MenuItem value="sequential">Sequential Sampling</MenuItem>
                  <MenuItem value="stratified">Stratified Sampling</MenuItem>
                </Select>
                <FormHelperText>How to sample from the dataset for testing</FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sample Size"
                type="number"
                value={formValues.sample_size}
                onChange={handleFormChange('sample_size')}
                InputProps={{ inputProps: { min: 1, max: 10000 } }}
                helperText="Number of examples to sample for testing"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formValues.description}
                onChange={handleFormChange('description')}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Column Mapping */}
        {columns.length > 0 && (
          <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Column Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Map dataset columns to standard fields used in tests
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!validationErrors.input_column}>
                  <InputLabel>Input Column</InputLabel>
                  <Select
                    value={columnMappings.input}
                    onChange={handleColumnMappingChange('input')}
                    label="Input Column"
                  >
                    {columns.map(column => (
                      <MenuItem key={column} value={column}>{column}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {validationErrors.input_column || "Column containing input text/data for the model"}
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Reference/Target Column</InputLabel>
                  <Select
                    value={columnMappings.reference}
                    onChange={handleColumnMappingChange('reference')}
                    label="Reference/Target Column"
                  >
                    <MenuItem value="">None</MenuItem>
                    {columns.map(column => (
                      <MenuItem key={column} value={column}>{column}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Column containing expected outputs (optional)</FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Label Column</InputLabel>
                  <Select
                    value={columnMappings.label}
                    onChange={handleColumnMappingChange('label')}
                    label="Label Column"
                  >
                    <MenuItem value="">None</MenuItem>
                    {columns.map(column => (
                      <MenuItem key={column} value={column}>{column}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Column containing class labels (optional)</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Dataset Preview */}
        {datasetSamples.length > 0 && (
          <Paper sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5">
                Dataset Preview
              </Typography>
              {formValues.source === 'huggingface' && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.open(`https://huggingface.co/datasets/${formValues.dataset_id}`, '_blank')}
                >
                  View on Hugging Face
                </Button>
              )}
            </Box>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(datasetSamples[0]).map(column => (
                      <TableCell key={column}>
                        {column}
                        {column === columnMappings.input && (
                          <Chip size="small" label="Input" sx={{ ml: 1 }} color="primary" />
                        )}
                        {column === columnMappings.reference && (
                          <Chip size="small" label="Reference" sx={{ ml: 1 }} color="secondary" />
                        )}
                        {column === columnMappings.label && (
                          <Chip size="small" label="Label" sx={{ ml: 1 }} color="info" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datasetSamples.map((row, index) => (
                    <TableRow key={index}>
                      {Object.entries(row).map(([key, value]) => (
                        <TableCell 
                          key={key} 
                          sx={{ 
                            maxWidth: 200, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
        
        {/* Submit Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              console.log('Save button clicked directly');
              handleSubmit();
            }}
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Dataset Configuration'}
          </Button>
        </Box>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DatasetConfig; 