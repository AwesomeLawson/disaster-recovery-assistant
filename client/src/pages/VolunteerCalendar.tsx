import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { userEventDataService } from '../services/userEventData.service';
import { userService } from '../services/user.service';
import { eventService } from '../services/event.service';
import type { UserEventData, User, Event as DisasterEvent } from '../types';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: 'confirmed' | 'pending';
  volunteerName: string;
  disasterEventName: string;
  notes?: string;
}

export const VolunteerCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [allData, setAllData] = useState<UserEventData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [disasterEvents, setDisasterEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [showPending, setShowPending] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, allUsers, events] = await Promise.all([
          userEventDataService.listAll(),
          userService.listUsers(),
          eventService.listEvents(),
        ]);
        setAllData(data);
        setUsers(allUsers);
        setDisasterEvents(events);
      } catch (err: any) {
        setError(err.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const eventMap = Object.fromEntries(disasterEvents.map((e) => [e.id, e]));

  const calendarEvents: CalEvent[] = [];

  for (const data of allData) {
    if (filterEventId !== 'all' && data.eventId !== filterEventId) continue;

    const u = userMap[data.userId];
    const volunteerName = u ? `${u.firstName} ${u.lastName}` : 'Unknown Volunteer';
    const disasterEventName = eventMap[data.eventId]?.name ?? 'Unknown Event';

    for (const range of data.confirmedDates) {
      const end = new Date(range.end);
      // react-big-calendar treats end as exclusive for all-day events; add a day so multi-day ranges render fully
      end.setDate(end.getDate() + 1);
      calendarEvents.push({
        id: `${data.id}-confirmed-${range.start}`,
        title: volunteerName,
        start: new Date(range.start),
        end,
        status: 'confirmed',
        volunteerName,
        disasterEventName,
        notes: data.notes,
      });
    }

    if (showPending) {
      for (const range of data.submittedAvailability) {
        const end = new Date(range.end);
        end.setDate(end.getDate() + 1);
        calendarEvents.push({
          id: `${data.id}-pending-${range.start}`,
          title: `${volunteerName} (pending)`,
          start: new Date(range.start),
          end,
          status: 'pending',
          volunteerName,
          disasterEventName,
          notes: data.notes,
        });
      }
    }
  }

  const eventPropGetter = useCallback((event: object) => {
    const e = event as CalEvent;
    if (e.status === 'confirmed') {
      return { style: { backgroundColor: '#2e7d32', borderColor: '#1b5e20', color: '#fff' } };
    }
    return { style: { backgroundColor: '#1565c0', borderColor: '#0d47a1', color: '#fff', opacity: 0.75 } };
  }, []);

  const handleSelectEvent = useCallback((event: object) => {
    setSelectedEvent(event as CalEvent);
  }, []);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 1 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" gutterBottom>Volunteer Calendar</Typography>
        <Typography variant="body2" color="text.secondary">
          Availability dates submitted and confirmed for all volunteers.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filter by Event</InputLabel>
          <Select
            value={filterEventId}
            label="Filter by Event"
            onChange={(e) => setFilterEventId(e.target.value)}
          >
            <MenuItem value="all">All Events</MenuItem>
            {disasterEvents.map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Confirmed" size="small" sx={{ bgcolor: '#2e7d32', color: '#fff' }} />
          <Chip label="Pending" size="small" sx={{ bgcolor: '#1565c0', color: '#fff', opacity: 0.75 }} />
        </Box>

        <Button
          variant={showPending ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setShowPending((p) => !p)}
        >
          {showPending ? 'Hide Pending' : 'Show Pending'}
        </Button>

        {loading && (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ height: 680 }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventPropGetter as any}
            onSelectEvent={handleSelectEvent}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            popup
          />
        </Box>
      </Paper>

      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="xs" fullWidth>
        {selectedEvent && (
          <>
            <DialogTitle>{selectedEvent.volunteerName}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedEvent.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      size="small"
                      sx={{
                        bgcolor: selectedEvent.status === 'confirmed' ? '#2e7d32' : '#1565c0',
                        color: '#fff',
                      }}
                    />
                  </Box>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">Dates</Typography>
                  <Typography variant="body2">
                    {format(selectedEvent.start, 'MMM d, yyyy')}
                    {' – '}
                    {format(new Date(selectedEvent.end.getTime() - 86400000), 'MMM d, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Event</Typography>
                  <Typography variant="body2">{selectedEvent.disasterEventName}</Typography>
                </Box>
                {selectedEvent.notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{selectedEvent.notes}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedEvent(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
