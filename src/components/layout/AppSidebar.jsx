import React from 'react';
import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const drawerWidth = 260;

const AppSidebar = ({ open, currentPath, modelConfigured }) => {
  const navigate = useNavigate();
  const { modelType, modelConfig } = useAppContext();
  
  // Debug log - this helps us see what's happening
  console.log('Sidebar modelConfigured:', modelConfigured);
  console.log('Sidebar modelConfig:', modelConfig);
  
  const menuItems = [
    { id: '/', text: 'Home', icon: <HomeIcon />, enabled: true },
    { id: '/model-config', text: 'Model Configuration', icon: <SettingsIcon />, enabled: true },
    { id: '/test-config', text: 'Test Configuration', icon: <CheckBoxIcon />, enabled: modelConfigured },
    { id: '/run-tests', text: 'Run Tests', icon: <PlayArrowIcon />, enabled: modelConfigured },
    { id: '/results', text: 'Results Dashboard', icon: <AssessmentIcon />, enabled: modelConfigured }
  ];

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton 
                selected={currentPath === item.id}
                onClick={() => item.enabled && handleNavigation(item.id)}
                disabled={!item.enabled}
                sx={{
                  borderRadius: '0 24px 24px 0',
                  margin: '4px 8px 4px 0',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(63, 81, 181, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(63, 81, 181, 0.16)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: currentPath === item.id ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mt: 'auto', p: 2 }}>
          {modelConfigured && (
            <Box sx={{ 
              mb: 2, 
              p: 2, 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: 1,
              borderLeft: '3px solid #4caf50',
            }}>
              <Typography variant="subtitle2" color="success.main">
                Model Configured
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" sx={{ mr: 1 }}>
                  Type:
                </Typography>
                <Chip 
                  size="small" 
                  label={modelType || 'AI Model'} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          )}
          
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
              About
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              This tool helps ensure your AI models comply with regulatory and ethical standards.
            </Typography>
            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block', cursor: 'pointer' }}>
              Documentation & Help
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AppSidebar;