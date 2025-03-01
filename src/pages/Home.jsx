import React from 'react';
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
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAppContext } from '../context/AppContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { modelConfigured } = useAppContext();

  const frameworks = [
    { name: "GDPR", description: "European data protection regulation" },
    { name: "CCPA", description: "California Consumer Privacy Act" },
    { name: "EU AI Act", description: "Proposed European regulation for AI systems" },
    { name: "NIST AI RMF", description: "NIST AI Risk Management Framework" },
    { name: "ISO/IEC 42001", description: "AI management system standard" },
    { name: "HIPAA", description: "Health Insurance Portability and Accountability Act" },
  ];

  const stats = [
    { label: "Total Tests Available", value: "400+" },
    { label: "Supported Model Types", value: "50" },
    { label: "Compliance Frameworks", value: "12" },
    { label: "Avg. Testing Time", value: "8 min" },
  ];

  const handleGetStarted = () => {
    if (modelConfigured) {
      navigate('/test-config');
    } else {
      navigate('/model-config');
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box sx={{ 
        mb: 6, 
        mt: 4, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
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
          }}
        >
          AI Compliance Testing Platform
        </Typography>
        <Typography 
          variant="h6" 
          color="textSecondary" 
          sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}
        >
          Ensure your AI models meet regulatory requirements and ethical standards with our comprehensive testing suite.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          endIcon={<ArrowForwardIcon />}
          onClick={handleGetStarted}
          sx={{ borderRadius: 28, px: 4, py: 1.2 }}
        >
          {modelConfigured ? 'Continue Testing' : 'Get Started'}
        </Button>
      </Box>

      {/* How it works section */}
      <Box id="how-it-works" sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
          How it works
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mr: 2, 
              fontWeight: 'bold' 
            }}>
              1
            </Box>
            <Typography variant="h6">Configure your model details</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mr: 2, 
              fontWeight: 'bold' 
            }}>
              2
            </Box>
            <Typography variant="h6">Select relevant compliance tests</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mr: 2, 
              fontWeight: 'bold' 
            }}>
              3
            </Box>
            <Typography variant="h6">Run tests and review results</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mr: 2, 
              fontWeight: 'bold' 
            }}>
              4
            </Box>
            <Typography variant="h6">Generate compliance reports</Typography>
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              sx={{ borderRadius: 2 }}
              onClick={() => navigate('/model-config')}
            >
              Configure Your Model
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Key Features */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
          Key Features
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
              },
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
                  <Typography variant="h6" component="h3">
                    Comprehensive Testing
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Test your AI models across multiple dimensions including fairness, robustness, safety, and technical compliance with regulatory standards.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
              },
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <VerifiedUserIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
                  <Typography variant="h6" component="h3">
                    Regulatory Compliance
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Ensure your AI solutions comply with global regulations like GDPR, CCPA, EU AI Act, and industry-specific frameworks.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
              },
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BarChartIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
                  <Typography variant="h6" component="h3">
                    Detailed Analytics
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Get in-depth insights about your model's performance across various test dimensions with visualizations and scoring metrics.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
              },
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DescriptionIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
                  <Typography variant="h6" component="h3">
                    Audit-Ready Reports
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Generate comprehensive compliance reports suitable for regulatory audits and stakeholder review.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Compliance Frameworks */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
          Supported Compliance Frameworks
        </Typography>
        <Grid container spacing={3}>
          {frameworks.map((framework, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                p: 2, 
                height: '100%',
                bgcolor: 'rgba(63, 81, 181, 0.04)',
              }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  {framework.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {framework.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Platform Statistics */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
          Platform Statistics
        </Typography>
        <Grid container spacing={3}>
          {stats.map((stat, index) => (
            <Grid item xs={6} sm={3} key={index}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                color: 'text.secondary',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'white',
              }} elevation={2}>
                <Typography variant="h3" color="primary" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2">{stat.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* CTA Section */}
      <Box 
        sx={{ 
          mb: 6, 
          p: 4, 
          borderRadius: 2, 
          bgcolor: 'primary.main', 
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Ready to ensure your AI models are compliant?
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
          Start testing your models today and get comprehensive compliance reports.
        </Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          size="large"
          onClick={handleGetStarted}
        >
          {modelConfigured ? 'Continue Testing' : 'Get Started Now'}
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;