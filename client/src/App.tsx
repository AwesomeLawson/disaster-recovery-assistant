import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SignLegalRelease } from './pages/SignLegalRelease';
import { Dashboard } from './pages/Dashboard';
import { GroupManagement } from './pages/GroupManagement';
import { CenterManagement } from './pages/CenterManagement';
import { AssessmentList } from './pages/AssessmentList';
import { CreateAssessment } from './pages/CreateAssessment';
import { WorkgroupManagement } from './pages/WorkgroupManagement';
import { Messaging } from './pages/Messaging';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Legal release - requires authentication but not role approval */}
            <Route
              path="/sign-legal-release"
              element={
                <PrivateRoute>
                  <SignLegalRelease />
                </PrivateRoute>
              }
            />

            {/* Protected routes - require authentication and role approval */}
            <Route
              path="/"
              element={
                <PrivateRoute requireLegalRelease>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Admin routes */}
              <Route
                path="groups"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <GroupManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="centers"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <CenterManagement />
                  </PrivateRoute>
                }
              />

              {/* Assessor routes */}
              <Route
                path="assessments"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'workGroupLead']}>
                    <AssessmentList />
                  </PrivateRoute>
                }
              />
              <Route
                path="assessments/create"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator']}>
                    <CreateAssessment />
                  </PrivateRoute>
                }
              />

              {/* Workgroup routes */}
              <Route
                path="workgroups"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'worker', 'administrator']}>
                    <WorkgroupManagement />
                  </PrivateRoute>
                }
              />

              {/* Messaging - available to all authenticated users */}
              <Route path="messages" element={<Messaging />} />
            </Route>

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
