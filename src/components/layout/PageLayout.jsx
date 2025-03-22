import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';
import PropTypes from 'prop-types';

const PageLayout = ({
  title,
  subtitle,
  actions,
  children,
  maxWidth = 'lg',
  noPadding = false,
}) => {
  return (
    <Container maxWidth={maxWidth}>
      {/* Header */}
      {(title || actions) && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 4,
              pt: noPadding ? 0 : 4,
            }}
          >
            <Box>
              {title && (
                <Typography variant="h1" gutterBottom={!!subtitle}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body1" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions && (
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                alignItems: 'center' 
              }}>
                {actions}
              </Box>
            )}
          </Box>
          <Divider sx={{ mb: 4 }} />
        </>
      )}

      {/* Main Content */}
      <Box sx={{ 
        pb: noPadding ? 0 : 4,
        minHeight: '100vh'
      }}>
        {children}
      </Box>
    </Container>
  );
};

PageLayout.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  noPadding: PropTypes.bool,
};

export default PageLayout; 