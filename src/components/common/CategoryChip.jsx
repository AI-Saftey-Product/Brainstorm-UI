import React from 'react';
import { Chip } from '@mui/material';

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
  // Get color from mapping or use gray as fallback
  const categoryKey = category?.toLowerCase();
  const bgcolor = CATEGORY_COLORS[categoryKey] || '#757575';
  
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