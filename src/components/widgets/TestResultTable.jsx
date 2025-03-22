import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  Divider,
  Tooltip,
  LinearProgress,
  Grid,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningIcon from '@mui/icons-material/Warning';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ComplianceScoreGauge from '../common/ComplianceScoreGauge';
import StatusChip from '../common/StatusChip';
import SeverityChip from '../common/SeverityChip';
import CategoryChip from '../common/CategoryChip.jsx';
import { formatTimestamp } from '../../utils/formatters';

const TestResultRow = ({ 
  item, 
  expandAll, 
  isPinned,
  onPin,
  showDiff = false,
  comparisonData = null 
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(expandAll);
  }, [expandAll]);

  if (!item || !item.test || !item.result) {
    return null;
  }

  const handlePin = (e) => {
    e.stopPropagation();
    onPin(item.test.id);
  };

  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          bgcolor: isPinned ? 'action.selected' : 'inherit',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: 'action.hover',
          }
        }}
      >
        <TableCell padding="checkbox">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>{item.test.name}</Typography>
            <Tooltip title={isPinned ? "Unpin" : "Pin"}>
              <IconButton size="small" onClick={handlePin}>
                {isPinned ? (
                  <BookmarkIcon fontSize="small" color="primary" />
                ) : (
                  <BookmarkBorderIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
        <TableCell>
          <CategoryChip category={item.test.category} />
        </TableCell>
        <TableCell>
          <SeverityChip severity={item.test.severity} />
        </TableCell>
        <TableCell>
          <StatusChip status={item.result.pass ? 'passed' : 'failed'} />
        </TableCell>
        <TableCell align="right">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
            <Typography>
              {(item.result.score * 100).toFixed(1)}%
            </Typography>
            {showDiff && comparisonData && (
              <Chip
                size="small"
                label={`${((item.result.score - comparisonData.score) * 100).toFixed(1)}%`}
                color={item.result.score >= comparisonData.score ? 'success' : 'error'}
                variant="outlined"
              />
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Test Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                  {item.test.description}
                </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Result Details
                </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.result.message}
                  </Typography>
                    {item.result.details && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Additional Information
                      </Typography>
                        <pre style={{ 
                          margin: 0,
                          padding: '8px',
                          background: 'rgba(0,0,0,0.03)',
                          borderRadius: '4px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(item.result.details, null, 2)}
                        </pre>
                </Box>
              )}
                  </Paper>
                </Grid>
              </Grid>
              
              {item.result.metrics && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(item.result.metrics).map(([key, value]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            {key}
                          </Typography>
                          <Typography variant="h6">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </Typography>
                          {showDiff && comparisonData?.metrics?.[key] && (
                      <Chip
                        size="small"
                              label={`${(value - comparisonData.metrics[key]).toFixed(2)}`}
                              color={value >= comparisonData.metrics[key] ? 'success' : 'error'}
                        variant="outlined"
                              sx={{ mt: 1 }}
                      />
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {item.result.remediation && (
                <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Remediation Suggestions
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.result.remediation}
                    </Typography>
                </Paper>
              </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TestResultTable = ({ 
  results = {}, 
  filters = {},
  expandAll = false,
  pinnedResults = [],
  onPin,
  comparisonResults = null
}) => {
  // Ensure results is an object and not null/undefined
  const safeResults = results && typeof results === 'object' ? results : {};
  
  // Apply filters
  const filteredResults = Object.values(safeResults).filter(item => {
    if (!item || !item.test || !item.result) return false;
    
    // Category filter
    if (filters.category && filters.category !== 'all' && item.test.category !== filters.category) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      const isPassed = item.result.pass;
      if ((filters.status === 'passed' && !isPassed) || (filters.status === 'failed' && isPassed)) {
        return false;
      }
    }

    // Severity filter
    if (filters.severity && filters.severity !== 'all' && item.test.severity !== filters.severity) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        item.test.name.toLowerCase().includes(searchLower) ||
        item.test.description?.toLowerCase().includes(searchLower) ||
        item.result.message?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Quick filters
    if (filters.quickFilters) {
      if (filters.quickFilters.failedOnly && item.result.pass) return false;
      if (filters.quickFilters.criticalOnly && item.test.severity !== 'critical') return false;
      if (filters.quickFilters.recentOnly) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        if (new Date(item.timestamp) < oneWeekAgo) return false;
      }
    }

    return true;
  });

  // Sort pinned results to the top
  const sortedResults = [...filteredResults].sort((a, b) => {
    const aIsPinned = pinnedResults.includes(a.test.id);
    const bIsPinned = pinnedResults.includes(b.test.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });
  
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="test results table">
        <TableHead>
          <TableRow>
            <TableCell width={50} />
            <TableCell>Test Name</TableCell>
            <TableCell width={140}>Category</TableCell>
            <TableCell width={100}>Severity</TableCell>
            <TableCell width={100}>Status</TableCell>
            <TableCell width={120} align="right">Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedResults.length > 0 ? (
            sortedResults.map((item) => (
              <TestResultRow 
                key={item.test.id} 
                item={item}
                expandAll={expandAll}
                isPinned={pinnedResults.includes(item.test.id)}
                onPin={onPin}
                showDiff={!!comparisonResults}
                comparisonData={comparisonResults?.[item.test.id]}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography variant="body1" color="textSecondary">
                  No test results match the current filters.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TestResultTable;