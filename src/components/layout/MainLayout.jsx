import React, { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Sidebar open={isSidebarOpen} />

      {/* Main content */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          ml: isSidebarOpen ? '260px' : 0, // Adjust margin based on sidebar state
          pt: '56px', // TopBar height
          bgcolor: '#F8F9FA', // Light background
          transition: 'margin-left 0.2s ease-in-out', // Smooth transition
        }}
      >
        {/* TopBar */}
        <TopBar onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Page content */}
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout; 