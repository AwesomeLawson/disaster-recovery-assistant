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
  Chip,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAuth } from '../context/AuthContext';
import { workOrderService } from '../services/workOrder.service';
import { baseCampService } from '../services/baseCamp.service';
import { WorkOrderMap } from '../components/WorkOrderMap';
import type { WorkOrder, BaseCamp, WorkOrderStatus } from '../types';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  intake: 'Intake',
  awaitingAssessment: 'Awaiting Assessment',
  assessed: 'Assessed',
  assigned: 'Assigned',
  inProgress: 'In Progress',
  completed: 'Completed',
};

const STATUS_COLORS: Record<WorkOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'secondary' | 'error'> = {
  intake: 'default',
  awaitingAssessment: 'info',
  assessed: 'warning',
  assigned: 'primary',
  inProgress: 'secondary',
  completed: 'success',
};

export const AssessorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myWorkOrders, setMyWorkOrders] = useState<WorkOrder[]>([]);
  const [eventWorkOrders, setEventWorkOrders] = useState<WorkOrder[]>([]);
  const [eventBaseCamps, setEventBaseCamps] = useState<BaseCamp[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const allWorkOrders = await workOrderService.listWorkOrders();
      const mine = allWorkOrders.filter((a) => a.assessorId === user?.id);
      setMyWorkOrders(mine);

      const eventIds: string[] = user?.eventIds ?? [];
      if (eventIds.length > 0) {
        const [workOrdersByEvent, baseCampsByEvent] = await Promise.all([
          Promise.all(eventIds.map((eid) => workOrderService.listWorkOrders({ eventId: eid }))),
          Promise.all(eventIds.map((eid) => baseCampService.listBaseCamps(eid))),
        ]);

        const seen = new Set<string>();
        const combined: WorkOrder[] = [];
        for (const batch of workOrdersByEvent) {
          for (const a of batch) {
            if (!seen.has(a.id)) { seen.add(a.id); combined.push(a); }
          }
        }
        setEventWorkOrders(combined);

        const seenBaseCamps = new Set<string>();
        const combinedBaseCamps: BaseCamp[] = [];
        for (const batch of baseCampsByEvent) {
          for (const c of batch) {
            if (!seenBaseCamps.has(c.id)) { seenBaseCamps.add(c.id); combinedBaseCamps.push(c); }
          }
        }
        setEventBaseCamps(combinedBaseCamps);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    }
  };

  const awaitingAssessment = myWorkOrders.filter((a) => a.status === 'awaitingAssessment');

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Assessor Dashboard</Typography>
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
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Assigned to Me</Typography>
              </Box>
              <Typography variant="h3">{myWorkOrders.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Awaiting Field Assessment</Typography>
              </Box>
              <Typography variant="h3">{awaitingAssessment.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Open New Work Order</Typography>
              <Typography variant="body2">Submit a new intake for a survivor</Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-orders/create')}
              >
                Open New Work Order
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* My Work Orders */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Work Orders</Typography>
            <Divider sx={{ mb: 2 }} />
            {myWorkOrders.length === 0 ? (
              <Typography color="text.secondary">No work orders assigned to you yet</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {myWorkOrders.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{a.survivorName}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{a.address}</Typography>
                    </Box>
                    <Chip
                      label={STATUS_LABELS[a.status] ?? a.status}
                      size="small"
                      color={STATUS_COLORS[a.status] ?? 'default'}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      {a.status === 'awaitingAssessment' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/work-orders/${a.id}/field-assessment`)}
                        >
                          Start Field Assessment
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/work-orders/${a.id}`)}
                      >
                        View
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Base Camps */}
        {eventBaseCamps.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Base Camps</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {eventBaseCamps.map((c) => (
                  <Box
                    key={c.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2">{c.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{c.address}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/base-camps/${c.id}`)}>
                      View
                    </Button>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Event Map */}
        {(user?.eventIds?.length ?? 0) > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>My Event Map</Typography>
              <Divider sx={{ mb: 2 }} />
              <WorkOrderMap workOrders={eventWorkOrders} baseCamps={eventBaseCamps} />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
