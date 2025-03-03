import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Divider,
  Container,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAppContext } from '../context/AppContext';
import { getSavedModelConfigs, getModelTestResults, deleteModelConfig } from '../services/modelStorageService';

const HomePage = () => {
  const navigate = useNavigate();
  const { modelConfigured } = useAppContext();
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = () => {
    const configs = getSavedModelConfigs();
    const configsWithResults = configs.map(config => {
      const testResults = getModelTestResults(config.id);
      return {
        ...config,
        testResults,
        lastTestRun: testResults.length > 0 ? 
          testResults[testResults.length - 1].timestamp : null
      };
    });
    setSavedConfigs(configsWithResults);
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
    }
  };

  const handleEditConfig = (config) => {
    navigate('/model-config', { state: { config } });
  };

  const handleGetStarted = () => {
    navigate('/model-config');
  };

  if (savedConfigs.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box 
          sx={{ 
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #3f51b5 30%, #8561c5 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            AI Safety Testing Platform
          </Typography>
          
          <Paper 
            elevation={3}
            sx={{ 
              p: 4, 
              borderRadius: 2,
              textAlign: 'center',
              maxWidth: 400,
              width: '100%'
            }}
          >
            <Typography variant="h5" gutterBottom>
              Welcome!
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Configure your first model to begin testing for compliance and safety standards.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleGetStarted}
              fullWidth
            >
              Configure Your First Model
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #3f51b5 30%, #8561c5 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Model Configurations
          </Typography>
          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={handleGetStarted}
          >
            Add New Model
          </Button>
        </Box>

        <Grid container spacing={3}>
          {savedConfigs.map((config) => (
            <Grid item xs={12} md={6} key={config.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => navigate(`/model/${config.id}`)}
              >
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {config.modelName}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Type: {config.modelType}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Category: {config.modelCategory}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Model ID: {config.modelId}
                    </Typography>
                  </Box>

                  {/* Test Results Summary */}
                  {config.testResults.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Latest Test Results
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Last Run: {new Date(config.lastTestRun).toLocaleDateString()}
                        </Typography>
                        {config.testResults[config.testResults.length - 1].results && (
                          <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="body2" color="textSecondary">
                                Overall Compliance:
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: theme => {
                                    const score = config.testResults[config.testResults.length - 1].results.overallScore;
                                    return score >= 80 ? theme.palette.success.main :
                                           score >= 50 ? theme.palette.warning.main :
                                           theme.palette.error.main;
                                  }
                                }}
                              >
                                {config.testResults[config.testResults.length - 1].results.overallScore}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={config.testResults[config.testResults.length - 1].results.overallScore}
                              sx={{ 
                                mt: 1,
                                height: 6,
                                borderRadius: 1,
                                bgcolor: 'rgba(0,0,0,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 1,
                                }
                              }}
                            />
                          </>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    mt: 'auto',
                    pt: 2
                  }}
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking buttons
                  >
                    <Tooltip title="Delete Configuration">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfig(config);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Configuration">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditConfig(config);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {config.testResults.length > 0 && (
                      <Tooltip title="View Test History">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/model/${config.id}`);
                          }}
                        >
                          <TimelineIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Configuration</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the configuration for "{selectedConfig?.modelName}"? 
            This will also delete all associated test results.
          </Typography>
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