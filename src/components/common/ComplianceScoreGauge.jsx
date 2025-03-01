import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * A circular gauge component for displaying compliance scores
 * 
 * @param {Object} props - Component properties
 * @param {number} props.score - Score value (0-100)
 * @param {number} props.size - Size of the gauge in pixels (default: 100)
 * @param {string} props.label - Optional label to display below the gauge
 * @param {boolean} props.showPercent - Whether to show % symbol (default: true)
 * @param {Object} props.sx - Additional sx styles
 * @returns {JSX.Element} Gauge component
 */
const ComplianceScoreGauge = ({ score, size = 100, label, showPercent = true, sx = {}, ...props }) => {
  const getScoreColor = () => {
    if (score >= 80) return '#4caf50'; // green
    if (score >= 50) return '#ff9800'; // orange
    return '#f44336'; // red
  };
  
  const fontSize = Math.round(size * 0.32);
  
  return (
    <Box sx={{ textAlign: 'center', ...sx }}>
      <Box 
        {...props}
        sx={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          bgcolor: getScoreColor(), 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontWeight: 'bold',
          fontSize: fontSize,
          boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
          mx: 'auto',
          mb: label ? 1 : 0,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '85%',
            height: '85%',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            boxSizing: 'border-box'
          }
        }}
      >
        {Math.round(score)}{showPercent && '%'}
      </Box>
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default ComplianceScoreGauge;