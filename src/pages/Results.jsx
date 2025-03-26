import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  MenuItem,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GetAppIcon from '@mui/icons-material/GetApp';
import WarningIcon from '@mui/icons-material/Warning';
import BugReportIcon from '@mui/icons-material/BugReport';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useAppContext } from '../context/AppContext';
import ComplianceScoreGauge from '../components/common/ComplianceScoreGauge';
import TestResultTable from '../components/widgets/TestResultTable';
import PageLayout from '../components/layout/PageLayout';
import Section from '../components/layout/Section';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedResults, setPinnedResults] = useState([]);
  const [expandAll, setExpandAll] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedRunToCompare, setSelectedRunToCompare] = useState(null);
  const [quickFilters, setQuickFilters] = useState({
    failedOnly: false,
    criticalOnly: false,
    recentOnly: false
  });
  
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
  
  // If no tests selected, show warning
  if (!selectedTests || selectedTests.length === 0) {
      return (
      <PageLayout title="Compliance Results Dashboard">
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
      </PageLayout>
    );
  }

  const pageActions = (
    <>
      <Button
        variant="text"
        onClick={() => navigate('/run-tests')}
        startIcon={<RestartAltIcon />}
      >
        Run Tests
      </Button>
      <Button
        variant="contained"
        startIcon={<GetAppIcon />}
        onClick={openExportDialog}
        disabled={!hasResults}
      >
        Export
      </Button>
    </>
  );

  const handleQuickFilter = (filter) => {
    setQuickFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  const handlePinResult = (resultId) => {
    setPinnedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleCompareRuns = () => {
    setCompareMode(true);
  };
    
    return (
    <PageLayout title="Results Overview" actions={pageActions}>
      {/* Enhanced Search and Filter Bar */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Show only failed tests">
                <Chip
                  label="Failed Tests"
                  color={quickFilters.failedOnly ? "error" : "default"}
                  onClick={() => handleQuickFilter('failedOnly')}
                  icon={<WarningIcon />}
                />
              </Tooltip>
              <Tooltip title="Show only critical severity tests">
                <Chip
                  label="Critical Issues"
                  color={quickFilters.criticalOnly ? "error" : "default"}
                  onClick={() => handleQuickFilter('criticalOnly')}
                  icon={<BugReportIcon />}
                />
              </Tooltip>
              <Tooltip title="Show only recent test runs">
                <Chip
                  label="Recent Tests"
                  color={quickFilters.recentOnly ? "primary" : "default"}
                  onClick={() => handleQuickFilter('recentOnly')}
                />
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<CompareArrowsIcon />}
                onClick={handleCompareRuns}
                size="small"
              >
                Compare Runs
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards with enhanced visuals */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography variant="subtitle2" gutterBottom>
                  Total Tests
                </Typography>
              <Typography variant="h2">
                  {stats.total}
                </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <Paper elevation={0} sx={{ 
              p: 3,
              border: '1px solid',
              borderColor: 'success.light',
              backgroundColor: 'success.lighter',
              height: '100%',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography variant="subtitle2" color="success.dark" gutterBottom>
                  Tests Passed
                </Typography>
              <Typography variant="h2" color="success.dark">
                  {stats.passed}
                </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <Paper elevation={0} sx={{ 
              p: 3,
              border: '1px solid',
              borderColor: 'error.light',
              backgroundColor: 'error.lighter',
              height: '100%',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography variant="subtitle2" color="error.dark" gutterBottom>
                  Tests Failed
                </Typography>
              <Typography variant="h2" color="error.dark">
                  {stats.failed}
                </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Enhanced Compliance Score Section */}
      <Section title="Overall Compliance">
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
          <ComplianceScoreGauge 
            score={overallScore} 
                size={180}
                sx={{ mb: 3 }}
          />
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
            {overallScore >= 80 ? 'Excellent compliance level' : 
             overallScore >= 50 ? 'Moderate compliance level - improvements needed' : 
             'Low compliance level - significant improvements required'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={Object.entries(complianceScores).map(([category, scores]) => ({
                  category,
                  score: scores.total > 0 ? (scores.passed / scores.total) * 100 : 0
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Compliance Score"
                    dataKey="score"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Section>

      {/* Compliance by Category with enhanced visuals */}
      <Section title="Compliance by Category">
        <Grid container spacing={3}>
          {Object.entries(complianceScores).map(([category, scores]) => {
            const categoryScore = scores.total > 0 ? (scores.passed / scores.total) * 100 : 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 2
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: CATEGORY_COLORS[category] || '#757575',
                          mr: 1.5 
                        }} 
                      />
                      <Typography variant="subtitle1">
                        {category}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handlePinResult(category)}
                    >
                      {pinnedResults.includes(category) ? (
                        <BookmarkIcon fontSize="small" color="primary" />
                      ) : (
                        <BookmarkBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    justifyContent: 'space-between',
                    mb: 1.5
                  }}>
                    <Typography variant="body2">
                      {scores.passed}/{scores.total} tests passed
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
                  <Box
                    sx={{
                      height: 4,
                      bgcolor: 'background.neutral',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${categoryScore}%`,
                        bgcolor: categoryScore >= 80 ? 'success.main' : 
                                categoryScore >= 50 ? 'warning.main' : 
                                'error.main',
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Section>

      {/* Test Results Timeline */}
      <Section 
        title="Test Results Timeline"
        action={
          <Button 
            size="small"
            startIcon={<ExpandMoreIcon />}
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
        }
      >
        <Box sx={{ height: 300, mb: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={Object.values(testResults).map(result => ({
              date: new Date(result.timestamp).toLocaleDateString(),
              score: result.overallScore,
              ...Object.fromEntries(
                Object.entries(result.categoryScores || {}).map(([cat, score]) => [
                  cat,
                  score.total > 0 ? (score.passed / score.total) * 100 : 0
                ])
              )
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <RechartsTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                name="Overall Score"
                stroke="#8884d8"
                strokeWidth={2}
              />
              {Object.keys(complianceScores).map((category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  name={category}
                  stroke={CATEGORY_COLORS[category] || `hsl(${index * 45}, 70%, 50%)`}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <TestResultTable 
          results={testResults}
          filters={{
            category: filterCategory,
            status: filterStatus,
            severity: filterSeverity,
            search: searchQuery,
            quickFilters,
          }}
          expandAll={expandAll}
          pinnedResults={pinnedResults}
          onPin={handlePinResult}
        />
      </Section>

      {/* Compare Runs Dialog */}
      <Dialog
        open={compareMode}
        onClose={() => setCompareMode(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Compare Test Runs</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Base Run</InputLabel>
                <Select
                  value={selectedRun || ''}
                  onChange={(e) => setSelectedRun(e.target.value)}
                >
                  {Object.values(testResults).map(result => (
                    <MenuItem key={result.id} value={result.id}>
                      {new Date(result.timestamp).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Compare With</InputLabel>
                <Select
                  value={selectedRunToCompare || ''}
                  onChange={(e) => setSelectedRunToCompare(e.target.value)}
                >
                  {Object.values(testResults).map(result => (
                    <MenuItem key={result.id} value={result.id}>
                      {new Date(result.timestamp).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareMode(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
            disabled={!selectedRun || !selectedRunToCompare}
            onClick={() => {
              // Handle comparison
              setCompareMode(false);
            }}
          >
            Compare
            </Button>
        </DialogActions>
      </Dialog>
        
        {/* Export Dialog */}
        <Dialog
          open={exportDialogOpen}
        onClose={closeExportDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
          <Typography variant="h6">
            Generating {exportType}
          </Typography>
          </DialogTitle>
          <DialogContent dividers>
            {exporting ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                  Generating report... {exportProgress}%
                </Typography>
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Box sx={{ 
                    width: '100%', 
                    height: 10, 
                    borderRadius: 1, 
                  bgcolor: 'background.neutral',
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
                <Typography variant="body1" gutterBottom>
                    • <strong>Report Type:</strong> {exportType}
                  </Typography>
                <Typography variant="body1" gutterBottom>
                    • <strong>Format:</strong> {exportFormat}
                  </Typography>
                  <Typography variant="body1">
                    • <strong>Includes:</strong> {Object.entries(exportOptions)
                      .filter(([_, value]) => value)
                      .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim())
                      .join(', ')}
                  </Typography>
                </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
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
    </PageLayout>
  );
};

export default ResultsPage;