import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormGroup,
  Select,
  InputLabel,
  Checkbox,
  Container,
  Alert,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BarChartIcon from '@mui/icons-material/BarChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CodeIcon from '@mui/icons-material/Code';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningIcon from '@mui/icons-material/Warning';
import InsightsIcon from '@mui/icons-material/Insights';
import BugReportIcon from '@mui/icons-material/BugReport';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAppContext } from '../context/AppContext';
import ComplianceScoreGauge from '../components/common/ComplianceScoreGauge';
import StatusChip from '../components/common/StatusChip';
import SeverityChip from '../components/common/SeverityChip';
import CategoryChip from '../components/common/CategoryChip.jsx';
import ProgressBar from '../components/common/ProgressBar';
import TestResultTable from '../components/widgets/TestResultTable';

// Color mapping for categories
const CATEGORY_COLORS = {
  'security': '#e53935', // red
  'bias': '#7b1fa2', // purple
  'toxicity': '#d32f2f', // dark red
  'hallucination': '#1565c0', // blue
  'robustness': '#2e7d32', // green
  'ethics': '#6a1b9a', // deep purple
  'performance': '#0277bd', // light blue
  'quality': '#00695c', // teal
  'privacy': '#283593', // indigo
  'safety': '#c62828', // darker red
  'compliance': '#4527a0' // deep purple
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const { testResults, complianceScores, selectedTests } = useAppContext();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [categoryExpanded, setCategoryExpanded] = useState({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [exportType, setExportType] = useState('Full Compliance Report');
  const [exportOptions, setExportOptions] = useState({
    testDetails: true,
    remediationSuggestions: true,
    screenshots: false,
    apiLogs: false,
    configSettings: true
  });
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const toggleCategoryExpanded = (category) => {
    setCategoryExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const openExportDialog = () => {
    setExportDialogOpen(true);
  };
  
  const closeExportDialog = () => {
    setExportDialogOpen(false);
  };
  
  const handleGenerateReport = () => {
    setExporting(true);
    
    // Simulate export progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setExportProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setExporting(false);
          setExportProgress(0);
          closeExportDialog();
        }, 500);
      }
    }, 300);
  };
  
  const handleExportOptionChange = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };
  
  // Calculate overall compliance score
  const calculateOverallScore = () => {
    if (!complianceScores || typeof complianceScores !== 'object') return 0;
    
    const scores = Object.values(complianceScores);
    if (scores.length === 0) return 0;
    
    const totalPassed = scores.reduce((sum, score) => sum + (score?.passed || 0), 0);
    const totalTests = scores.reduce((sum, score) => sum + (score?.total || 0), 0);
    
    return totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  };
  
  const overallScore = calculateOverallScore();
  
  // Check if we have results to display
  const hasResults = testResults && typeof testResults === 'object' && Object.keys(testResults).length > 0;
  
  // Statistics
  const getStats = () => {
    if (!hasResults) return { total: 0, passed: 0, failed: 0 };
    
    const total = Object.keys(testResults).length;
    const passed = Object.values(testResults).filter(result => result?.result?.pass).length;
    
    return {
      total,
      passed,
      failed: total - passed
    };
  };
  
  const stats = getStats();
  
  // Summary Tab Content
  const renderSummaryTab = () => {
    if (!hasResults) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No test results available. Please run tests first.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/run-tests')}
            sx={{ mt: 2 }}
          >
            Go to Run Tests
          </Button>
        </Box>
      );
    }
    
    return (
      <Box>
        {/* Overall metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Total Tests
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="success.main">
                  Tests Passed
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.passed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <Card sx={{ bgcolor: 'rgba(244, 67, 54, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="error.main">
                  Tests Failed
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.failed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Overall compliance gauge */}
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Overall Compliance Score
          </Typography>
          <ComplianceScoreGauge 
            score={overallScore} 
            size={150}
            sx={{ mb: 2 }}
          />
          <Typography>
            {overallScore >= 80 ? 'Excellent compliance level' : 
             overallScore >= 50 ? 'Moderate compliance level - improvements needed' : 
             'Low compliance level - significant improvements required'}
          </Typography>
          
          {stats.failed > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, color: 'error.contrastText' }}>
              <Typography variant="subtitle2">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {stats.failed} compliance issues need to be addressed
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Category scores */}
        <Typography variant="h6" gutterBottom>
          Compliance by Category
        </Typography>
        
        <Grid container spacing={3}>
          {Object.entries(complianceScores).map(([category, scores]) => {
            const categoryScore = scores.total > 0 ? (scores.passed / scores.total) * 100 : 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: CATEGORY_COLORS[category] || '#757575',
                          mr: 1 
                        }} 
                      />
                      <Typography variant="subtitle1">
                        {category}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Passed: {scores.passed}/{scores.total}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: categoryScore >= 80 ? 'success.main' : 
                                 categoryScore >= 50 ? 'warning.main' : 
                                 'error.main'
                        }}
                      >
                        {categoryScore.toFixed(1)}%
                      </Typography>
                    </Box>
                    <ProgressBar value={categoryScore} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        
        {/* Key insights */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <InsightsIcon sx={{ mr: 1 }} />
            Key Insights
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {/* Dynamic insights based on results */}
            <Grid item xs={12}>
              <Typography variant="body1">
                {overallScore >= 80 ? 
                  '• Your model demonstrates strong compliance across most categories.' : 
                  overallScore >= 50 ?
                  '• Your model meets basic compliance requirements but needs improvements in specific areas.' :
                  '• Your model has significant compliance gaps that need immediate attention.'}
              </Typography>
            </Grid>
            
            {/* Find the lowest scoring category */}
            {Object.entries(complianceScores).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  {(() => {
                    const lowestCategory = Object.entries(complianceScores).reduce(
                      (lowest, [category, scores]) => {
                        const score = scores.total > 0 ? scores.passed / scores.total : 0;
                        if (!lowest || score < lowest.score) {
                          return { category, score };
                        }
                        return lowest;
                      },
                      null
                    );
                    
                    if (lowestCategory) {
                      const score = lowestCategory.score * 100;
                      return `• The "${lowestCategory.category}" category has the lowest compliance score (${score.toFixed(1)}%) and should be prioritized for improvements.`;
                    }
                    return '';
                  })()}
                </Typography>
              </Grid>
            )}
            
            {/* Critical failures */}
            {Object.values(testResults).some(item => 
              !item.result.pass && item.test.severity === 'critical'
            ) && (
              <Grid item xs={12}>
                <Typography variant="body1" color="error.main">
                  • Critical compliance issues were detected that should be addressed immediately.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>
    );
  };
  
  // Results by Category Tab Content
  const renderCategoryTab = () => {
    if (!hasResults) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No test results available. Please run tests first.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/run-tests')}
            sx={{ mt: 2 }}
          >
            Go to Run Tests
          </Button>
        </Box>
      );
    }
    
    // Group results by category
    const resultsByCategory = Object.values(testResults).reduce((acc, item) => {
      const category = item.test.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
    
    return (
      <Box>
        {Object.entries(resultsByCategory).map(([category, results]) => {
          // Calculate category stats
          const totalInCategory = results.length;
          const passedInCategory = results.filter(item => item.result.pass).length;
          const categoryScore = (passedInCategory / totalInCategory) * 100;
          
          return (
            <Accordion 
              key={category} 
              expanded={categoryExpanded[category]} 
              onChange={() => toggleCategoryExpanded(category)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.03)',
                  borderLeft: `4px solid ${CATEGORY_COLORS[category] || '#757575'}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Typography variant="subtitle1">{category}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`${passedInCategory}/${totalInCategory} passed`} 
                      size="small" 
                      sx={{ mr: 2 }}
                    />
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: categoryScore >= 80 ? 'success.main' : 
                               categoryScore >= 50 ? 'warning.main' : 
                               'error.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {categoryScore.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TestResultTable 
                  results={results.reduce((acc, item) => {
                    acc[item.test.id] = item;
                    return acc;
                  }, {})}
                />
                
                {/* Failed Tests Summary */}
                {results.some(item => !item.result.pass) && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Issues requiring attention:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {results
                        .filter(item => !item.result.pass)
                        .map((item, index) => (
                          <Box key={item.test.id} sx={{ mb: index < results.filter(item => !item.result.pass).length - 1 ? 2 : 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                              <BugReportIcon sx={{ mr: 1, fontSize: 18, color: 'error.main' }} />
                              {item.test.name} (<SeverityChip severity={item.test.severity} />)
                            </Typography>
                            {item.result.recommendations && item.result.recommendations.length > 0 && (
                              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, pl: 4 }}>
                                Recommendation: {item.result.recommendations[0]}
                              </Typography>
                            )}
                            {index < results.filter(item => !item.result.pass).length - 1 && (
                              <Divider sx={{ my: 1 }} />
                            )}
                          </Box>
                        ))}
                    </Paper>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };
  
  // Detailed Results Tab Content
  const renderDetailedTab = () => {
    if (!hasResults) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No test results available. Please run tests first.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/run-tests')}
            sx={{ mt: 2 }}
          >
            Go to Run Tests
          </Button>
        </Box>
      );
    }
    
    return (
      <Box>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter Results
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {Object.keys(CATEGORY_COLORS).map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="passed">Passed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filterSeverity}
                  label="Severity"
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
        
        <TestResultTable 
          results={testResults}
          filters={{
            category: filterCategory,
            status: filterStatus,
            severity: filterSeverity
          }}
        />
        
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <BarChartIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <FileCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copy Results</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <DescriptionIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Generate Report</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  };
  
  // Export Options Tab Content
  const renderExportTab = () => {
    const exportFormats = ['PDF', 'HTML', 'JSON', 'CSV'];
    const reportTypes = [
      'Full Compliance Report', 
      'Executive Summary', 
      'Technical Details', 
      'Regulatory Evidence'
    ];
    
    return (
      <Box>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Export Report
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={exportType}
                  label="Report Type"
                  onChange={(e) => setExportType(e.target.value)}
                >
                  {reportTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={exportFormat}
                  label="Format"
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  {exportFormats.map(format => (
                    <MenuItem key={format} value={format}>{format}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Include in Report
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={exportOptions.testDetails} 
                      onChange={() => handleExportOptionChange('testDetails')} 
                    />
                  }
                  label="Test Details"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={exportOptions.remediationSuggestions} 
                      onChange={() => handleExportOptionChange('remediationSuggestions')} 
                    />
                  }
                  label="Remediation Suggestions"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={exportOptions.screenshots} 
                      onChange={() => handleExportOptionChange('screenshots')} 
                    />
                  }
                  label="Screenshots"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={exportOptions.apiLogs} 
                      onChange={() => handleExportOptionChange('apiLogs')} 
                    />
                  }
                  label="API Logs"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={exportOptions.configSettings} 
                      onChange={() => handleExportOptionChange('configSettings')} 
                    />
                  }
                  label="Configuration Settings"
                />
              </FormGroup>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={exportFormat === 'PDF' ? <PictureAsPdfIcon /> : <GetAppIcon />}
              onClick={openExportDialog}
              disabled={!hasResults}
              sx={{ minWidth: 200 }}
            >
              Generate Report
            </Button>
          </Box>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Available Reports
          </Typography>
          
          {!hasResults ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="textSecondary">
                No test results available to generate reports.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/run-tests')}
                sx={{ mt: 2 }}
              >
                Go to Run Tests
              </Button>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Report Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Format</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>AI Compliance Report</td>
                    <td style={{ padding: '12px 16px' }}>Full Compliance Report</td>
                    <td style={{ padding: '12px 16px' }}>PDF</td>
                    <td style={{ padding: '12px 16px' }}>{new Date().toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button
                        startIcon={<GetAppIcon />}
                        size="small"
                        variant="outlined"
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>Executive Summary</td>
                    <td style={{ padding: '12px 16px' }}>Executive Summary</td>
                    <td style={{ padding: '12px 16px' }}>PDF</td>
                    <td style={{ padding: '12px 16px' }}>{new Date().toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button
                        startIcon={<GetAppIcon />}
                        size="small"
                        variant="outlined"
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>Technical Details</td>
                    <td style={{ padding: '12px 16px' }}>Technical Details</td>
                    <td style={{ padding: '12px 16px' }}>JSON</td>
                    <td style={{ padding: '12px 16px' }}>{new Date().toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button
                        startIcon={<GetAppIcon />}
                        size="small"
                        variant="outlined"
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          )}
        </Paper>
        
        {/* Export Dialog */}
        <Dialog
          open={exportDialogOpen}
          onClose={!exporting ? closeExportDialog : undefined}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Generating {exportType}
          </DialogTitle>
          <DialogContent dividers>
            {exporting ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>
                  Generating report... {exportProgress}%
                </Typography>
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Box sx={{ 
                    width: '100%', 
                    height: 10, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      width: `${exportProgress}%`, 
                      height: '100%', 
                      bgcolor: 'primary.main',
                      transition: 'width 0.3s ease-in-out'
                    }} />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  You are about to generate:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body1">
                    • <strong>Report Type:</strong> {exportType}
                  </Typography>
                  <Typography variant="body1">
                    • <strong>Format:</strong> {exportFormat}
                  </Typography>
                  <Typography variant="body1">
                    • <strong>Includes:</strong> {Object.entries(exportOptions)
                      .filter(([_, value]) => value)
                      .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim())
                      .join(', ')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  This report will contain compliance results for your model, providing detailed insights into the test outcomes.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {!exporting && <Button onClick={closeExportDialog}>Cancel</Button>}
            {!exporting && (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleGenerateReport}
                startIcon={exportFormat === 'PDF' ? <PictureAsPdfIcon /> : <GetAppIcon />}
              >
                Generate
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    );
  };
  
  // If no tests selected, show warning
  if (!selectedTests || selectedTests.length === 0) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Compliance Results Dashboard
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          No tests have been selected yet. Please configure and run tests to see results.
        </Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/test-config')}
        >
          Go to Test Configuration
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4">
          Compliance Results Dashboard
        </Typography>
        
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/run-tests')}
            startIcon={<RestartAltIcon />}
            sx={{ mr: 1 }}
          >
            Run Tests Again
          </Button>
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            onClick={openExportDialog}
            disabled={!hasResults}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Summary" id="tab-0" />
          <Tab label="Results by Category" id="tab-1" />
          <Tab label="Detailed Results" id="tab-2" />
          <Tab label="Export Report" id="tab-3" />
        </Tabs>
      </Paper>
      
      <Box role="tabpanel" hidden={currentTab !== 0} id="tabpanel-0">
        {currentTab === 0 && renderSummaryTab()}
      </Box>
      
      <Box role="tabpanel" hidden={currentTab !== 1} id="tabpanel-1">
        {currentTab === 1 && renderCategoryTab()}
      </Box>
      
      <Box role="tabpanel" hidden={currentTab !== 2} id="tabpanel-2">
        {currentTab === 2 && renderDetailedTab()}
      </Box>
      
      <Box role="tabpanel" hidden={currentTab !== 3} id="tabpanel-3">
        {currentTab === 3 && renderExportTab()}
      </Box>
    </Container>
  );
};

export default ResultsPage;