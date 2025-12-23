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
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../context/AuthContext';
import { workgroupService } from '../services/workgroup.service';
import { escalationService } from '../services/escalation.service';
import type { Workgroup, Escalation } from '../types';

export const WorkGroupLeadDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myWorkgroups, setMyWorkgroups] = useState<Workgroup[]>([]);
  const [pendingEscalations, setPendingEscalations] = useState<Escalation[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load workgroups where user is lead
      const allWorkgroups = await workgroupService.listWorkgroups();
      const mine = allWorkgroups.filter((w) => w.leadUserId === user?.id);
      setMyWorkgroups(mine);

      // Load pending escalations
      const escalations = await escalationService.listEscalations({ status: 'pending' });
      setPendingEscalations(escalations);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'inProgress':
        return 'primary';
      case 'needsEscalation':
        return 'error';
      case 'partiallyCompleted':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Work Group Lead Dashboard
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
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">My Workgroups</Typography>
              </Box>
              <Typography variant="h3">{myWorkgroups.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/workgroups')}>
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Escalations</Typography>
              </Box>
              <Typography variant="h3">{pendingEscalations.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/escalations')}>
                Review
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Workgroup
              </Typography>
              <Typography variant="body2">Organize a new work team</Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/workgroups/create')}
              >
                New Workgroup
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Active Workgroups */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Workgroups
            </Typography>
            {myWorkgroups.length === 0 ? (
              <Typography color="text.secondary">No workgroups yet</Typography>
            ) : (
              <List>
                {myWorkgroups.map((workgroup) => (
                  <ListItem
                    key={workgroup.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                    }}
                    onClick={() => navigate(`/workgroups/${workgroup.id}`)}
                  >
                    <ListItemText
                      primary={workgroup.name}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span">
                            {workgroup.taskDescription}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={workgroup.taskStatus}
                              size="small"
                              color={getStatusColor(workgroup.taskStatus) as any}
                              sx={{ mr: 1 }}
                            />
                            <Chip
                              label={`${workgroup.workerUserIds.length} workers`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
