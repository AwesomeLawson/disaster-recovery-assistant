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
import WorkIcon from '@mui/icons-material/Work';
import { useAuth } from '../context/AuthContext';
import { workgroupService } from '../services/workgroup.service';
import type { Workgroup } from '../types';

export const WorkerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myWorkgroups, setMyWorkgroups] = useState<Workgroup[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load workgroups where user is a worker
      const allWorkgroups = await workgroupService.listWorkgroups();
      const mine = allWorkgroups.filter((w) => w.workerUserIds.includes(user?.id || ''));
      setMyWorkgroups(mine);
    } catch (err: any) {
      setError(err.message || 'Failed to load workgroups');
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

  const activeWorkgroups = myWorkgroups.filter(
    (w) => w.taskStatus !== 'completed'
  );
  const completedWorkgroups = myWorkgroups.filter(
    (w) => w.taskStatus === 'completed'
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Worker Dashboard
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
                <Typography variant="h6">Active Tasks</Typography>
              </Box>
              <Typography variant="h3">{activeWorkgroups.length}</Typography>
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
                <WorkIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Completed</Typography>
              </Box>
              <Typography variant="h3">{completedWorkgroups.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Assignments */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              My Active Assignments
            </Typography>
            {activeWorkgroups.length === 0 ? (
              <Typography color="text.secondary">
                No active assignments. Check back later for new work opportunities.
              </Typography>
            ) : (
              <List>
                {activeWorkgroups.map((workgroup) => (
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
                              label={`${workgroup.progressNotes.length} updates`}
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

        {/* Completed Assignments */}
        {completedWorkgroups.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recently Completed
              </Typography>
              <List>
                {completedWorkgroups.slice(0, 5).map((workgroup) => (
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
                      secondary={workgroup.taskDescription}
                    />
                    <Chip label="Completed" size="small" color="success" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
