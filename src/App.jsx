import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppProvider } from './context/AppContext';
import theme from './theme';
import { Box, CircularProgress } from '@mui/material';

// Layout
import MainLayout from './components/layout/MainLayout';

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/Home'));
const ModelConfigPage = React.lazy(() => import('./pages/ModelConfig'));
const DatasetsPage = React.lazy(() => import('./pages/Datasets'));
const DatasetConfigPage = React.lazy(() => import('./pages/DatasetConfig'));
const EvalConfigPage = React.lazy(() => import('./pages/EvalConfig'));
const EvalsPage = React.lazy(() => import('./pages/Evals'));
const EvalResultsPage = React.lazy(() => import('./pages/EvalResults'));
// const ModelOverviewPage = React.lazy(() => import('./pages/ModelOverview'));
// const RunTestsPage = React.lazy(() => import('./pages/RunTests'));
// const DatasetsPage = React.lazy(() => import('./pages/Datasets'));

// const DatasetDetailPage = React.lazy(() => import('./pages/DatasetDetail'));

// Loading fallback
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}
  >
    <CircularProgress />
  </Box>
);

const App = () => {
  return (
    <AppProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/models" element={<HomePage />} />
                <Route path="/model-config/:model_id?" element={<ModelConfigPage />} />
                <Route path="/datasets" element={<DatasetsPage />} />
                <Route path="/dataset-config/:dataset_id?" element={<DatasetConfigPage />} />
              <Route path="/eval-config/:eval_id?" element={<EvalConfigPage />} />
              <Route path="/eval-results/:eval_id" element={<EvalResultsPage />} />
              <Route path="/evals" element={<EvalsPage />} />
              {/*<Route path="/model-overview" element={<ModelOverviewPage />} />*/}
              {/*<Route path="/model/:modelId" element={<ModelOverviewPage />} />*/}
              {/*<Route path="/run-tests" element={<RunTestsPage />} />*/}
              {/*<Route path="/datasets" element={<DatasetsPage />} />*/}

              {/*<Route path="/dataset/:datasetId" element={<DatasetDetailPage />} />*/}
            </Routes>
          </Suspense>
        </MainLayout>
      </ThemeProvider>
    </AppProvider>
  );
};

export default App;