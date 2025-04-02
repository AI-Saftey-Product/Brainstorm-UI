import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Typography, Box, Paper, Button } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PageLayout from '../components/layout/PageLayout';
import Section from '../components/layout/Section';
import ModelConfigCard from '../components/cards/ModelConfigCard';
import TestRunHistory from '../components/widgets/TestRunHistory';
import { useAppContext } from '../context/AppContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { modelConfigured, modelConfig } = useAppContext();
  
  // Add the TestRunHistory component to the dashboard
  return (
    <PageLayout>
      <Section title="Model Compliance Dashboard">
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, height: '100%', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" gutterBottom>
                Welcome to Brainstorm
              </Typography>
              <Typography variant="body1" paragraph>
                Use this platform to evaluate and improve your AI model's compliance with safety, bias, and performance standards.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 4, mt: 3 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/configure')}
                  startIcon={<CategoryIcon />}
                >
                  {modelConfigured ? 'Update Model Configuration' : 'Configure Model'}
                </Button>
                
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={() => navigate('/tests')}
                  startIcon={<CheckCircleIcon />}
                  disabled={!modelConfigured}
                >
                  Run Compliance Tests
                </Button>
              </Box>
              
              {modelConfigured ? (
                <ModelConfigCard config={modelConfig} />
              ) : (
                <Paper 
                  sx={{ 
                    p: 3, 
                    bgcolor: 'warning.light', 
                    color: 'warning.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'warning.main'
                  }}
                >
                  <WarningIcon />
                  <Typography>
                    No model configured. Configure your model to start running compliance tests.
                  </Typography>
                </Paper>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <TestRunHistory limit={5} />
          </Grid>
        </Grid>
      </Section>
    </PageLayout>
  );
};

export default Dashboard; 