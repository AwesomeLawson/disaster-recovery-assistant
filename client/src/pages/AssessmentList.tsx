import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { assessmentService } from '../services/assessment.service';
import { useAuth } from '../context/AuthContext';
import type { Assessment } from '../types';

export const AssessmentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAssessments();
  }, [searchParams]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const flagged = searchParams.get('flagged') === 'true';
      const data = await assessmentService.listAssessments({
        flaggedForReview: flagged || undefined,
      });
      setAssessments(data);
      setFilteredAssessments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = assessments.filter(
        (a) =>
          a.placeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssessments(filtered);
    } else {
      setFilteredAssessments(assessments);
    }
  }, [searchTerm, assessments]);

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

  const canCreateAssessment = user?.roles.includes('assessor') || user?.roles.includes('administrator');

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Assessments</Typography>
        {canCreateAssessment && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/assessments/create')}
          >
            New Assessment
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <TextField
          fullWidth
          placeholder="Search assessments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {filteredAssessments.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm ? 'No assessments match your search' : 'No assessments found'}
          </Typography>
        ) : (
          <List>
            {filteredAssessments.map((assessment) => (
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
                          sx={{ mr: 1 }}
                        />
                        {assessment.photoUrls.length > 0 && (
                          <Chip
                            label={`${assessment.photoUrls.length} photos`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};
