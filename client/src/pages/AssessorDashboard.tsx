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
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessment.service';
import type { Assessment } from '../types';

export const AssessorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myAssessments, setMyAssessments] = useState<Assessment[]>([]);
  const [flaggedAssessments, setFlaggedAssessments] = useState<Assessment[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all assessments and filter by current user
      const allAssessments = await assessmentService.listAssessments();
      const mine = allAssessments.filter((a) => a.assessorId === user?.id);
      const flagged = allAssessments.filter((a) => a.flaggedForReview);

      setMyAssessments(mine);
      setFlaggedAssessments(flagged);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Assessor Dashboard
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
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">My Assessments</Typography>
              </Box>
              <Typography variant="h3">{myAssessments.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/assessments')}>
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Flagged</Typography>
              </Box>
              <Typography variant="h3">{flaggedAssessments.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/assessments?flagged=true')}>
                Review
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Assessment
              </Typography>
              <Typography variant="body2">Submit a new disaster assessment</Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/assessments/create')}
              >
                New Assessment
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Recent Assessments */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              My Recent Assessments
            </Typography>
            {myAssessments.length === 0 ? (
              <Typography color="text.secondary">No assessments yet</Typography>
            ) : (
              <List>
                {myAssessments.slice(0, 5).map((assessment) => (
                  <ListItem
                    key={assessment.id}
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
                    onClick={() => navigate(`/assessments/${assessment.id}`)}
                  >
                    <ListItemText
                      primary={assessment.placeName}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span">
                            {assessment.address}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={assessment.severity}
                              size="small"
                              color={getSeverityColor(assessment.severity) as any}
                              sx={{ mr: 1 }}
                            />
                            {assessment.flaggedForReview && (
                              <Chip
                                label="Flagged for Review"
                                size="small"
                                color="warning"
                                sx={{ mr: 1 }}
                              />
                            )}
                            <Chip
                              label={`${assessment.affectedPeople} people affected`}
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
