import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useAppContext } from './context/AppContext';
import AppHeader from './components/layout/AppHeader';
import AppSidebar from './components/layout/AppSidebar';
import LoadingScreen from './components/common/LoadingScreen';

// Lazy-loaded pages for better performance
const HomePage = lazy(() => import('./pages/Home'));
const ModelConfigPage = lazy(() => import('./pages/ModelConfig'));
const TestConfigPage = lazy(() => import('./pages/TestConfig'));
const RunTestsPage = lazy(() => import('./pages/RunTests'));
const ResultsPage = lazy(() => import('./pages/Results'));
const ModelOverviewPage = lazy(() => import('./pages/ModelOverview'));

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const { modelConfigured, modelConfig } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for custom navigation events from components
  useEffect(() => {
    const handleNavigate = (event) => {
      navigate(`/${event.detail}`);
    };
    
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [navigate]);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // For debugging
  console.log('App: Current path:', location.pathname);
  console.log('App: Model configured:', modelConfigured, typeof modelConfigured);
  console.log('App: Model config:', modelConfig);
  
  // More detailed debugging for context values
  useEffect(() => {
    console.log('App: modelConfigured changed:', modelConfigured);
  }, [modelConfigured]);
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppHeader toggleDrawer={toggleDrawer} />
      <AppSidebar 
        open={drawerOpen} 
        currentPath={location.pathname} 
        modelConfigured={modelConfigured}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          overflow: 'auto',
          transition: (theme) => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: 0,
          backgroundColor: 'background.default',
        }}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/model-config" element={<ModelConfigPage />} />
            <Route path="/model/:modelId" element={<ModelOverviewPage />} />
            <Route 
              path="/test-config" 
              element={
                modelConfigured ? <TestConfigPage /> : <Navigate to="/model-config" />
              } 
            />
            <Route 
              path="/run-tests" 
              element={
                <RunTestsPage />
              } 
            />
            <Route 
              path="/results" 
              element={
                modelConfigured ? <ResultsPage /> : <Navigate to="/model-config" />
              } 
            />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}

export default App;