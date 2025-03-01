import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * A loading screen component to display during page transitions or data loading
 * 
 * @param {Object} props - Component properties
 * @param {string} props.message - Message to display (default: 'Loading...')
 * @param {number} props.size - Size of the loading spinner (default: 50)
 * @returns {JSX.Element} Loading screen component
 */
const LoadingScreen = ({ message = 'Loading...', size = 50 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 400,
        width: '100%',
        p: 3,
      }}
    >
      <CircularProgress 
        size={size} 
        thickness={4} 
        sx={{ 
          color: 'primary.main',
          mb: 2,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;