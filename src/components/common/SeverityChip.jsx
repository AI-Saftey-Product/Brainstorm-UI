import React from 'react';
import { Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * A chip component for displaying severity levels with appropriate colors
 * 
 * @param {Object} props - Component properties
 * @param {string} props.severity - Severity value ('critical', 'high', 'medium', 'low', or custom)
 * @param {string} props.label - Optional custom label (defaults to capitalized severity)
 * @param {string} props.size - Chip size ('small' or 'medium')
 * @param {Object} props.sx - Additional styles
 * @returns {JSX.Element} Severity chip component
 */
const SeverityChip = ({ severity, label, size = 'small', sx = {}, ...props }) => {
  let color = 'default';
  let icon = null;
  let chipLabel = label || (severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Unknown');
  
  switch (severity?.toLowerCase()) {
    case 'critical':
      color = 'error';
      icon = <PriorityHighIcon fontSize="small" />;
      break;
      
    case 'high':
      color = 'warning';
      icon = <WarningIcon fontSize="small" />;
      break;
      
    case 'medium':
      color = 'info';
      icon = <InfoIcon fontSize="small" />;
      break;
      
    case 'low':
      color = 'success';
      icon = <CheckCircleIcon fontSize="small" />;
      break;
      
    default:
      break;
  }
  
  return (
    <Chip
      size={size}
      label={chipLabel}
      color={color}
      icon={icon}
      sx={sx}
      {...props}
    />
  );
};

export default SeverityChip;