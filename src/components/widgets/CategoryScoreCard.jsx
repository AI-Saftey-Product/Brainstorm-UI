import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import ProgressBar from '../common/ProgressBar';

const CategoryScoreCard = ({ category, scores, color }) => {
  const categoryScore = scores.total > 0 ? (scores.passed / scores.total) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: color || '#757575',
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
  );
};

export default CategoryScoreCard;