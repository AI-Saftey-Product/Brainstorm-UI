import React from 'react';
import { Chip } from '@mui/material';
import { TEST_CATEGORIES } from '../../constants/testCategories';

/**
 * A chip component for displaying test categories with appropriate colors
 * 
 * @param {Object} props - Component properties
 * @param {string} props.category - Category name
 * @param {string} props.size - Chip size ('small' or 'medium')
 * @param {Object} props.sx - Additional styles
 * @returns {JSX.Element} Category chip component
 */
const CategoryChip = ({ category, size = 'small', sx = {}, ...props }) => {
  const bgcolor = TEST_CATEGORIES[category] || '#757575';
  
  return (
    <Chip
      size={size}
      label={category}
      sx={{ 
        bgcolor, 
        color: 'white',
        fontWeight: 500,
        ...sx 
      }}
      {...props}
    />
  );
};

export default CategoryChip;