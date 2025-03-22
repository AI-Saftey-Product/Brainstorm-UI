import React from 'react';
import PropTypes from 'prop-types';
import { Card, Box, Typography, Tooltip } from '@mui/material';
import { Plus } from 'lucide-react';

const AddModelCard = ({ viewMode = 'grid', onClick }) => {
  return (
    <Tooltip title="Add New Model (Ctrl+N)">
      <Card
        onClick={onClick}
        sx={{
          height: viewMode === 'grid' ? '100%' : 100,
          display: 'flex',
          flexDirection: viewMode === 'grid' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: 'divider',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          minHeight: viewMode === 'grid' ? 250 : 'auto',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
          '&:active': {
            transform: 'scale(0.98)',
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: viewMode === 'grid' ? 'column' : 'row',
            alignItems: 'center',
            gap: 2,
            p: 3,
            color: 'text.secondary'
          }}
        >
          <Plus size={24} />
          <Typography variant="h6" color="inherit">
            Add New Model
          </Typography>
        </Box>
      </Card>
    </Tooltip>
  );
};

AddModelCard.propTypes = {
  viewMode: PropTypes.oneOf(['grid', 'list']),
  onClick: PropTypes.func.isRequired,
};

export default AddModelCard; 