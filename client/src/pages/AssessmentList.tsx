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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { assessmentService } from '../services/assessment.service';
import { useAuth } from '../context/AuthContext';
import type { Assessment, CaseStatus } from '../types';

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

export const AssessmentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>('');

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
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = assessments;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.survivorName?.toLowerCase().includes(term) ||
          a.address?.toLowerCase().includes(term) ||
          a.placeName?.toLowerCase().includes(term) ||
          a.caseNumber?.toLowerCase().includes(term)
      );
    }
    if (statusFilter) {
      result = result.filter((a) => (a.status ?? 'intake') === statusFilter);
    }
    setFilteredAssessments(result);
  }, [searchTerm, statusFilter, assessments]);

  const canOpenCase =
    user?.roles.includes('administrator') ||
    user?.roles.includes('fieldCoordinator') ||
    user?.roles.includes('assessor');

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Cases</Typography>
        {canOpenCase && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/assessments/create')}>
            Open New Case
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, address, or case #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as CaseStatus | '')}
            >
              <MenuItem value=""><em>All Statuses</em></MenuItem>
              {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {filteredAssessments.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm || statusFilter ? 'No cases match your filters' : 'No cases found'}
          </Typography>
        ) : (
          <List disablePadding>
            {filteredAssessments.map((assessment) => {
              const status = (assessment.status ?? 'intake') as CaseStatus;
              return (
                <ListItem
                  key={assessment.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                  onClick={() => navigate(`/assessments/${assessment.id}`)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" fontWeight={600}>{assessment.survivorName}</Typography>
                        {assessment.caseNumber && (
                          <Typography variant="caption" color="text.secondary">#{assessment.caseNumber}</Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" component="div" color="text.secondary">
                          {assessment.address}
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip label={STATUS_LABELS[status]} size="small" color={STATUS_COLORS[status]} />
                          {assessment.severity && (
                            <Chip
                              label={assessment.severity.toUpperCase()}
                              size="small"
                              color={
                                assessment.severity === 'critical' ? 'error' :
                                assessment.severity === 'high' ? 'warning' :
                                assessment.severity === 'medium' ? 'info' : 'default'
                              }
                            />
                          )}
                          {assessment.flaggedForReview && (
                            <Chip label="Flagged" size="small" color="warning" />
                          )}
                          {(assessment.photoUrls?.length ?? 0) > 0 && (
                            <Chip label={`${assessment.photoUrls.length} photos`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
};
