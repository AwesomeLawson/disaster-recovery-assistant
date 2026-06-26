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
  Divider,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WorkIcon from '@mui/icons-material/Work';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../context/AuthContext';
import { workOrderService } from '../services/workOrder.service';
import { workgroupService } from '../services/workgroup.service';
import type { WorkOrder, Workgroup } from '../types';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

function statusColor(status: string): 'primary' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'inProgress': return 'primary';
    case 'partiallyCompleted': return 'warning';
    case 'needsEscalation': return 'error';
    default: return 'default';
  }
}

export const FieldCoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workgroups, setWorkgroups] = useState<Workgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workOrdersData, workgroupsData] = await Promise.all([
        workOrderService.listWorkOrders(),
        workgroupService.listWorkgroups(),
      ]);
      setWorkOrders(workOrdersData);
      setWorkgroups(workgroupsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const assignedWorkOrderIds = new Set(workgroups.map((w) => w.workOrderId));
  const sortedWorkOrders = [...workOrders].sort(
    (a, b) => (SEVERITY_ORDER[a.severity ?? 'low'] ?? 3) - (SEVERITY_ORDER[b.severity ?? 'low'] ?? 3)
  );
  const activeWorkgroups = workgroups.filter(
    (w) => w.taskStatus !== 'completed'
  );
  const completedWorkgroups = workgroups.filter((w) => w.taskStatus === 'completed');
  const flaggedCount = workOrders.filter((a) => a.flaggedForReview).length;

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Field Coordinator Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName} {user?.lastName}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Work Orders</Typography>
              </Box>
              <Typography variant="h3">{workOrders.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/work-orders')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FlagIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Flagged</Typography>
              </Box>
              <Typography variant="h3">{flaggedCount}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/work-orders')}>Review</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WorkIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Active Teams</Typography>
              </Box>
              <Typography variant="h3">{activeWorkgroups.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/workgroups')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Completed</Typography>
              </Box>
              <Typography variant="h3">{completedWorkgroups.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/workgroups')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Volunteer Calendar shortcut */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6">Volunteer Availability</Typography>
              <Typography variant="body2" color="text.secondary">
                View confirmed and pending volunteer dates across all events.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<CalendarMonthIcon />}
              onClick={() => navigate('/volunteer-calendar')}
            >
              View Calendar
            </Button>
          </Paper>
        </Grid>

        {/* Job Queue */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Job Queue</Typography>
              <Typography variant="caption" color="text.secondary">sorted by severity</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {sortedWorkOrders.length === 0 ? (
              <Typography color="text.secondary">No work orders yet</Typography>
            ) : (
              <List disablePadding>
                {sortedWorkOrders.map((a) => {
                  const assigned = assignedWorkOrderIds.has(a.id);
                  return (
                    <ListItem
                      key={a.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.50' },
                        gap: 1,
                      }}
                      onClick={() => navigate(`/work-orders/${a.id}`)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={600}>{a.survivorName}</Typography>
                            {a.severity && (
                              <Chip
                                label={a.severity}
                                size="small"
                                color={SEVERITY_COLOR[a.severity] ?? 'default'}
                              />
                            )}
                            {a.flaggedForReview && (
                              <Chip label="Flagged" size="small" color="warning" />
                            )}
                          </Box>
                        }
                        secondary={a.affectedPeople != null ? `${a.address} · ${a.affectedPeople} affected` : a.address}
                        sx={{ pr: 1 }}
                      />
                      <Box sx={{ flexShrink: 0 }}>
                        {assigned ? (
                          <Chip label="Assigned" size="small" color="success" variant="outlined" />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/workgroups/create?workOrderId=${a.id}`);
                            }}
                          >
                            Assign Team
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Active Teams */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Active Teams ({activeWorkgroups.length})</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate('/workgroups/create')}
              >
                New Team
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {activeWorkgroups.length === 0 ? (
              <Typography color="text.secondary">No active teams</Typography>
            ) : (
              <List disablePadding>
                {activeWorkgroups.map((w) => (
                  <ListItem
                    key={w.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                    onClick={() => navigate(`/workgroups/${w.id}`)}
                  >
                    <ListItemText
                      primary={w.name}
                      secondary={
                        <Chip
                          label={w.taskStatus}
                          size="small"
                          color={statusColor(w.taskStatus)}
                          sx={{ mt: 0.5 }}
                        />
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      {w.volunteerUserIds.length} volunteers
                    </Typography>
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
