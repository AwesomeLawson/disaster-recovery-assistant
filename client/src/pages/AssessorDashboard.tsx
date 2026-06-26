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
import { assessmentService } from '../services/assessment.service';
import { centerService } from '../services/center.service';
import { AssessmentMap } from '../components/AssessmentMap';
import type { Assessment, Center, CaseStatus } from '../types';

const STATUS_LABELS: Record<CaseStatus, string> = {
  intake: 'Intake',
  awaitingAssessment: 'Awaiting Assessment',
  assessed: 'Assessed',
  assigned: 'Assigned',
  inProgress: 'In Progress',
  completed: 'Completed',
};

const STATUS_COLORS: Record<CaseStatus, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'secondary' | 'error'> = {
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
  const [myAssessments, setMyAssessments] = useState<Assessment[]>([]);
  const [eventAssessments, setEventAssessments] = useState<Assessment[]>([]);
  const [eventCenters, setEventCenters] = useState<Center[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const allAssessments = await assessmentService.listAssessments();
      const mine = allAssessments.filter((a) => a.assessorId === user?.id);
      setMyAssessments(mine);

      const eventIds: string[] = user?.eventIds ?? [];
      if (eventIds.length > 0) {
        const [assessmentsByEvent, centersByEvent] = await Promise.all([
          Promise.all(eventIds.map((eid) => assessmentService.listAssessments({ eventId: eid }))),
          Promise.all(eventIds.map((eid) => centerService.listCenters(eid))),
        ]);

        const seen = new Set<string>();
        const combined: Assessment[] = [];
        for (const batch of assessmentsByEvent) {
          for (const a of batch) {
            if (!seen.has(a.id)) { seen.add(a.id); combined.push(a); }
          }
        }
        setEventAssessments(combined);

        const seenCenters = new Set<string>();
        const combinedCenters: Center[] = [];
        for (const batch of centersByEvent) {
          for (const c of batch) {
            if (!seenCenters.has(c.id)) { seenCenters.add(c.id); combinedCenters.push(c); }
          }
        }
        setEventCenters(combinedCenters);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    }
  };

  const awaitingAssessment = myAssessments.filter((a) => a.status === 'awaitingAssessment');

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
              <Typography variant="h3">{myAssessments.length}</Typography>
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
              <Typography variant="h6" gutterBottom>Open New Case</Typography>
              <Typography variant="body2">Submit a new intake for a survivor</Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/assessments/create')}
              >
                Open New Case
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* My Cases */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Cases</Typography>
            <Divider sx={{ mb: 2 }} />
            {myAssessments.length === 0 ? (
              <Typography color="text.secondary">No cases assigned to you yet</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {myAssessments.map((a) => (
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
                          onClick={() => navigate(`/assessments/${a.id}/field-assessment`)}
                        >
                          Start Field Assessment
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/assessments/${a.id}`)}
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

        {/* Centers */}
        {eventCenters.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Centers</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {eventCenters.map((c) => (
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
                    <Button size="small" variant="outlined" onClick={() => navigate(`/centers/${c.id}`)}>
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
              <AssessmentMap assessments={eventAssessments} centers={eventCenters} />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
