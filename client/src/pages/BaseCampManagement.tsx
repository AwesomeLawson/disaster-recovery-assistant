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
import { baseCampService } from '../services/baseCamp.service';
import { eventService } from '../services/event.service';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import type { BaseCamp, Event } from '../types';

export const BaseCampManagement: React.FC = () => {
  const navigate = useNavigate();
  const [baseCamps, setBaseCamps] = useState<BaseCamp[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [baseCampsData, eventsData] = await Promise.all([
        baseCampService.listBaseCamps(),
        eventService.listEvents(),
      ]);
      setBaseCamps(baseCampsData);
      setEvents(eventsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBaseCamp = async () => {
    try {
      await baseCampService.createBaseCamp({
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
      setOpenDialog(false);
      setFormData({ name: '', address: '', latitude: undefined, longitude: undefined });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create base camp');
    }
  };

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || 'Unknown Event';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Base Camp Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Base Camp
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {baseCamps.length === 0 ? (
          <Typography color="text.secondary">No base camps found. Create your first base camp!</Typography>
        ) : (
          <List>
            {baseCamps.map((baseCamp) => (
              <ListItem
                key={baseCamp.id}
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
                onClick={() => navigate(`/base-camps/${baseCamp.id}`)}
              >
                <ListItemText
                  primary={baseCamp.name}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        {baseCamp.address}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {baseCamp.eventIds && baseCamp.eventIds.length > 0 ? (
                          baseCamp.eventIds.map((eventId) => (
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
                          label={`${baseCamp.leadUserIds.length} leads`}
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
        <DialogTitle>Create New Base Camp</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Base Camp Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <Box sx={{ mb: 2 }}>
            <AddressAutocomplete
              required
              value={formData.address}
              onChange={(address) =>
                setFormData({ ...formData, address, latitude: undefined, longitude: undefined })
              }
              onPlaceSelect={({ address, latitude, longitude }) =>
                setFormData({ ...formData, address, latitude, longitude })
              }
              coordinates={
                formData.latitude != null && formData.longitude != null
                  ? { latitude: formData.latitude, longitude: formData.longitude }
                  : null
              }
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            You can associate this base camp with events after creation from the base camp details page.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateBaseCamp}
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
