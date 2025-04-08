import React from 'react';
import { Box, IconButton, InputBase, Typography, Breadcrumbs, Link } from '@mui/material';
import { Search, History, Bell, User, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSavedModelConfigs } from '../../services/modelStorageService';

const TopBar = ({ onToggleSidebar, isSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    
    // Start with Home
    const breadcrumbs = [{
      label: 'Home',
      path: '/'
    }];

    if (paths.length === 0) return breadcrumbs;

    // Special cases for known routes
    if (paths[0] === 'model-config') {
      return [...breadcrumbs, {
        label: 'New Model Configuration',
        path: '/model-config'
      }];
    }

    if (paths[0] === 'model' && paths[1]) {
      const configs = getSavedModelConfigs();
      const modelConfig = configs.find(config => config.id === paths[1]);
      
      return [...breadcrumbs, {
        label: 'Models',
        path: '/'
      }, {
        label: modelConfig ? (modelConfig.name || modelConfig.modelName) : 'Unknown Model',
        path: `/model/${paths[1]}`
      }];
    }

    if (paths[0] === 'test-config') {
      return [...breadcrumbs, {
        label: 'Test Configuration',
        path: '/test-config'
      }];
    }

    if (paths[0] === 'run-tests') {
      return [...breadcrumbs, {
        label: 'Run Tests',
        path: '/run-tests'
      }];
    }

    if (paths[0] === 'datasets') {
      return [...breadcrumbs, {
        label: 'Datasets',
        path: '/datasets'
      }];
    }
    
    if (paths[0] === 'dataset-config') {
      return [...breadcrumbs, {
        label: 'Datasets',
        path: '/datasets'
      }, {
        label: location.state?.config ? 'Edit Dataset' : 'New Dataset',
        path: '/dataset-config'
      }];
    }

    if (paths[0] === 'dataset' && paths[1]) {
      return [...breadcrumbs, {
        label: 'Datasets',
        path: '/datasets'
      }, {
        label: 'Dataset Details',
        path: `/dataset/${paths[1]}`
      }];
    }

    // Default case: capitalize and format path segments
    return [
      ...breadcrumbs,
      ...paths.map((path, index) => ({
        label: path.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        path: '/' + paths.slice(0, index + 1).join('/')
      }))
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box
      sx={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: '#F8F9FA',
        position: 'fixed',
        top: 0,
        right: 0,
        left: isSidebarOpen ? 260 : 0,
        zIndex: 1000,
        transition: 'left 0.2s ease-in-out'
      }}
    >
      {/* Left section - Toggle and Breadcrumbs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          onClick={onToggleSidebar}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' }
          }}
        >
          {isSidebarOpen ? (
            <PanelLeftClose size={20} strokeWidth={1.5} />
          ) : (
            <PanelLeftOpen size={20} strokeWidth={1.5} />
          )}
        </IconButton>

        <Breadcrumbs
          separator={<ChevronRight size={16} strokeWidth={1.5} />}
          aria-label="breadcrumb"
          sx={{
            '& .MuiBreadcrumbs-separator': {
              mx: 0.5,
              color: 'text.disabled',
              display: 'flex',
              alignItems: 'center'
            },
            '& .MuiBreadcrumbs-ol': {
              display: 'flex',
              alignItems: 'center'
            },
            '& .MuiBreadcrumbs-li': {
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          {breadcrumbs.map((item, index) => (
            index === breadcrumbs.length - 1 ? (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 1,
                  py: 0.5
                }}
              >
                {item.label}
              </Typography>
            ) : (
              <Link
                key={index}
                component="button"
                variant="body2"
                underline="hover"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                  '&:hover': {
                    color: 'primary.main'
                  },
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 1,
                  py: 0.5
                }}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Link>
            )
          ))}
        </Breadcrumbs>
      </Box>

      {/* Right section - Search and actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'action.hover',
            borderRadius: 1,
            px: 1,
            mr: 2
          }}
        >
          <Search size={18} strokeWidth={1.5} />
          <InputBase
            placeholder="Search..."
            sx={{
              ml: 1,
              flex: 1,
              fontSize: '0.875rem',
              '& input': { p: 0.5 }
            }}
          />
        </Box>

        <IconButton size="small">
          <History size={20} strokeWidth={1.5} />
        </IconButton>
        <IconButton size="small">
          <Bell size={20} strokeWidth={1.5} />
        </IconButton>
        <IconButton size="small">
          <User size={20} strokeWidth={1.5} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TopBar; 