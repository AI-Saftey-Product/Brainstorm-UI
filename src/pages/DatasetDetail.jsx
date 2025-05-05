import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  Divider,
  Grid,
  Chip,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Pagination,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AccordionSummary,
  AccordionDetails,
  Accordion
} from '@mui/material';
import {
  ArrowLeft as ArrowLeftIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  ExternalLink as ExternalLinkIcon,
  Download as DownloadIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  RefreshCw as RefreshIcon,
  Database as DatabaseIcon,
  FileText as FileTextIcon,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { deleteDatasetConfig } from '../services/datasetStorageService';
import { getDatasetSample, getDatasetInfo } from '../services/huggingFaceDatasetService';
import { fetchWithAuth } from "@/pages/Login.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const DatasetDetail = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [dataset, setDataset] = useState(null);
  const [samples, setSamples] = useState([]);
  const [samplePage, setSamplePage] = useState(1);
  const [sampleSize, setSampleSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const samplesPerPage = 5;
  
  // New state for dataset metadata
  const [datasetMetadata, setDatasetMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [selectedSubset, setSelectedSubset] = useState(null);
  
  // Load dataset details
  useEffect(() => {
    loadDataset();
    loadDatasetMetadata();
  }, [datasetId]);
  
  // Update samples when split or subset changes
  useEffect(() => {
    if (dataset && selectedSplit) {
      loadSamplesForSplit(selectedSplit, selectedDimension, selectedSubset);
    }
  }, [selectedSplit, selectedDimension, selectedSubset]);
  
  const loadDatasetMetadata = async () => {
    if (!datasetId) return;
    
    setMetadataLoading(true);
    
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/datasets/get_dataset_metadata?dataset_id=${datasetId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset metadata');
      }
      
      const data = await response.json();
      setDatasetMetadata(data);
      
      // Set default split if available
      if (data.splits && data.splits.length > 0 && !selectedSplit) {
        setSelectedSplit(data.splits[0]);
      }
      
      // Set default dimension if available
      if (data.dimensions && data.dimensions.length > 0 && !selectedDimension) {
        setSelectedDimension(data.dimensions[0]);
      }
      
    } catch (err) {
      console.error("Error loading dataset metadata:", err);
    } finally {
      setMetadataLoading(false);
    }
  };
  
  const loadSamplesForSplit = async (split, dimension, subset) => {
    if (!dataset) return;
    
    setSampleLoading(true);
    
    try {
      // Fetch dataset preview from API with the selected split
      // Note: Currently the API doesn't support filtering by dimension/subset
      // This would need to be added to the backend API
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/datasets/get_dataset_preview?dataset_id=${dataset.dataset_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset preview');
      }
      
      const previewData = await response.json();
      
      // Check if the selected split exists in the data
      if (previewData && typeof previewData === 'object' && previewData[split]) {
        const splitData = previewData[split];
        
        if (Array.isArray(splitData) && splitData.length > 0) {
          // If we have a dimension and subset selected, we could filter the data
          // This would need backend support for larger datasets
          let filteredData = splitData;
          
          if (dimension && subset && splitData[0][dimension]) {
            filteredData = splitData.filter(item => item[dimension] === subset);
          }
          
          setSamples(filteredData);
        } else {
          setSamples([]);
        }
      } else {
        // If the split doesn't exist, try to use the first available split
        const availableSplits = Object.keys(previewData || {});
        if (availableSplits.length > 0) {
          const firstSplit = availableSplits[0];
          setSelectedSplit(firstSplit);
          
          if (Array.isArray(previewData[firstSplit])) {
            setSamples(previewData[firstSplit]);
          } else {
            setSamples([]);
          }
        } else {
          setSamples([]);
        }
      }
    } catch (err) {
      console.error("Error loading samples for split:", err);
      setSamples([]);
    } finally {
      setSampleLoading(false);
    }
  };
  
  const loadDataset = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dataset from API instead of local storage
      const response = await fetchWithAuth(`${API_BASE_URL}/api/datasets/get_datasets?dataset_id=${datasetId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('Dataset not found');
      }
      
      const datasetConfig = data[0]; // Get the first dataset from the array
      setDataset(datasetConfig);
      
      // If it's a Hugging Face dataset, fetch additional info
      if (datasetConfig.source === 'huggingface') {
        try {
          const info = await getDatasetInfo(datasetConfig.dataset_id, datasetConfig.api_key);
          setAdditionalInfo(info);
        } catch (infoError) {
          // Non-critical error, we can continue without additional info
        }
      }
      
      // Load samples
      await loadSamples(datasetConfig);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadSamples = async (datasetConfig, page = 1) => {
    if (!datasetConfig) return;
    
    setSampleLoading(true);
    
    try {
      // Fetch dataset preview from API
      const response = await fetchWithAuth(`${API_BASE_URL}/api/datasets/get_dataset_preview?dataset_id=${datasetConfig.dataset_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset preview');
      }
      
      const previewData = await response.json();
      console.log("Preview data:", previewData);
      
      // The API returns a structure like: { split1: [...rows], split2: [...rows] }
      // We need to extract the rows from one of the splits
      if (previewData && typeof previewData === 'object') {
        // Get the first split key (train, test, validation, etc.)
        const splitKeys = Object.keys(previewData);
        
        if (splitKeys.length > 0) {
          const firstSplitKey = splitKeys[0];
          const splitData = previewData[firstSplitKey];
          
          if (Array.isArray(splitData) && splitData.length > 0) {
            setSamples(splitData);
            console.log(`Loaded ${splitData.length} samples from split: ${firstSplitKey}`);
          } else {
            console.warn(`No samples found in split: ${firstSplitKey}`);
            setSamples([]);
          }
        } else {
          console.warn("No split keys found in preview data");
          setSamples([]);
        }
      } else {
        console.warn("Unexpected preview data format:", previewData);
        setSamples([]);
      }
      
      setSamplePage(page);
    } catch (err) {
      console.error("Error loading samples:", err);
      // If we can't load samples, don't set an error - just show empty samples
      setSamples([]);
    } finally {
      setSampleLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    try {
      // Use API to delete dataset
      const response = await fetchWithAuth(`${API_BASE_URL}/api/datasets/delete_datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([datasetId])
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }
      
      navigate('/datasets');
    } catch (err) {
      setError('Failed to delete dataset: ' + err.message);
    }
  };
  
  const handleEdit = () => {
    navigate('/dataset-config', { state: { config: dataset } });
  };
  
  const handleBack = () => {
    navigate('/datasets');
  };
  
  const handleNextPage = () => {
    loadSamples(dataset, samplePage + 1);
  };
  
  const handlePrevPage = () => {
    if (samplePage > 1) {
      loadSamples(dataset, samplePage - 1);
    }
  };
  
  const handleRefreshSamples = () => {
    loadSamples(dataset, samplePage);
  };
  
  // Export dataset as JSON
  const handleExport = () => {
    if (!dataset) return;
    
    const dataStr = JSON.stringify(dataset, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${dataset.name || 'dataset'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg">
        <Button startIcon={<ArrowLeftIcon />} onClick={handleBack} sx={{ mt: 4, mb: 2 }}>
          Back to Datasets
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }
  
  if (!dataset) {
    return (
      <Container maxWidth="lg">
        <Button startIcon={<ArrowLeftIcon />} onClick={handleBack} sx={{ mt: 4, mb: 2 }}>
          Back to Datasets
        </Button>
        <Alert severity="warning">Dataset not found</Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header with back button and actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Button startIcon={<ArrowLeftIcon />} onClick={handleBack}>
            Back to Datasets
          </Button>
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              {deleteConfirm ? 'Confirm Delete' : 'Delete'}
            </Button>
          </Stack>
        </Box>

        {/* Dataset title and overview */}
        <Paper 
          sx={{ 
            mb: 4, 
            p: 3, 
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'divider' 
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, bgcolor: 'primary.light', borderRadius: '50%' }}>
              {dataset.source === 'huggingface' ? (
                <DatabaseIcon size={24} color="#fff" />
              ) : (
                <FileTextIcon size={24} color="#fff" />
              )}
            </Box>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {dataset.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Created: {new Date(dataset.createdAt).toLocaleString()}
                {dataset.lastModified && dataset.lastModified !== dataset.createdAt && (
                  <> • Last modified: {new Date(dataset.lastModified).toLocaleString()}</>
                )}
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="body1" paragraph>
                {dataset.description || 'No description provided'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Source</Typography>
                  <Typography variant="body1">
                    <Chip 
                      label={dataset.source === 'huggingface' ? 'Hugging Face' : 'Custom Upload'} 
                      color={dataset.source === 'huggingface' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {dataset.source === 'huggingface' && (
                      <Tooltip title="View on Hugging Face">
                        <IconButton 
                          size="small"
                          onClick={() => window.open(`https://huggingface.co/datasets/${dataset.dataset_id}`, '_blank')}
                        >
                          <ExternalLinkIcon size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Typography>
                </Box>
                
                {dataset.source === 'huggingface' && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Dataset ID</Typography>
                    <Typography variant="body1">{dataset.dataset_id}</Typography>
                  </Box>
                )}
                
                {dataset.source === 'custom' && dataset.file && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">File</Typography>
                    <Typography variant="body1">{dataset.file.filename}</Typography>
                  </Box>
                )}
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Split</Typography>
                  <Typography variant="body1">{dataset.split || 'test'}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Sampling Strategy</Typography>
                  <Typography variant="body1">{dataset.sampling || 'random'}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Sample Size</Typography>
                  <Typography variant="body1">{dataset.sample_size || 100} examples</Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Column Mapping */}
        <Paper 
          sx={{ 
            mb: 4, 
            p: 3, 
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'divider' 
          }}
        >
          <Typography variant="h5" gutterBottom>Column Mapping</Typography>
          
          {dataset.column_mapping && Object.keys(dataset.column_mapping).some(key => dataset.column_mapping[key]) ? (
            <Grid container spacing={2}>
              {dataset.column_mapping.input && (
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Input Column</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {dataset.column_mapping.input}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {dataset.column_mapping.reference && (
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Reference/Target Column</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {dataset.column_mapping.reference}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {dataset.column_mapping.label && (
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Label Column</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {dataset.column_mapping.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography variant="body1" color="text.secondary">No column mappings configured</Typography>
          )}
        </Paper>
        
        {/* New section for Dataset Splits and Subsets */}
        <Paper 
          sx={{ 
            mb: 4, 
            p: 3, 
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'divider' 
          }}
        >
          <Typography variant="h5" gutterBottom>Dataset Structure</Typography>
          
          {metadataLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : datasetMetadata ? (
            <Box>
              {/* Dataset Statistics */}
              {datasetMetadata.format_info && Object.keys(datasetMetadata.format_info).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Dataset Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        boxShadow: 'none', 
                        border: '1px solid', 
                        borderColor: 'divider',
                        height: '100%'
                      }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Splits
                          </Typography>
                          <Typography variant="h4">
                            {datasetMetadata.format_info.num_splits || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        boxShadow: 'none', 
                        border: '1px solid', 
                        borderColor: 'divider',
                        height: '100%'
                      }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Examples
                          </Typography>
                          <Typography variant="h4">
                            {datasetMetadata.format_info.total_examples?.toLocaleString() || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        boxShadow: 'none', 
                        border: '1px solid', 
                        borderColor: 'divider',
                        height: '100%'
                      }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Dimensions
                          </Typography>
                          <Typography variant="h4">
                            {datasetMetadata.dimensions?.length || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {/* Splits Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Available Splits
                </Typography>
                
                {datasetMetadata.splits && datasetMetadata.splits.length > 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1 
                  }}>
                    {datasetMetadata.splits.map(split => (
                      <Chip 
                        key={split}
                        label={split}
                        onClick={() => setSelectedSplit(split)}
                        color={selectedSplit === split ? "primary" : "default"}
                        variant={selectedSplit === split ? "filled" : "outlined"}
                        sx={{ 
                          px: 1,
                          fontWeight: selectedSplit === split ? 'bold' : 'normal'
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No splits information available
                  </Typography>
                )}
              </Box>
              
              {/* Dimensions and Subsets */}
              {datasetMetadata.dimensions && datasetMetadata.dimensions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Dataset Dimensions and Subsets
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Dimension Selection */}
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Dimension</InputLabel>
                        <Select
                          value={selectedDimension || ''}
                          label="Select Dimension"
                          onChange={(e) => {
                            setSelectedDimension(e.target.value);
                            setSelectedSubset(null); // Reset subset when dimension changes
                          }}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {datasetMetadata.dimensions.map(dimension => (
                            <MenuItem key={dimension} value={dimension}>
                              {dimension}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Subset Selection - only show if a dimension is selected */}
                    {selectedDimension && datasetMetadata.subsets && 
                     datasetMetadata.subsets[selectedDimension] && 
                     datasetMetadata.subsets[selectedDimension].length > 0 && (
                      <Grid item xs={12} sm={8}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Select Subset</InputLabel>
                          <Select
                            value={selectedSubset || ''}
                            label="Select Subset"
                            onChange={(e) => setSelectedSubset(e.target.value)}
                          >
                            <MenuItem value="">
                              <em>All (no filter)</em>
                            </MenuItem>
                            {datasetMetadata.subsets[selectedDimension].map(subset => (
                              <MenuItem key={subset} value={subset}>
                                {subset}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                  
                  {/* List of all dimensions and their values */}
                  <Accordion 
                    sx={{ 
                      mt: 2, 
                      '&:before': { display: 'none' },
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <AccordionSummary expandIcon={<ChevronDownIcon size={18} />}>
                      <Typography variant="subtitle2">
                        View All Dimensions and Values
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {datasetMetadata.dimensions.map(dimension => (
                          <Grid item xs={12} sm={6} md={4} key={dimension}>
                            <Card 
                              variant="outlined" 
                              sx={{ 
                                height: '100%',
                                boxShadow: 'none'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {dimension}
                                </Typography>
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexWrap: 'wrap', 
                                  gap: 0.5,
                                  mt: 1
                                }}>
                                  {datasetMetadata.subsets[dimension]?.map(value => (
                                    <Chip 
                                      key={value} 
                                      label={value} 
                                      size="small" 
                                      variant="outlined"
                                      onClick={() => {
                                        setSelectedDimension(dimension);
                                        setSelectedSubset(value);
                                      }}
                                    />
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
              
              {/* HF Configuration Selection */}
              {dataset && dataset.source === 'huggingface' && 
               datasetMetadata.subsets && 
               datasetMetadata.subsets.configurations && 
               datasetMetadata.subsets.configurations.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Available Configurations
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1 
                  }}>
                    {datasetMetadata.subsets.configurations.map(config => (
                      <Chip 
                        key={config}
                        label={config}
                        variant="outlined"
                        onClick={() => {
                          // Ideally we would load this configuration
                          // Would need backend support
                          alert(`Loading configuration '${config}' would require backend support.`);
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              No dataset structure information available.
              <Button 
                variant="text" 
                size="small" 
                onClick={loadDatasetMetadata} 
                sx={{ ml: 1 }}
              >
                Refresh
              </Button>
            </Alert>
          )}
        </Paper>
        
        {/* Data Samples - update the title to show selected split/subset */}
        <Paper 
          sx={{ 
            mb: 4, 
            p: 3, 
            boxShadow: 'none', 
            border: '1px solid', 
            borderColor: 'divider' 
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Data Samples
              {selectedSplit && <span style={{ fontWeight: 'normal', fontSize: '0.8em' }}> ({selectedSplit})</span>}
              {selectedDimension && selectedSubset && 
                <span style={{ fontWeight: 'normal', fontSize: '0.8em' }}> • {selectedDimension}: {selectedSubset}</span>
              }
            </Typography>
            <Button 
              startIcon={<RefreshIcon />}
              onClick={() => {
                if (selectedSplit) {
                  loadSamplesForSplit(selectedSplit, selectedDimension, selectedSubset);
                } else {
                  handleRefreshSamples();
                }
              }}
              disabled={sampleLoading}
            >
              Refresh
            </Button>
          </Box>
          
          {sampleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : samples.length > 0 ? (
            <>
              <TableContainer 
                sx={{ 
                  maxHeight: 400, 
                  overflow: 'auto',
                  border: '1px solid rgba(224, 224, 224, 0.7)',
                  borderRadius: 1,
                  '& .MuiTable-root': {
                    tableLayout: 'auto',
                    minWidth: '100%'
                  },
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px'
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.05)'
                  }
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50} sx={{ fontWeight: 'bold', backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>Row</TableCell>
                      {samples && samples.length > 0 && samples[0] && typeof samples[0] === 'object' ? 
                        Object.keys(samples[0]).map(column => (
                          <TableCell 
                            key={column}
                            sx={{ 
                              fontWeight: 'bold', 
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              minWidth: column.length * 10 + 40, // Dynamic width based on header length plus space for chips
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              lineHeight: 1.2,
                              padding: '8px 12px'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="500"
                                sx={{
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  width: '100%'
                                }}
                              >
                                {column}
                              </Typography>
                              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {dataset.column_mapping?.input === column && (
                                  <Chip size="small" label="Input" color="primary" />
                                )}
                                {dataset.column_mapping?.reference === column && (
                                  <Chip size="small" label="Reference" color="secondary" />
                                )}
                                {dataset.column_mapping?.label === column && (
                                  <Chip size="small" label="Label" color="info" />
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                        )) : 
                        <TableCell>No valid column data</TableCell>
                      }
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {samples.map((row, index) => (
                      <TableRow 
                        key={index}
                        sx={{
                          '&:nth-of-type(odd)': {
                            backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          },
                          '& td': {
                            borderBottom: '1px solid rgba(224, 224, 224, 0.5)'
                          }
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        {row && typeof row === 'object' ? 
                          Object.entries(row).map(([key, value]) => {
                            // Format value based on type
                            let displayValue;
                            let truncated = false;
                            const isLongValue = value !== undefined && value !== null && 
                              String(value).length > 100;
                            
                            if (value === undefined || value === null) {
                              displayValue = <span style={{ color: '#999' }}>(empty)</span>;
                            } else if (typeof value === 'object') {
                              // Handle array or object type
                              try {
                                const stringValue = JSON.stringify(value);
                                truncated = stringValue.length > 100;
                                displayValue = stringValue.substring(0, 100) + (truncated ? '...' : '');
                              } catch (e) {
                                displayValue = "[Complex Object]";
                              }
                            } else if (typeof value === 'number') {
                              // Format numbers
                              displayValue = value;
                            } else if (typeof value === 'boolean') {
                              // Format booleans
                              displayValue = value ? "true" : "false";
                            } else {
                              // Handle string
                              const stringValue = String(value);
                              truncated = stringValue.length > 100;
                              displayValue = stringValue.substring(0, 100) + (truncated ? '...' : '');
                            }
                            
                            // Special styling for cells with specific types
                            const cellStyle = {
                              maxWidth: 180,
                              minWidth: 100,
                              padding: '8px',
                              verticalAlign: 'top',
                              backgroundColor: truncated ? 'rgba(0, 0, 0, 0.01)' : 'inherit',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              }
                            };
                            
                            return (
                              <TableCell 
                                key={key} 
                                sx={cellStyle}
                              >
                                <Tooltip title={truncated ? 'Click to view full content' : ''}>
                                  <Box 
                                    sx={{ 
                                      cursor: truncated ? 'pointer' : 'default',
                                      fontFamily: 'monospace',
                                      fontSize: '0.75rem',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 4,
                                      WebkitBoxOrient: 'vertical',
                                      maxHeight: '80px',
                                      border: truncated ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none',
                                      borderRadius: 1,
                                      padding: truncated ? '4px' : 0,
                                      backgroundColor: truncated ? 'rgba(0, 0, 0, 0.01)' : 'inherit'
                                    }}
                                    onClick={() => {
                                      if (truncated) {
                                        // Show full content in an alert or modal
                                        alert(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
                                      }
                                    }}
                                  >
                                    {displayValue}
                                  </Box>
                                </Tooltip>
                              </TableCell>
                            );
                          }) : 
                          <TableCell>Invalid row data</TableCell>
                        }
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Showing {samples.length} sample rows from the dataset. Click on truncated values to view the full content.
              </Alert>
            </>
          ) : (
            <Alert severity="info">
              No data samples available. This could be because the dataset is empty or the API couldn't retrieve samples.
              <Button variant="text" onClick={handleRefreshSamples} sx={{ ml: 2 }}>Try Again</Button>
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default DatasetDetail; 