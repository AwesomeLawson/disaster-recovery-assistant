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
import { eventService } from '../services/event.service';
import type { Event } from '../types';

export const EventManagement: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    eventType: '',
    description: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.listEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      await eventService.createEvent(formData);
      setOpenDialog(false);
      setFormData({ name: '', eventType: '', description: '' });
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Event Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Event
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {events.length === 0 ? (
          <Typography color="text.secondary">No events found. Create your first event!</Typography>
        ) : (
          <List>
            {events.map((event) => (
              <ListItem
                key={event.id}
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
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <ListItemText
                  primary={event.name}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        {event.description || 'No description'}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={event.eventType} size="small" sx={{ mr: 1 }} />
                        <Chip
                          label={`${event.userIds.length} users`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`${event.centerIds.length} centers`}
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
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Event Type"
            type="text"
            fullWidth
            variant="outlined"
            placeholder="e.g., Hurricane, Flood, Tornado, Earthquake"
            value={formData.eventType}
            onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateEvent}
            variant="contained"
            disabled={!formData.name || !formData.eventType}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
