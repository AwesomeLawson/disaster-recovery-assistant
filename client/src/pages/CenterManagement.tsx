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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { centerService } from '../services/center.service';
import { eventService } from '../services/event.service';
import type { Center, Event } from '../types';

export const CenterManagement: React.FC = () => {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [centersData, eventsData] = await Promise.all([
        centerService.listCenters(),
        eventService.listEvents(),
      ]);
      setCenters(centersData);
      setEvents(eventsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCenter = async () => {
    try {
      await centerService.createCenter({
        name: formData.name,
        address: formData.address,
      });
      setOpenDialog(false);
      setFormData({ name: '', address: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create center');
    }
  };

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || 'Unknown Event';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Center Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Center
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {centers.length === 0 ? (
          <Typography color="text.secondary">No centers found. Create your first center!</Typography>
        ) : (
          <List>
            {centers.map((center) => (
              <ListItem
                key={center.id}
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
                onClick={() => navigate(`/centers/${center.id}`)}
              >
                <ListItemText
                  primary={center.name}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        {center.address}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {center.eventIds && center.eventIds.length > 0 ? (
                          center.eventIds.map((eventId) => (
                            <Chip
                              key={eventId}
                              label={getEventName(eventId)}
                              size="small"
                              color="primary"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))
                        ) : (
                          <Chip
                            label="No events"
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                        )}
                        <Chip
                          label={`${center.leadUserIds.length} leads`}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Center</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Center Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Address"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">
            You can associate this center with events after creation from the center details page.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCenter}
            variant="contained"
            disabled={!formData.name || !formData.address}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
