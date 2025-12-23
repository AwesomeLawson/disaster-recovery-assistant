import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { workgroupService } from '../services/workgroup.service';
import { useAuth } from '../context/AuthContext';
import type { Workgroup } from '../types';

export const WorkgroupManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workgroups, setWorkgroups] = useState<Workgroup[]>([]);
  const [filteredWorkgroups, setFilteredWorkgroups] = useState<Workgroup[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorkgroups();
  }, []);

  const loadWorkgroups = async () => {
    try {
      setLoading(true);
      const data = await workgroupService.listWorkgroups();
      setWorkgroups(data);
      setFilteredWorkgroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workgroups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = workgroups.filter((w) =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkgroups(filtered);
    } else {
      setFilteredWorkgroups(workgroups);
    }
  }, [searchTerm, workgroups]);

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

  const canCreateWorkgroup =
    user?.roles.includes('workGroupLead') || user?.roles.includes('administrator');

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workgroups</Typography>
        {canCreateWorkgroup && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/workgroups/create')}
          >
            New Workgroup
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
          placeholder="Search workgroups..."
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

        {filteredWorkgroups.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm ? 'No workgroups match your search' : 'No workgroups found'}
          </Typography>
        ) : (
          <List>
            {filteredWorkgroups.map((workgroup) => (
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
    </Container>
  );
};
