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
import { getModelTestResults, deleteModelConfig } from '../services/modelStorageService';
import { useHotkeys } from 'react-hotkeys-hook';
import DatasetCard from '../components/cards/DatasetCard';
import AddDatasetCard from '../components/cards/AddDatasetCard';
const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

const DataPage = () => {
  const navigate = useNavigate();
  const { modelConfigured } = useAppContext();
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [groupBy, setGroupBy] = useState('none');
  const [viewMode, setViewMode] = useState('grid');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [savedConfigs, setSavedConfigs] = useState([]);

  const fetch_models = () => {
    fetch(`${API_BASE_URL}/api/datasets/get_datasets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(res => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then(data => {
        setSavedConfigs(data);
        setLoading(false);
      })
  }


  useEffect(() => {
    fetch_models()
  }, []); // empty dependency array = run once on mount

  const handleDeleteConfig = (config) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteModelConfig(selectedConfig.model_id);
    setDeleteDialogOpen(false);
    setSelectedConfig(null);
    fetch_models();
    showSnackbar('Model configuration deleted successfully');
  };

  const handleEditConfig = (config) => {
    // Make sure we're passing the normalized config with both old and new field names
    navigate(`/dataset-config/${config.dataset_id}`, { state: { config } });
  };

  const handleGetStarted = () => {
    navigate('/dataset-config');
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
    const card = document.querySelector(`[data-model-id="${config.dataset_id}"]`);
    if (card) {
      card.style.transform = 'scale(0.98)';
      setTimeout(() => {
        navigate(`/dataset/${config.dataset_id}`);
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
          Datasets Overview
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
              <MenuItem value="source">Source</MenuItem>
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
          <>
            {groupBy === 'none' ? (
              <Grid container spacing={3}>
                {filteredAndSortedConfigs.map((config) => (
                  <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={config.id}>
                    <DatasetCard
                      config={config}
                      viewMode={viewMode}
                      onEdit={handleEditConfig}
                      onDelete={handleDeleteConfig}
                      onClick={handleEditConfig}
                    />
                  </Grid>
                ))}

                {/* Add New Model Card */}
                <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12}>
                  <AddDatasetCard
                    viewMode={viewMode}
                    onClick={handleGetStarted}
                  />
                </Grid>
              </Grid>
            ) : (
              // Grouped display
              <Box>
                {(() => {
                  // Group configs based on the selected grouping option
                  const groups = {};

                  filteredAndSortedConfigs.forEach(config => {
                    let groupKey;

                    if (groupBy === 'modality') {
                      groupKey = config.modality || config.modelCategory || 'Unknown';
                    } else if (groupBy === 'type') {
                      groupKey = config.sub_type || config.modelType || 'Unknown';
                    } else if (groupBy === 'source') {
                      groupKey = config.source || 'Unknown';
                      // Capitalize first letter for display
                      groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
                    }

                    if (!groups[groupKey]) {
                      groups[groupKey] = [];
                    }

                    groups[groupKey].push(config);
                  });

                  // Sort group keys alphabetically
                  const sortedGroupKeys = Object.keys(groups).sort();

                  return sortedGroupKeys.map(groupKey => (
                    <Box key={groupKey} sx={{ mb: 4 }}>
                      <Paper
                        sx={{
                          boxShadow: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 2,
                          mb: 2,
                          bgcolor: theme => theme.palette.background.neutral || '#edf2f7',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            fontWeight: 'medium',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          {groupBy === 'modality' && (
                            <Box
                              component="span"
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: 'secondary.main',
                                color: 'secondary.contrastText',
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {groupKey}
                            </Box>
                          )}

                          {groupBy === 'type' && (
                            <Box
                              component="span"
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {groupKey}
                            </Box>
                          )}

                          {groupBy === 'source' && (
                            <Box
                              component="span"
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: 'info.main',
                                color: 'info.contrastText',
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {groupKey}
                            </Box>
                          )}
                          <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                            {groups[groupKey].length} {groups[groupKey].length === 1 ? 'Model' : 'Models'}
                          </Typography>
                        </Typography>
                      </Paper>

                      <Grid container spacing={3}>
                        {groups[groupKey].map(config => (
                          <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={config.id}>
                            <DatasetCard
                              config={config}
                              viewMode={viewMode}
                              onEdit={handleEditConfig}
                              onDelete={handleDeleteConfig}
                              onClick={() => handleCardClick(config)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ));
                })()}

                {/* Add New Model Card - Always at the bottom when grouped */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12}>
                    <AddDatasetCard
                      viewMode={viewMode}
                      onClick={handleGetStarted}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
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
        PaperProps={{
          sx: {
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
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

export default DataPage;