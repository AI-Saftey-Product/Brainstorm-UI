import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDistanceToNow } from 'date-fns';

const ModelCard = ({ 
  config, 
  viewMode = 'grid',
  onEdit,
  onDelete,
  onClick,
}) => {
  return (
    <Card 
      data-model-id={config.model_id}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: viewMode === 'grid' ? 'column' : 'row',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        '&:hover': {
          borderColor: 'common.black',
        },
        '&:active': {
          transform: 'scale(0.98)',
        }
      }}
      onClick={(e) => {
              e.stopPropagation();
              onEdit(config);
            }}
    >
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 12, 
          right: 12, 
          zIndex: 2,
          display: 'flex',
          gap: 1,
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          p: 0.5
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        <Tooltip title="Edit">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(config);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(config);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <CardContent sx={{ width: '100%', position: 'relative', pt: 2, pb: '16px !important' }}>
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            component="h3" 
            gutterBottom
            sx={{ 
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pr: 8
            }}
          >
            {config.name}
          </Typography>
          {/*<Typography */}
          {/*  variant="caption" */}
          {/*  color="text.secondary" */}
          {/*  sx={{ */}
          {/*    display: 'block',*/}
          {/*    whiteSpace: 'nowrap',*/}
          {/*    overflow: 'hidden',*/}
          {/*    textOverflow: 'ellipsis'*/}
          {/*  }}*/}
          {/*>*/}
          {/*  Last modified {formatDistanceToNow(new Date(config.lastModified))} ago*/}
          {/*</Typography>*/}
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 1.5, 
              flexWrap: 'wrap',
              '& .MuiChip-root': {
                maxWidth: '100%',
                '& .MuiChip-label': {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }
            }}
          >
            <Chip
              label={config.sub_type}
              size="small"
              variant="outlined"
            />
            <Chip
              label={config.modality}
              size="small"
              variant="outlined"
            />
            {/*<Chip*/}
            {/*  label={`${config.testResults?.length || 0} tests`}*/}
            {/*  size="small"*/}
            {/*  color={config.testResults?.length > 0 ? "primary" : "default"}*/}
            {/*/>*/}
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 0.5
            }}
          >
            Source: {config.provider}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Model ID: {config.model_id}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

ModelCard.propTypes = {
  config: PropTypes.shape({
    model_id: PropTypes.string.isRequired,
    name: PropTypes.string,
    modelName: PropTypes.string,
    sub_type: PropTypes.string,
    modelType: PropTypes.string,
    modality: PropTypes.string,
    modelCategory: PropTypes.string,
    source: PropTypes.string,
    modelId: PropTypes.string,
    selectedModel: PropTypes.string,
    testResults: PropTypes.array,
  }).isRequired,
  viewMode: PropTypes.oneOf(['grid', 'list']),
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ModelCard; 