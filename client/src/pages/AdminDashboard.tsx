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
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { groupService } from '../services/group.service';
import { centerService } from '../services/center.service';
import { assessmentService } from '../services/assessment.service';
import type { User } from '../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    groups: 0,
    centers: 0,
    assessments: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load users with pending approval
      const users = await userService.listUsers();
      const pending = users.filter((u) => u.roleApprovalStatus === 'pending');
      setPendingUsers(pending);

      // Load statistics
      const [groups, centers, assessments] = await Promise.all([
        groupService.listGroups(),
        centerService.listCenters(),
        assessmentService.listAssessments(),
      ]);

      setStats({
        groups: groups.length,
        centers: centers.length,
        assessments: assessments.length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    }
  };

  const handleApproveUser = async (userId: string, approve: boolean, requestedRoles: string[]) => {
    try {
      await userService.approveUserRole(userId, approve, requestedRoles as any);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve user');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Administrator Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Groups</Typography>
              </Box>
              <Typography variant="h3">{stats.groups}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/groups')}>
                Manage
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationCityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Centers</Typography>
              </Box>
              <Typography variant="h3">{stats.centers}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/centers')}>
                Manage
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Assessments</Typography>
              </Box>
              <Typography variant="h3">{stats.assessments}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/assessments')}>
                View All
              </Button>
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
              <Button size="small">View All</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Pending User Approvals */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending User Approvals
            </Typography>
            {pendingUsers.length === 0 ? (
              <Typography color="text.secondary">No pending approvals</Typography>
            ) : (
              <List>
                {pendingUsers.map((pendingUser) => (
                  <ListItem
                    key={pendingUser.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={pendingUser.email}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span">
                            Requested Roles:{' '}
                          </Typography>
                          {pendingUser.requestedRoles?.map((role) => (
                            <Chip key={role} label={role} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() =>
                          handleApproveUser(
                            pendingUser.id,
                            true,
                            pendingUser.requestedRoles || []
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleApproveUser(pendingUser.id, false, [])}
                      >
                        Reject
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<GroupIcon />}
                onClick={() => navigate('/groups/create')}
              >
                Create Group
              </Button>
              <Button
                variant="contained"
                startIcon={<LocationCityIcon />}
                onClick={() => navigate('/centers/create')}
              >
                Create Center
              </Button>
              <Button
                variant="contained"
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
