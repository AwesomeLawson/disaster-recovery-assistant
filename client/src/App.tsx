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
import { GroupDetail } from './pages/GroupDetail';
import { CenterManagement } from './pages/CenterManagement';
import { CenterDetail } from './pages/CenterDetail';
import { AssessmentList } from './pages/AssessmentList';
import { AssessmentDetail } from './pages/AssessmentDetail';
import { CreateAssessment } from './pages/CreateAssessment';
import { WorkgroupManagement } from './pages/WorkgroupManagement';
import { WorkgroupDetail } from './pages/WorkgroupDetail';
import { WorkgroupCreate } from './pages/WorkgroupCreate';
import { Messaging } from './pages/Messaging';
import { AdminUsers } from './pages/AdminUsers';
import { EscalationManagement } from './pages/EscalationManagement';
import { UserProfile } from './pages/UserProfile';

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
                path="groups/:id"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <GroupDetail />
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
              <Route
                path="centers/:id"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <CenterDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <AdminUsers />
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
              <Route
                path="assessments/:id"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'workGroupLead']}>
                    <AssessmentDetail />
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
              <Route
                path="workgroups/create"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'administrator']}>
                    <WorkgroupCreate />
                  </PrivateRoute>
                }
              />
              <Route
                path="workgroups/:id"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'worker', 'administrator']}>
                    <WorkgroupDetail />
                  </PrivateRoute>
                }
              />

              {/* Escalation routes */}
              <Route
                path="escalations"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'administrator']}>
                    <EscalationManagement />
                  </PrivateRoute>
                }
              />

              {/* User profile - available to all authenticated users */}
              <Route path="profile" element={<UserProfile />} />

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
