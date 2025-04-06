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
  Pagination
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
} from 'lucide-react';
import { getDatasetConfigById, deleteDatasetConfig } from '../services/datasetStorageService';
import { getDatasetSample, getDatasetInfo } from '../services/huggingFaceDatasetService';

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
  
  // Load dataset details
  useEffect(() => {
    loadDataset();
  }, [datasetId]);
  
  const loadDataset = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get dataset config from local storage
      const datasetConfig = getDatasetConfigById(datasetId);
      
      if (!datasetConfig) {
        throw new Error('Dataset not found');
      }
      
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
      let sampleData = [];
      
      if (datasetConfig.source === 'huggingface') {
        // For Hugging Face datasets, fetch samples from API
        sampleData = await getDatasetSample(
          datasetConfig.dataset_id,
          datasetConfig.split || 'test',
          sampleSize,
          datasetConfig.api_key
        );
      } else if (datasetConfig.source === 'custom' && datasetConfig.file?.data) {
        // For custom datasets, use the stored data
        const startIdx = (page - 1) * sampleSize;
        sampleData = datasetConfig.file.data.slice(startIdx, startIdx + sampleSize);
      }
      
      setSamples(sampleData);
      setSamplePage(page);
    } catch (err) {
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
      await deleteDatasetConfig(datasetId);
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
        
        {/* Data Samples */}
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
            <Typography variant="h5">Data Samples</Typography>
            <Button 
              startIcon={<RefreshIcon />}
              onClick={handleRefreshSamples}
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
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {samples && samples.length > 0 && samples[0] && typeof samples[0] === 'object' ? 
                        Object.keys(samples[0]).map(column => (
                          <TableCell key={column}>
                            {column}
                            {dataset.column_mapping?.input === column && (
                              <Chip size="small" label="Input" sx={{ ml: 1 }} color="primary" />
                            )}
                            {dataset.column_mapping?.reference === column && (
                              <Chip size="small" label="Reference" sx={{ ml: 1 }} color="secondary" />
                            )}
                            {dataset.column_mapping?.label === column && (
                              <Chip size="small" label="Label" sx={{ ml: 1 }} color="info" />
                            )}
                          </TableCell>
                        )) : 
                        <TableCell>No valid column data</TableCell>
                      }
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {samples.map((row, index) => (
                      <TableRow key={index}>
                        {row && typeof row === 'object' ? 
                          Object.entries(row).map(([key, value]) => (
                            <TableCell 
                              key={key} 
                              sx={{ 
                                maxWidth: 250, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word'
                                }
                              }}
                            >
                              {value === undefined || value === null ? 
                                '(empty)' : 
                                typeof value === 'object' ? 
                                  JSON.stringify(value, null, 2).substring(0, 1000) : 
                                  String(value).substring(0, 1000) + (String(value).length > 1000 ? '...' : '')
                              }
                            </TableCell>
                          )) : 
                          <TableCell>Invalid row data</TableCell>
                        }
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button 
                  onClick={handlePrevPage}
                  disabled={samplePage === 1 || sampleLoading}
                  startIcon={<ChevronLeftIcon />}
                >
                  Previous
                </Button>
                <Typography sx={{ mx: 2, lineHeight: '36px' }}>
                  Page {samplePage}
                </Typography>
                <Button 
                  onClick={handleNextPage}
                  disabled={samples.length < sampleSize || sampleLoading}
                  endIcon={<ChevronRightIcon />}
                >
                  Next
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No data samples available. This could be because the dataset is empty or the API couldn't retrieve samples.
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default DatasetDetail; 