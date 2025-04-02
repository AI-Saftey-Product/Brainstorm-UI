import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Snackbar,
  Alert,
  Container,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudIcon from '@mui/icons-material/Cloud';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import { getSavedDatasetConfigs, deleteDatasetConfig } from '../services/datasetStorageService';

const DatasetCard = ({ dataset, onEdit, onDelete }) => {
  const navigate = useNavigate();
  
  const handleViewDetails = () => {
    navigate(`/dataset/${dataset.id}`);
  };
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ mb: 1 }}>
            {dataset.name}
          </Typography>
          <Chip 
            icon={dataset.source === 'huggingface' ? <CloudIcon /> : <FolderIcon />} 
            label={dataset.source === 'huggingface' ? 'Hugging Face' : 'Custom Upload'}
            size="small"
            color={dataset.source === 'huggingface' ? 'primary' : 'secondary'}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {dataset.description || 'No description provided'}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {dataset.source === 'huggingface' && (
            <Chip 
              label={dataset.dataset_id} 
              size="small" 
              variant="outlined"
            />
          )}
          
          {dataset.source === 'custom' && dataset.file && (
            <Chip 
              label={dataset.file.filename} 
              size="small" 
              variant="outlined"
            />
          )}
          
          <Chip 
            label={`Split: ${dataset.split || 'test'}`} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        {dataset.column_mapping && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Column Mapping
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {dataset.column_mapping.input && (
                <Chip 
                  label={`Input: ${dataset.column_mapping.input}`} 
                  size="small" 
                  color="info"
                />
              )}
              {dataset.column_mapping.reference && (
                <Chip 
                  label={`Reference: ${dataset.column_mapping.reference}`} 
                  size="small" 
                  color="success"
                />
              )}
              {dataset.column_mapping.label && (
                <Chip 
                  label={`Label: ${dataset.column_mapping.label}`} 
                  size="small" 
                  color="warning"
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Created: {new Date(dataset.createdAt).toLocaleDateString()}
        </Typography>
        <Box>
          <Button size="small" onClick={handleViewDetails} color="primary">
            View Details
          </Button>
          <Tooltip title="Edit Dataset">
            <IconButton size="small" onClick={() => onEdit(dataset)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Dataset">
            <IconButton size="small" onClick={() => onDelete(dataset)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

const AddDatasetCard = ({ onClick }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        cursor: 'pointer',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: 'primary.main',
        '&:hover': {
          bgcolor: 'action.hover'
        },
        boxShadow: 'none'
      }}
      onClick={onClick}
    >
      <AddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" align="center" gutterBottom>
        Add New Dataset
      </Typography>
      <Typography variant="body2" align="center" color="text.secondary">
        Configure a HuggingFace dataset or upload your own
      </Typography>
    </Card>
  );
};

const Datasets = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  useEffect(() => {
    loadDatasets();
  }, []);
  
  const loadDatasets = () => {
    setLoading(true);
    try {
      console.log('Loading saved datasets...');
      const savedDatasets = getSavedDatasetConfigs();
      console.log(`Found ${savedDatasets.length} datasets:`, savedDatasets);
      
      if (savedDatasets.length === 0) {
        console.log('No datasets found in localStorage');
      }
      
      setDatasets(savedDatasets);
    } catch (error) {
      console.error('Error loading datasets:', error);
      setSnackbar({
        open: true,
        message: `Error loading datasets: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddDataset = () => {
    navigate('/dataset-config');
  };
  
  const handleEditDataset = (dataset) => {
    navigate('/dataset-config', { state: { config: dataset } });
  };
  
  const handleDeleteDataset = (dataset) => {
    setSelectedDataset(dataset);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (selectedDataset) {
      try {
        await deleteDatasetConfig(selectedDataset.id);
        loadDatasets();
        setSnackbar({
          open: true,
          message: 'Dataset deleted successfully',
          severity: 'success'
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: `Error deleting dataset: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setDeleteDialogOpen(false);
        setSelectedDataset(null);
      }
    }
  };
  
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleSort = (event) => {
    setSortBy(event.target.value);
  };
  
  const handleFilter = (event) => {
    setFilterBy(event.target.value);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Filter, sort and display datasets
  const filteredAndSortedDatasets = datasets
    .filter(dataset => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          dataset.name.toLowerCase().includes(searchLower) ||
          (dataset.description && dataset.description.toLowerCase().includes(searchLower)) ||
          (dataset.dataset_id && dataset.dataset_id.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply source filter
      if (filterBy !== 'all') {
        return dataset.source === filterBy;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'source':
          return a.source.localeCompare(b.source);
        default:
          return 0;
      }
    });
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ mb: 4 }}
        >
          Datasets
        </Typography>
        
        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={handleSearch}
            size="small"
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} onChange={handleSort} label="Sort by">
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="date">Date Added</MenuItem>
              <MenuItem value="source">Source</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by</InputLabel>
            <Select value={filterBy} onChange={handleFilter} label="Filter by">
              <MenuItem value="all">All Sources</MenuItem>
              <MenuItem value="huggingface">Hugging Face</MenuItem>
              <MenuItem value="custom">Custom Upload</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddDataset}
          >
            Add Dataset
          </Button>
        </Box>
        
        {/* Dataset Grid */}
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((skeleton) => (
              <Grid item xs={12} md={6} key={skeleton}>
                <Skeleton 
                  variant="rectangular" 
                  height={200} 
                  sx={{ 
                    borderRadius: 1,
                    animation: 'pulse 1.5s ease-in-out 0.5s infinite'
                  }}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          filteredAndSortedDatasets.length === 0 && !searchTerm ? (
            <Paper sx={{ p: 4, textAlign: 'center', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                No Datasets Configured
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Create your first dataset configuration to use with tests.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddDataset}
              >
                Add Dataset
              </Button>
            </Paper>
          ) : filteredAndSortedDatasets.length === 0 ? (
            <Alert severity="info">No datasets match your search criteria</Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredAndSortedDatasets.map((dataset) => (
                <Grid item xs={12} md={6} key={dataset.id}>
                  <DatasetCard
                    dataset={dataset}
                    onEdit={handleEditDataset}
                    onDelete={handleDeleteDataset}
                  />
                </Grid>
              ))}
              
              <Grid item xs={12} md={6}>
                <AddDatasetCard onClick={handleAddDataset} />
              </Grid>
            </Grid>
          )
        )}
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Dataset</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the dataset "{selectedDataset?.name}"?
          This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Datasets; 