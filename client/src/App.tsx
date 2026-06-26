import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CompleteProfile } from './pages/CompleteProfile';
import { SignLegalRelease } from './pages/SignLegalRelease';
import { Dashboard } from './pages/Dashboard';
import { EventManagement } from './pages/EventManagement';
import { EventDetail } from './pages/EventDetail';
import { BaseCampManagement } from './pages/BaseCampManagement';
import { BaseCampDetail } from './pages/BaseCampDetail';
import { WorkOrderList } from './pages/WorkOrderList';
import { WorkOrderDetail } from './pages/WorkOrderDetail';
import { CreateWorkOrder } from './pages/CreateWorkOrder';
import { EditIntake } from './pages/EditIntake';
import { FieldAssessment } from './pages/FieldAssessment';
import { WorkgroupManagement } from './pages/WorkgroupManagement';
import { WorkgroupDetail } from './pages/WorkgroupDetail';
import { WorkgroupCreate } from './pages/WorkgroupCreate';
import { SignHomeownerRelease } from './pages/SignHomeownerRelease';
import { Messaging } from './pages/Messaging';
import { AdminUsers } from './pages/AdminUsers';
import { EscalationManagement } from './pages/EscalationManagement';
import { UserProfile } from './pages/UserProfile';
import { OrganizationManagement } from './pages/OrganizationManagement';
import { VolunteerCalendar } from './pages/VolunteerCalendar';
import { TrainingsLibrary } from './pages/TrainingsLibrary';
import { LogHours } from './pages/LogHours';
import { AdminImpact } from './pages/AdminImpact';
import { ToolInventory } from './pages/ToolInventory';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3464B9',
      dark: '#1E3F8C',
      light: '#6B93D6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F2C230',
      dark: '#C49B10',
      light: '#F7D97A',
      contrastText: '#1C2B5A',
    },
    background: {
      default: '#F5F7FB',
      paper: '#ffffff',
    },
    text: {
      primary: '#1C2B5A',
      secondary: '#4A5C8A',
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
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1C2B5A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '3px solid #F2C230',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedSecondary: {
          color: '#1C2B5A',
          fontWeight: 700,
        },
      },
    },
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
            <Route path="/complete-profile" element={<CompleteProfile />} />

            {/* Legal release - public so it can be reviewed without signing in */}
            <Route path="/sign-legal-release" element={<SignLegalRelease />} />

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
                path="events"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <EventManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="events/:id"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <EventDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="base-camps"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <BaseCampManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="base-camps/:id"
                element={
                  <PrivateRoute requireRoles={['administrator', 'assessor', 'fieldCoordinator']}>
                    <BaseCampDetail />
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
              <Route
                path="admin/organizations"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <OrganizationManagement />
                  </PrivateRoute>
                }
              />

              {/* Work order management routes */}
              <Route
                path="work-orders"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'workGroupLead', 'fieldCoordinator']}>
                    <WorkOrderList />
                  </PrivateRoute>
                }
              />
              <Route
                path="work-orders/create"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'fieldCoordinator', 'workGroupLead']}>
                    <CreateWorkOrder />
                  </PrivateRoute>
                }
              />
              <Route
                path="work-orders/:id"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'workGroupLead', 'fieldCoordinator']}>
                    <WorkOrderDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="work-orders/:id/edit-intake"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'fieldCoordinator']}>
                    <EditIntake />
                  </PrivateRoute>
                }
              />
              <Route
                path="work-orders/:id/field-assessment"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'fieldCoordinator']}>
                    <FieldAssessment />
                  </PrivateRoute>
                }
              />
              <Route
                path="work-orders/:id/homeowner-release"
                element={
                  <PrivateRoute requireRoles={['assessor', 'administrator', 'fieldCoordinator']}>
                    <SignHomeownerRelease />
                  </PrivateRoute>
                }
              />

              {/* Workgroup routes */}
              <Route
                path="workgroups"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'volunteer', 'administrator', 'fieldCoordinator', 'secChaplain']}>
                    <WorkgroupManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="workgroups/create"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'administrator', 'fieldCoordinator']}>
                    <WorkgroupCreate />
                  </PrivateRoute>
                }
              />
              <Route
                path="workgroups/:id"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'volunteer', 'administrator', 'fieldCoordinator', 'secChaplain']}>
                    <WorkgroupDetail />
                  </PrivateRoute>
                }
              />

              {/* Escalation routes */}
              <Route
                path="escalations"
                element={
                  <PrivateRoute requireRoles={['workGroupLead', 'administrator', 'fieldCoordinator']}>
                    <EscalationManagement />
                  </PrivateRoute>
                }
              />

              {/* Volunteer Calendar */}
              <Route
                path="volunteer-calendar"
                element={
                  <PrivateRoute requireRoles={['administrator', 'fieldCoordinator']}>
                    <VolunteerCalendar />
                  </PrivateRoute>
                }
              />

              {/* Trainings library - available to all authenticated users */}
              <Route
                path="trainings"
                element={
                  <PrivateRoute>
                    <TrainingsLibrary />
                  </PrivateRoute>
                }
              />

              {/* Tool inventory - any authenticated user can view; write gating handled in-page */}
              <Route
                path="tools"
                element={
                  <PrivateRoute>
                    <ToolInventory />
                  </PrivateRoute>
                }
              />

              {/* Log Hours - available to all approved users */}
              <Route
                path="log-hours"
                element={
                  <PrivateRoute>
                    <LogHours />
                  </PrivateRoute>
                }
              />

              {/* Admin Impact dashboard */}
              <Route
                path="admin/impact"
                element={
                  <PrivateRoute requireRoles={['administrator']}>
                    <AdminImpact />
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
