import React from 'react';
import { Box } from '@mui/material';

/**
 * A simple horizontal progress bar component
 * 
 * @param {Object} props - Component properties
 * @param {number} props.value - Progress value (0-100)
 * @param {number} props.height - Height of the bar in pixels (default: 8)
 * @param {string} props.color - Optional color override (default is based on value)
 * @param {boolean} props.animated - Whether to show animation (default: false)
 * @param {Object} props.sx - Additional styles
 * @returns {JSX.Element} Progress bar component
 */
const ProgressBar = ({ value, height = 8, color, animated = false, sx = {}, ...props }) => {
  const getProgressColor = () => {
    if (color) return color;
    if (value >= 80) return '#4caf50'; // green
    if (value >= 50) return '#ff9800'; // orange
    return '#f44336'; // red
  };
  
  return (
    <Box 
      {...props}
      sx={{ 
        width: '100%', 
        height: height, 
        borderRadius: height / 2, 
        bgcolor: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
        ...sx
      }}
    >
      <Box 
        sx={{
          width: `${value}%`,
          height: '100%',
          bgcolor: getProgressColor(),
          transition: animated ? 'width 0.5s ease-in-out' : 'none',
          borderRadius: height / 2,
          ...(animated && {
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                opacity: 0.8,
              },
              '50%': {
                opacity: 1,
              },
              '100%': {
                opacity: 0.8,
              },
            },
          }),
        }}
      />
    </Box>
  );
};

export default ProgressBar;