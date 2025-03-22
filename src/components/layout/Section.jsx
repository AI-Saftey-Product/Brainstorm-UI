import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const Section = ({
  title,
  subtitle,
  children,
  action,
  noPadding = false,
  noMargin = false,
  icon,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        ...(noMargin ? {} : { mb: 4 }),
        ...(noPadding ? {} : { p: 3 }),
      }}
    >
      {(title || subtitle || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Box>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                {icon}
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && (
            <Box sx={{ ml: 2 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
      {children}
    </Paper>
  );
};

Section.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
  noPadding: PropTypes.bool,
  noMargin: PropTypes.bool,
  icon: PropTypes.node,
};

export default Section; 