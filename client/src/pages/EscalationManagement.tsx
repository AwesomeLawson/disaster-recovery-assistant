import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { escalationService } from '../services/escalation.service';
import { userService } from '../services/user.service';
import type { Escalation, EscalationStatus, User } from '../types';

export const EscalationManagement: React.FC = () => {
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [filteredEscalations, setFilteredEscalations] = useState<Escalation[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [escalationsData, usersData] = await Promise.all([
        escalationService.listEscalations(),
        userService.listUsers(),
      ]);
      setEscalations(escalationsData);
      setFilteredEscalations(escalationsData);

      const usersMap: Record<string, User> = {};
      usersData.forEach((user) => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = escalations;

    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.resolution && e.resolution.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    setFilteredEscalations(filtered);
  }, [searchTerm, statusFilter, typeFilter, escalations]);

  const handleStatusUpdate = async (escalation: Escalation, newStatus: EscalationStatus) => {
    try {
      setUpdating(true);
      await escalationService.updateEscalationStatus(escalation.id, newStatus);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update escalation');
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedEscalation || !resolution.trim()) return;

    try {
      setUpdating(true);
      await escalationService.resolveEscalation(selectedEscalation.id, resolution);
      setDialogOpen(false);
      setSelectedEscalation(null);
      setResolution('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve escalation');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inProgress':
        return 'info';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assessor':
        return 'primary';
      case 'administrative':
        return 'secondary';
      case 'thirdParty':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assessor':
        return 'Assessor Reassessment';
      case 'administrative':
        return 'Administrative Support';
      case 'thirdParty':
        return 'Third Party Support';
      default:
        return type;
    }
  };

  const openResolveDialog = (escalation: Escalation) => {
    setSelectedEscalation(escalation);
    setResolution('');
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading escalations...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Escalation Management</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by reason..."
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
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="inProgress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="assessor">Assessor</MenuItem>
              <MenuItem value="administrative">Administrative</MenuItem>
              <MenuItem value="thirdParty">Third Party</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredEscalations.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No escalations match your filters'
              : 'No escalations found'}
          </Typography>
        ) : (
          <List>
            {filteredEscalations.map((escalation) => (
              <ListItem
                key={escalation.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  mb: 1,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{escalation.reason}</Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ mb: 1 }}>
                          <Chip
                            label={escalation.status}
                            size="small"
                            color={getStatusColor(escalation.status) as any}
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={getTypeLabel(escalation.type)}
                            size="small"
                            color={getTypeColor(escalation.type) as any}
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                        </Box>
                        <Typography variant="body2" component="div">
                          Created by: {users[escalation.createdBy]?.email || escalation.createdBy}
                        </Typography>
                        {escalation.assignedTo && (
                          <Typography variant="body2" component="div">
                            Assigned to: {users[escalation.assignedTo]?.email || escalation.assignedTo}
                          </Typography>
                        )}
                        <Typography variant="body2" component="div">
                          Created: {new Date(escalation.createdAt).toLocaleString()}
                        </Typography>
                        {escalation.resolution && (
                          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                            Resolution: {escalation.resolution}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {escalation.workgroupId && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/workgroups/${escalation.workgroupId}`)}
                      >
                        View Workgroup
                      </Button>
                    )}
                    {escalation.assessmentId && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/assessments/${escalation.assessmentId}`)}
                      >
                        View Assessment
                      </Button>
                    )}
                  </Box>
                </Box>
                {escalation.status !== 'resolved' && escalation.status !== 'rejected' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, width: '100%', justifyContent: 'flex-end' }}>
                    {escalation.status === 'pending' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        disabled={updating}
                        onClick={() => handleStatusUpdate(escalation, 'inProgress')}
                      >
                        Start Working
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={updating}
                      onClick={() => openResolveDialog(escalation)}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={updating}
                      onClick={() => handleStatusUpdate(escalation, 'rejected')}
                    >
                      Reject
                    </Button>
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Escalation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedEscalation && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Reason
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedEscalation.reason}
                </Typography>
              </>
            )}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution"
              placeholder="Describe how this escalation was resolved..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={updating || !resolution.trim()}
          >
            Resolve
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
