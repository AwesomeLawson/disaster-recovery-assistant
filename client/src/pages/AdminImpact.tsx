import React, { useEffect, useState, useMemo } from 'react';
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
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { eventService } from '../services/event.service';
import { volunteerHoursService, type ImpactStats } from '../services/volunteerHours.service';
import type { Event as DisasterEvent, VolunteerHours } from '../types';

const csvEscape = (v: any) => {
  const s = v == null ? '' : String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
};

// Parse a yyyy-mm-dd input value to local midnight unix ms
const parseDateInputLocal = (s: string): number | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d).getTime();
};

// Add one day minus 1ms for end-of-day inclusive
const endOfDay = (ms: number): number => ms + 24 * 60 * 60 * 1000 - 1;

export const AdminImpact: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [filterEventId, setFilterEventId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [rows, setRows] = useState<VolunteerHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const allEvents = await eventService.listEvents();
        setEvents(allEvents);
      } catch (err: any) {
        setError(err.message || 'Failed to load events');
      }
    })();
  }, []);

  // Refetch stats + rows whenever filters change
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const startMs = parseDateInputLocal(filterStartDate);
        const endMsRaw = parseDateInputLocal(filterEndDate);
        const endMs = endMsRaw !== undefined ? endOfDay(endMsRaw) : undefined;
        const filter = {
          ...(filterEventId ? { eventId: filterEventId } : {}),
          ...(startMs !== undefined ? { startDate: startMs } : {}),
          ...(endMs !== undefined ? { endDate: endMs } : {}),
        };

        const [s, r] = await Promise.all([
          volunteerHoursService.getImpactStats(filter),
          volunteerHoursService.listAll(filter),
        ]);
        setStats(s);
        setRows(r);
      } catch (err: any) {
        setError(err.message || 'Failed to load impact data');
      } finally {
        setLoading(false);
      }
    })();
  }, [filterEventId, filterStartDate, filterEndDate]);

  const eventNameById = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e.name])),
    [events]
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.date - a.date),
    [rows]
  );

  const handleExportCSV = () => {
    const headers = ['Date', 'Volunteer', 'Event', 'Hours', 'Notes'];
    const out = sortedRows.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.userName,
      eventNameById[r.eventId] ?? r.eventId,
      r.hours,
      r.notes ?? '',
    ].map(csvEscape).join(','));
    const csv = [headers.map(csvEscape).join(','), ...out].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faith-responders-volunteer-hours-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 1 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" gutterBottom>Impact</Typography>
        <Typography variant="body2" color="text.secondary">
          Aggregate volunteer impact across events. Use this for grant and fundraising reporting.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Event</InputLabel>
            <Select
              value={filterEventId}
              label="Event"
              onChange={(e) => setFilterEventId(e.target.value)}
            >
              <MenuItem value=""><em>All Events</em></MenuItem>
              {events.map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />

          {(filterEventId || filterStartDate || filterEndDate) && (
            <Button
              size="small"
              onClick={() => {
                setFilterEventId('');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
            >
              Clear filters
            </Button>
          )}
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && stats && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Families Served</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                    {stats.familiesServed.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed work orders
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Hours Logged</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                    {stats.totalHours.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    By {stats.uniqueVolunteers} volunteers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Estimated Dollar Value</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                    {`$${stats.dollarValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Based on ${stats.hourlyRate}/hr IRS Independent Sector rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={rows.length === 0}
            >
              Export CSV
            </Button>
          </Box>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Volunteer</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No hours logged for the current filter.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {sortedRows.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.userName}</TableCell>
                    <TableCell>{eventNameById[r.eventId] ?? r.eventId}</TableCell>
                    <TableCell align="right">{r.hours}</TableCell>
                    <TableCell>{r.notes ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sortedRows.length > 100 && (
              <Box sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing top 100 of {sortedRows.length} rows. Export CSV for the full list.
                </Typography>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};
