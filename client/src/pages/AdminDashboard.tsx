import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Grid,
  TextField,
  Divider,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { eventService } from '../services/event.service';
import { baseCampService } from '../services/baseCamp.service';
import { workOrderService } from '../services/workOrder.service';
import type { User } from '../types';

const today = new Date().toISOString().split('T')[0];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ events: 0, baseCamps: 0, workOrders: 0 });
  const [error, setError] = useState('');
  const [approving, setApproving] = useState<string | null>(null);
  const [bgCheckDates, setBgCheckDates] = useState<Record<string, string>>({});
  const [savingBgCheck, setSavingBgCheck] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const users = await userService.listUsers();
      const pending = users.filter((u) => u.roleApprovalStatus === 'pending');
      setPendingUsers(pending);

      const [events, baseCamps, workOrders] = await Promise.all([
        eventService.listEvents(),
        baseCampService.listBaseCamps(),
        workOrderService.listWorkOrders(),
      ]);
      setStats({ events: events.length, baseCamps: baseCamps.length, workOrders: workOrders.length });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    }
  };

  const handleSaveBgCheck = async (userId: string) => {
    const dateStr = bgCheckDates[userId];
    if (!dateStr) return;
    setSavingBgCheck(userId);
    try {
      await userService.updateUserProfile(userId, {
        lastBackgroundCheck: new Date(dateStr).getTime(),
      });
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to save background check date');
    } finally {
      setSavingBgCheck(null);
    }
  };

  const handleApproveUser = async (userId: string, approve: boolean, requestedRoles: string[]) => {
    setApproving(userId);
    try {
      await userService.approveUserRole(userId, approve, requestedRoles as any);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setApproving(null);
    }
  };

  const needsBgCheck = pendingUsers.filter((u) => !u.lastBackgroundCheck);
  const readyToApprove = pendingUsers.filter((u) => !!u.lastBackgroundCheck);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Administrator Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">Welcome back, {user?.email}</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Events</Typography>
              </Box>
              <Typography variant="h3">{stats.events}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/events')}>Manage</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationCityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Base Camps</Typography>
              </Box>
              <Typography variant="h3">{stats.baseCamps}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/base-camps')}>Manage</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Work Orders</Typography>
              </Box>
              <Typography variant="h3">{stats.workOrders}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/work-orders')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending</Typography>
              </Box>
              <Typography variant="h3">{pendingUsers.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/admin/users')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Pending Background Checks */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Background Checks
              {needsBgCheck.length > 0 && (
                <Chip label={needsBgCheck.length} size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These volunteers have registered but need a background check before they can be approved.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {needsBgCheck.length === 0 ? (
              <Typography color="text.secondary">No pending background checks</Typography>
            ) : (
              <List disablePadding>
                {needsBgCheck.map((u) => (
                  <ListItem
                    key={u.id}
                    sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
                  >
                    <ListItemText
                      primary={`${u.firstName} ${u.lastName}`}
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" component="span" color="text.secondary">
                            {u.email}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Registered {new Date(u.createdAt).toLocaleString()}
                          </Typography>
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {u.requestedRoles?.map((role) => (
                              <Chip key={role} label={role} size="small" variant="outlined" color="warning" />
                            ))}
                          </Box>
                        </Box>
                      }
                      sx={{ flex: '1 1 220px', mr: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      <TextField
                        type="date"
                        size="small"
                        label="Background Check Date"
                        value={bgCheckDates[u.id] || ''}
                        onChange={(e) => setBgCheckDates((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: today }}
                        sx={{ width: 200 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!bgCheckDates[u.id] || savingBgCheck === u.id}
                        onClick={() => handleSaveBgCheck(u.id)}
                      >
                        {savingBgCheck === u.id ? 'Saving…' : 'Save'}
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Pending Approvals */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Approvals
              {readyToApprove.length > 0 && (
                <Chip label={readyToApprove.length} size="small" color="info" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Background check complete — these volunteers are ready for role approval.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {readyToApprove.length === 0 ? (
              <Typography color="text.secondary">No pending approvals</Typography>
            ) : (
              <List disablePadding>
                {readyToApprove.map((u) => {
                  const busy = approving === u.id;
                  return (
                    <ListItem
                      key={u.id}
                      sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 1, alignItems: 'center' }}
                    >
                      <ListItemText
                        primary={`${u.firstName} ${u.lastName}`}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" component="span" color="text.secondary">
                              {u.email}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Background check: {new Date(u.lastBackgroundCheck!).toLocaleDateString()}
                            </Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {u.requestedRoles?.map((role) => (
                                <Chip key={role} label={role} size="small" variant="outlined" color="warning" />
                              ))}
                            </Box>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 1, ml: 2, flexShrink: 0 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          disabled={busy}
                          onClick={() => handleApproveUser(u.id, true, u.requestedRoles || [])}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          disabled={busy}
                          onClick={() => handleApproveUser(u.id, false, [])}
                        >
                          Reject
                        </Button>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<EventIcon />} onClick={() => navigate('/events')}>
                Manage Events
              </Button>
              <Button variant="contained" startIcon={<LocationCityIcon />} onClick={() => navigate('/base-camps')}>
                Manage Base Camps
              </Button>
              <Button variant="contained" startIcon={<PeopleIcon />} onClick={() => navigate('/admin/users')}>
                Manage Users
              </Button>
              <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/volunteer-calendar')}>
                Volunteer Calendar
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
