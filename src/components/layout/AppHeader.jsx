import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Badge,
  Tooltip,
  Avatar,
  Divider,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate } from 'react-router-dom';
import brainstormLogo from '../../assets/brainstorm_logo.png';

const AppHeader = ({ toggleDrawer }) => {
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleNotificationsClick = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleAccountClick = (event) => {
    setAccountAnchorEl(event.currentTarget);
  };

  const handleAccountClose = () => {
    setAccountAnchorEl(null);
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={toggleDrawer}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.01em'
          }}
          onClick={() => navigate('/')}
        >
          <img 
            src={brainstormLogo} 
            alt="Brainstorm Logo" 
            style={{ 
              height: '32px', 
              width: '32px', 
              marginRight: '12px',
              objectFit: 'contain'
            }} 
          />
          BRAINSTORM
        </Typography>
        
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Help">
            <IconButton color="inherit">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              onClick={handleNotificationsClick}
              aria-controls="notifications-menu"
              aria-haspopup="true"
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Menu
            id="notifications-menu"
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                overflow: 'visible',
                mt: 1.5,
                width: 320,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2">Test Suite Updated</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  New fairness tests are available for your model.
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2">Compliance Alert</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Your model needs attention to meet compliance standards.
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2">All Tests Completed</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  View your results in the dashboard.
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Button size="small" onClick={handleNotificationsClose}>
                View All Notifications
              </Button>
            </Box>
          </Menu>
          
          <Tooltip title="Account">
            <IconButton 
              color="inherit" 
              onClick={handleAccountClick}
              aria-controls="account-menu"
              aria-haspopup="true"
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
          
          <Menu
            id="account-menu"
            anchorEl={accountAnchorEl}
            open={Boolean(accountAnchorEl)}
            onClose={handleAccountClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                overflow: 'visible',
                mt: 1.5,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            <MenuItem onClick={handleAccountClose}>
              <Avatar sx={{ width: 24, height: 24, mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleAccountClose}>
              <SettingsIcon fontSize="small" sx={{ mr: 1 }} /> Settings
            </MenuItem>
            <MenuItem onClick={handleAccountClose}>
              <DarkModeIcon fontSize="small" sx={{ mr: 1 }} /> Dark Mode
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleAccountClose}>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;