import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  TextField,
  Snackbar,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/event.service';
import { userEventDataService } from '../services/userEventData.service';
import { volunteerHoursService } from '../services/volunteerHours.service';
import type { Event as DisasterEvent, UserEventData, VolunteerHours, AvailabilityRange } from '../types';

interface DayRow {
  dateMs: number;          // midnight local of day
  dateLabel: string;
  hours: number;
  notes: string;
  showNote: boolean;
}

const formatDateLabel = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

// Expand a list of AvailabilityRange to individual day midnights (deduped, sorted)
const expandRangesToDays = (ranges: AvailabilityRange[]): number[] => {
  const days = new Set<number>();
  for (const r of ranges) {
    const start = new Date(r.start);
    const end = new Date(r.end);
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor.getTime() <= last.getTime()) {
      days.add(cursor.getTime());
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return Array.from(days).sort((a, b) => a - b);
};

export const LogHours: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [myEventData, setMyEventData] = useState<UserEventData[]>([]);
  const [existingHours, setExistingHours] = useState<VolunteerHours[]>([]);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

  // Load events the user is assigned to + my userEventData
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const [allEvents, mine] = await Promise.all([
          eventService.listEvents(),
          userEventDataService.listMine(),
        ]);
        const assignedEvents = allEvents.filter((e) => e.userIds?.includes(user.id));
        setEvents(assignedEvents);
        setMyEventData(mine);
      } catch (err: any) {
        setError(err.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // When event selection changes, build rows from confirmed dates + prefill existing hours
  useEffect(() => {
    if (!selectedEventId || !user) {
      setRows([]);
      return;
    }
    (async () => {
      try {
        setLoadingRows(true);
        setError('');
        const eventData = myEventData.find((d) => d.eventId === selectedEventId);
        const days = expandRangesToDays(eventData?.confirmedDates ?? []);

        const hours = await volunteerHoursService.listMine(selectedEventId);
        setExistingHours(hours);

        const hoursByDate = new Map<number, VolunteerHours>();
        for (const h of hours) hoursByDate.set(h.date, h);

        const built: DayRow[] = days.map((dateMs) => {
          const existing = hoursByDate.get(dateMs);
          return {
            dateMs,
            dateLabel: formatDateLabel(dateMs),
            hours: existing?.hours ?? 0,
            notes: existing?.notes ?? '',
            showNote: !!existing?.notes,
          };
        });
        setRows(built);
      } catch (err: any) {
        setError(err.message || 'Failed to load hours');
      } finally {
        setLoadingRows(false);
      }
    })();
  }, [selectedEventId, myEventData, user]);

  const updateRow = (idx: number, patch: Partial<DayRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    setError('');
    try {
      // Build entries: include zero rows only if a row previously had hours (so server can delete)
      const previousByDate = new Map<number, VolunteerHours>();
      for (const h of existingHours) previousByDate.set(h.date, h);

      const entries = rows
        .filter((r) => r.hours > 0 || previousByDate.has(r.dateMs))
        .map((r) => ({
          date: r.dateMs,
          hours: r.hours,
          ...(r.notes ? { notes: r.notes } : {}),
        }));

      await volunteerHoursService.logHours(selectedEventId, entries);

      // Refresh existing hours snapshot
      const refreshed = await volunteerHoursService.listMine(selectedEventId);
      setExistingHours(refreshed);
      setSuccessOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const hasConfirmedDates = useMemo(() => rows.length > 0, [rows]);

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 1 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" gutterBottom>Log Volunteer Hours</Typography>
        <Typography variant="body2" color="text.secondary">
          Record the hours you worked on each confirmed deployment day.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Event</InputLabel>
          <Select
            value={selectedEventId}
            label="Event"
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading}
          >
            <MenuItem value=""><em>Select an event…</em></MenuItem>
            {events.map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && events.length === 0 && (
          <Alert severity="info">You haven't been assigned to any events yet.</Alert>
        )}

        {!loading && selectedEventId && loadingRows && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && selectedEventId && !loadingRows && !hasConfirmedDates && (
          <Alert severity="info">
            No confirmed deployment days yet. Once an admin confirms your availability,
            you'll be able to log hours here.
          </Alert>
        )}

        {!loadingRows && hasConfirmedDates && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Confirmed Deployment Days</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rows.map((row, idx) => (
                <Box key={row.dateMs} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body1" sx={{ minWidth: 220, flex: 1 }}>
                      {row.dateLabel}
                    </Typography>
                    <TextField
                      label="Hours"
                      type="number"
                      size="small"
                      value={row.hours}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateRow(idx, { hours: isNaN(v) ? 0 : v });
                      }}
                      inputProps={{ min: 0, max: 24, step: 0.25 }}
                      sx={{ width: 120 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => updateRow(idx, { showNote: !row.showNote })}
                      title={row.showNote ? 'Hide note' : 'Add note'}
                    >
                      <NoteAddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Collapse in={row.showNote}>
                    <TextField
                      label="Note (optional)"
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      value={row.notes}
                      onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    />
                  </Collapse>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Hours'}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        message="Hours saved"
      />
    </Container>
  );
};
