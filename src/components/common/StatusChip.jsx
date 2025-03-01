import React from 'react';
import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';

/**
 * A chip component for displaying status information with appropriate icons and colors
 * 
 * @param {Object} props - Component properties
 * @param {string} props.status - Status value ('passed', 'failed', 'warning', 'info', or custom)
 * @param {string} props.label - Optional custom label (defaults to capitalized status)
 * @param {string} props.size - Chip size ('small' or 'medium')
 * @param {Object} props.sx - Additional styles
 * @returns {JSX.Element} Status chip component
 */
const StatusChip = ({ status, label, size = 'small', sx = {}, ...props }) => {
  let icon = <HelpIcon />;
  let color = 'default';
  let chipLabel = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
  
  switch (status?.toLowerCase()) {
    case 'passed':
    case 'pass':
    case 'success':
      icon = <CheckCircleIcon />;
      color = 'success';
      break;
      
    case 'failed':
    case 'fail':
    case 'error':
      icon = <ErrorIcon />;
      color = 'error';
      break;
      
    case 'warning':
    case 'warn':
      icon = <InfoIcon />;
      color = 'warning';
      break;
      
    case 'info':
    case 'information':
      icon = <InfoIcon />;
      color = 'info';
      break;
      
    default:
      break;
  }
  
  return (
    <Chip
      icon={icon}
      size={size}
      label={chipLabel}
      color={color}
      sx={{
        fontWeight: 500,
        ...sx
      }}
      {...props}
    />
  );
};

export default StatusChip;