import React from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wrench, PieChart, Settings, Database } from 'lucide-react';
import brainstormLogo from '../../assets/brainstorm_logo.png';

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    {
      label: 'Modules',
      type: 'header'
    },
    {
      label: 'Models',
      path: '/models',
      icon: <LayoutDashboard size={18} />
    },
    {
      label: 'Datasets',
      path: '/datasets',
      icon: <Database size={18} />
    },
    {
      label: 'Evals',
      path: '/evals',
      icon: <PieChart size={18} />
    },
  ];

  return (
    <Box
      sx={{
        width: 260,
        height: '100vh',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fbfbfb',
        position: 'fixed',
        left: open ? 0 : -260,
        top: 0,
        overflowY: 'auto',
        transition: 'left 0.2s ease-in-out',
        zIndex: 1200,
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#E0E0E0',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#BDBDBD',
        }
      }}
    >
      {/* Logo/Brand */}
      <Box 
        sx={{ 
          px: 3, 
          py: 2.5,
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          bgcolor: '#fbfbfb'
        }}
      >
        <img src={brainstormLogo} alt="Brainstorm" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.01em',
            fontSize: '0.9rem',
            color: 'text.primary'
          }}
        >
          BRAINSTORM
        </Typography>
      </Box>

      {/* Menu Items */}
      <List sx={{ px: 1.5, pt: 0.5 }}>
        {menuItems.map((item, index) => {
          if (item.type === 'header') {
            return (
              <Typography
                key={index}
                variant="caption"
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              >
                {item.label}
              </Typography>
            );
          }

          const active = isActive(item.path);

          return (
            <ListItem
              key={index}
              button
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: '6px',
                mb: 0.2,
                py: 0.7,
                color: active ? '#000000' : '#888888',
                bgcolor: active ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                borderLeft: active ? '3px solid #000000' : '3px solid transparent',
                paddingLeft: active ? '13px' : '16px', // Adjust padding to compensate for the border
                '&:hover': {
                  bgcolor: active ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                },
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 32,
                  color: active ? '#000000' : '#888888',
                  opacity: active ? 1 : 0.9,
                  '& svg': {
                    strokeWidth: 1.5
                  }
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 500 : 400,
                  letterSpacing: '-0.01em',
                  color: active ? '#000000' : '#888888'
                }}
                sx={{
                  '& .MuiTypography-root': {
                    transition: 'font-weight 0.15s ease-in-out, color 0.15s ease-in-out'
                  }
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar; 