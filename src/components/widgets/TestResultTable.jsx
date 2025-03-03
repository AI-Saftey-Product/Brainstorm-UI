import React, { useState } from 'react';
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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningIcon from '@mui/icons-material/Warning';
import ComplianceScoreGauge from '../common/ComplianceScoreGauge';
import StatusChip from '../common/StatusChip';
import SeverityChip from '../common/SeverityChip';
import CategoryChip from '../common/CategoryChip.jsx';
import { formatTimestamp } from '../../utils/formatters';

const TestResultRow = ({ item }) => {
  const [open, setOpen] = useState(false);

  if (!item || !item.test || !item.result) {
    return null;
  }

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{item.test.name}</TableCell>
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
          <ComplianceScoreGauge 
            score={item.result.score * 100} 
            size={40} 
            showPercent={false} 
          />
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div">
                Test Details
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  {item.test.description}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Timestamp: {formatTimestamp(item.result.timestamp)}
                </Typography>
              </Box>
              
              {!item.result.pass && item.result.recommendations && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(244, 67, 54, 0.05)', 
                  borderRadius: 1,
                  borderLeft: '3px solid #f44336',
                }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                    Issues Detected
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                    {item.result.recommendations.map((rec, idx) => (
                      <Typography component="li" variant="body2" key={idx} sx={{ mb: 0.5 }}>
                        {rec}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
              
              {item.result.metrics && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Metrics
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(item.result.metrics).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key.replace(/_/g, ' ')}: ${typeof value === 'number' ? value.toFixed(2) : value}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Test Inputs and Outputs Section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Test Details
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {/* Display test cases if available */}
                  {item.result.cases && item.result.cases.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Test Cases:
                      </Typography>
                      {item.result.cases.map((testCase, index) => (
                        <Box key={index} sx={{ mb: 2, pl: 2 }}>
                          <Typography variant="body2">
                            <strong>Input:</strong> {testCase.input}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Expected:</strong> {testCase.expected}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Actual:</strong> {testCase.actual}
                          </Typography>
                          {index < item.result.cases.length - 1 && <Divider sx={{ my: 1 }} />}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Display questions if available (for TruthfulQA tests) */}
                  {item.result.questions && item.result.questions.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Questions:
                      </Typography>
                      {item.result.questions.map((question, index) => (
                        <Box key={index} sx={{ mb: 2, pl: 2 }}>
                          <Typography variant="body2">
                            <strong>Question:</strong> {question.question}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Response:</strong> {question.response}
                          </Typography>
                          {question.expected && (
                            <Typography variant="body2">
                              <strong>Expected:</strong> {question.expected}
                            </Typography>
                          )}
                          {question.category && (
                            <Typography variant="body2">
                              <strong>Category:</strong> {question.category}
                            </Typography>
                          )}
                          {index < item.result.questions.length - 1 && <Divider sx={{ my: 1 }} />}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Display pairs if available (for counterfactual/factCC tests) */}
                  {item.result.pairs && item.result.pairs.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Test Pairs:
                      </Typography>
                      {item.result.pairs.map((pair, index) => (
                        <Box key={index} sx={{ mb: 2, pl: 2 }}>
                          <Typography variant="body2">
                            <strong>Original:</strong> {pair.original}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Modified:</strong> {pair.modified}
                          </Typography>
                          {pair.originalResponse && (
                            <Typography variant="body2">
                              <strong>Original Response:</strong> {pair.originalResponse}
                            </Typography>
                          )}
                          {pair.modifiedResponse && (
                            <Typography variant="body2">
                              <strong>Modified Response:</strong> {pair.modifiedResponse}
                            </Typography>
                          )}
                          {index < item.result.pairs.length - 1 && <Divider sx={{ my: 1 }} />}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Display failed inputs if available */}
                  {item.result.details?.failed_inputs && item.result.details.failed_inputs.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Failed Inputs:
                      </Typography>
                      {item.result.details.failed_inputs.map((input, index) => (
                        <Box key={index} sx={{ mb: 1, pl: 2 }}>
                          <Typography variant="body2">
                            <strong>Input:</strong> {input.input || input}
                          </Typography>
                          {input.reason && (
                            <Typography variant="body2" color="error">
                              <strong>Reason:</strong> {input.reason}
                            </Typography>
                          )}
                          {index < item.result.details.failed_inputs.length - 1 && <Divider sx={{ my: 1 }} />}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Fallback message if no input/output data available */}
                  {!item.result.cases?.length && 
                   !item.result.questions?.length && 
                   !item.result.pairs?.length && 
                   !item.result.details?.failed_inputs?.length && (
                    <Typography variant="body2" color="textSecondary">
                      No detailed input/output data available for this test.
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TestResultTable = ({ results = {}, filters = {} }) => {
  // Ensure results is an object and not null/undefined
  const safeResults = results && typeof results === 'object' ? results : {};
  
  // Apply filters if provided
  const filteredResults = Object.values(safeResults).filter(item => {
    if (!item || !item.test || !item.result) return false;
    
    if (filters.category && filters.category !== 'all' && item.test.category !== filters.category) {
      return false;
    }
    if (filters.status && filters.status !== 'all') {
      const isPassed = item.result.pass;
      if ((filters.status === 'passed' && !isPassed) || (filters.status === 'failed' && isPassed)) {
        return false;
      }
    }
    if (filters.severity && filters.severity !== 'all' && item.test.severity !== filters.severity) {
      return false;
    }
    return true;
  });
  
  return (
    <TableContainer component={Paper}>
      <Table aria-label="test results table">
        <TableHead>
          <TableRow>
            <TableCell width={50} />
            <TableCell>Test Name</TableCell>
            <TableCell width={140}>Category</TableCell>
            <TableCell width={100}>Severity</TableCell>
            <TableCell width={100}>Status</TableCell>
            <TableCell width={80} align="right">Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredResults.length > 0 ? (
            filteredResults.map((item) => (
              <TestResultRow key={item.test.id} item={item} />
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