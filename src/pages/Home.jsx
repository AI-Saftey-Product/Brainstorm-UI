import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Container,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Snackbar,
} from '@mui/material';
import { Search, Grid as GridIcon, List } from 'lucide-react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAppContext } from '../context/AppContext';
import { getSavedModelConfigs, getModelTestResults, deleteModelConfig } from '../services/modelStorageService';
import { useHotkeys } from 'react-hotkeys-hook';
import ModelCard from '../components/cards/ModelCard';
import AddModelCard from '../components/cards/AddModelCard';

const HomePage = () => {
  const navigate = useNavigate();
  const { modelConfigured } = useAppContext();
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [groupBy, setGroupBy] = useState('none');
  const [viewMode, setViewMode] = useState('grid');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = () => {
    const configs = getSavedModelConfigs();
    const configsWithResults = configs.map(config => {
      const testResults = getModelTestResults(config.id);
      
      // Normalize config to ensure it has both old and new field names
      return {
        ...config,
        // Ensure both old and new field names are available
        name: config.name || config.modelName || 'Unnamed Model',
        modelName: config.name || config.modelName || 'Unnamed Model',
        
        modality: config.modality || config.modelCategory || 'NLP',
        modelCategory: config.modality || config.modelCategory || 'NLP',
        
        sub_type: config.sub_type || config.modelType || '',
        modelType: config.sub_type || config.modelType || '',
        
        model_id: config.model_id || config.modelId || config.selectedModel || '',
        modelId: config.model_id || config.modelId || config.selectedModel || '',
        selectedModel: config.model_id || config.modelId || config.selectedModel || '',
        
        source: config.source || 'huggingface',
        
        api_key: config.api_key || config.apiKey || '',
        apiKey: config.api_key || config.apiKey || '',
        
        testResults,
        lastTestRun: testResults.length > 0 ? 
          testResults[testResults.length - 1].timestamp : null
      };
    });
    setSavedConfigs(configsWithResults);
    setLoading(false);
  };

  const handleDeleteConfig = async (config) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedConfig) {
      await deleteModelConfig(selectedConfig.id);
      loadSavedConfigs();
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
      showSnackbar('Model configuration deleted successfully');
    }
  };

  const handleEditConfig = (config) => {
    // Make sure we're passing the normalized config with both old and new field names
    navigate('/model-config', { state: { config } });
  };

  const handleGetStarted = () => {
    navigate('/model-config');
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSort = (event) => {
    setSortBy(event.target.value);
  };

  const handleGroup = (event) => {
    setGroupBy(event.target.value);
  };

  const handleViewMode = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter and sort configs
  const filteredAndSortedConfigs = savedConfigs
    .filter(config => {
      const searchLower = searchTerm.toLowerCase();
      return (
        config.name.toLowerCase().includes(searchLower) ||
        config.sub_type.toLowerCase().includes(searchLower) ||
        config.modality.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.lastModified) - new Date(a.lastModified);
        case 'tests':
          return (b.testResults?.length || 0) - (a.testResults?.length || 0);
        default:
          return 0;
      }
    });

  // Keyboard shortcuts
  useHotkeys('ctrl+f', (e) => {
    e.preventDefault();
    document.querySelector('input[placeholder="Search models..."]')?.focus();
  });

  useHotkeys('ctrl+g', (e) => {
    e.preventDefault();
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  });

  useHotkeys('ctrl+n', (e) => {
    e.preventDefault();
    handleGetStarted();
  });

  // Enhanced navigation handler with animation
  const handleCardClick = useCallback((config) => {
    const card = document.querySelector(`[data-model-id="${config.id}"]`);
    if (card) {
      card.style.transform = 'scale(0.98)';
      setTimeout(() => {
        navigate(`/model/${config.id}`);
      }, 150);
    }
  }, [navigate]);

  return (
    <Container maxWidth="lg">
      <Box 
        sx={{ 
          minHeight: '100vh',
          width: '100%',
          bgcolor: '#F8F9FA',
          py: 4
        }}
      >
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ mb: 4 }}
        >
          Model Overview
        </Typography>

        {/* Controls with keyboard shortcut hints */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tooltip title="Search (Ctrl+F)">
            <TextField
              placeholder="Search models..."
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Tooltip>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} onChange={handleSort} label="Sort by">
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="date">Last Modified</MenuItem>
              <MenuItem value="tests">Test Count</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Group by</InputLabel>
            <Select value={groupBy} onChange={handleGroup} label="Group by">
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="modality">Modality</MenuItem>
              <MenuItem value="type">Type</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Toggle View (Ctrl+G)">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewMode}
              size="small"
            >
              <ToggleButton value="grid" aria-label="grid view">
                <GridIcon size={20} />
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <List size={20} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Box>

        {/* Loading State */}
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((skeleton) => (
              <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={skeleton}>
                <Skeleton 
                  variant="rectangular" 
                  height={viewMode === 'grid' ? 200 : 100} 
                  sx={{ 
                    borderRadius: 1,
                    animation: 'pulse 1.5s ease-in-out 0.5s infinite'
                  }}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {filteredAndSortedConfigs.map((config) => (
              <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={config.id}>
                <ModelCard
                  config={config}
                  viewMode={viewMode}
                  onEdit={handleEditConfig}
                  onDelete={handleDeleteConfig}
                  onClick={() => handleCardClick(config)}
                />
              </Grid>
            ))}
            
            {/* Add New Model Card */}
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12}>
              <AddModelCard
                viewMode={viewMode}
                onClick={handleGetStarted}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Model Configuration</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this model configuration?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage;