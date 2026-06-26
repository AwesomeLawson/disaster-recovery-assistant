import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  InputAdornment,
  Chip,
  Autocomplete,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import MergeIcon from '@mui/icons-material/Merge';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { organizationService } from '../services/organization.service';
import type { ManagedOrganization } from '../services/organization.service';
import { userService } from '../services/user.service';

// Normalize an org name for fuzzy duplicate detection.
// Strips case/punctuation, leading "the", and common org-suffix words ("church", "ministries", etc.).
function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,'"!?()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '')
    .replace(/\s+(churches?|ministry|ministries|fellowship|inc|incorporated|llc|corp|corporation|company|co|org|organization|center|centre)$/i, '')
    .trim();
}

function findDuplicateGroups(names: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const norm = normalizeOrgName(name);
    if (norm.length < 3) continue;
    const arr = groups.get(norm) || [];
    arr.push(name);
    groups.set(norm, arr);
  }
  return Array.from(groups.values()).filter((g) => g.length > 1);
}

export const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<ManagedOrganization[]>([]);
  const [filtered, setFiltered] = useState<ManagedOrganization[]>([]);
  const [volunteerOrgs, setVolunteerOrgs] = useState<string[]>([]);
  const [filteredVolunteer, setFilteredVolunteer] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ManagedOrganization | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState('');

  // All known org names (managed + volunteer-entered), deduped.
  const allOrgNames = useMemo(() => {
    const set = new Set<string>();
    organizations.forEach((o) => set.add(o.name));
    volunteerOrgs.forEach((n) => set.add(n));
    return Array.from(set).sort();
  }, [organizations, volunteerOrgs]);

  const duplicateGroups = useMemo(() => findDuplicateGroups(allOrgNames), [allOrgNames]);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFiltered(
      term
        ? organizations.filter((o) => o.name.toLowerCase().includes(term))
        : organizations
    );
    setFilteredVolunteer(
      term
        ? volunteerOrgs.filter((o) => o.toLowerCase().includes(term))
        : volunteerOrgs
    );
  }, [searchTerm, organizations, volunteerOrgs]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const [managed, allNames] = await Promise.all([
        organizationService.listManagedOrganizations(),
        userService.listOrganizations(),
      ]);
      setOrganizations(managed);
      const managedNames = new Set(managed.map((o) => o.name.toLowerCase()));
      setVolunteerOrgs(allNames.filter((n) => !managedNames.has(n.toLowerCase())));
    } catch (err: any) {
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      await organizationService.createOrganization(newName.trim());
      setNewName('');
      setAddDialogOpen(false);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (name: string) => {
    try {
      await organizationService.createOrganization(name);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Failed to add organization');
    }
  };

  const openMergeDialog = (source?: string, target?: string) => {
    setMergeSource(source || null);
    setMergeTarget(target || null);
    setMergeOpen(true);
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    try {
      setMerging(true);
      const result = await organizationService.mergeOrganizations(mergeSource, mergeTarget);
      setMergeSuccess(`Merged "${mergeSource}" → "${mergeTarget}". Updated ${result.usersUpdated} user${result.usersUpdated !== 1 ? 's' : ''}.`);
      setMergeOpen(false);
      setMergeSource(null);
      setMergeTarget(null);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Failed to merge organizations');
    } finally {
      setMerging(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await organizationService.deleteOrganization(deleteTarget.id);
      setDeleteTarget(null);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h4">Organizations</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<MergeIcon />}
            onClick={() => openMergeDialog()}
            disabled={allOrgNames.length < 2}
          >
            Merge
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
            Add Organization
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {mergeSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMergeSuccess('')}>
          {mergeSuccess}
        </Alert>
      )}

      {/* Possible duplicates */}
      {!loading && duplicateGroups.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid', borderColor: 'warning.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WarningAmberIcon color="warning" fontSize="small" />
            <Typography variant="subtitle1">
              Possible duplicates ({duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''})
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            These names look similar after stripping case, punctuation, and common suffixes like "Church" or "Ministries". Review and merge if they're the same entity.
          </Typography>
          <Stack spacing={1.5}>
            {duplicateGroups.map((group, idx) => (
              <Box
                key={idx}
                sx={{
                  border: '1px solid',
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  {group.map((name) => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      sx={{
                        height: 'auto',
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          display: 'block',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          py: 0.5,
                        },
                      }}
                    />
                  ))}
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MergeIcon />}
                  onClick={() => openMergeDialog(group[0], group[group.length - 1])}
                  sx={{ flexShrink: 0 }}
                >
                  Review & Merge
                </Button>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''} in the master list
          </Typography>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220 }}
          />
        </Box>
        <Divider sx={{ mb: 1 }} />

        {loading ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>Loading...</Typography>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {searchTerm ? 'No matches found' : 'No organizations yet'}
          </Typography>
        ) : (
          <List disablePadding>
            {filtered.map((org) => (
              <ListItem
                key={org.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'grey.100',
                  '&:last-child': { borderBottom: 'none' },
                  px: 0,
                }}
                secondaryAction={
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(org)}
                    edge="end"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText primary={org.name} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Volunteer-entered organizations */}
      {!loading && (filteredVolunteer.length > 0 || (searchTerm && volunteerOrgs.length > 0)) && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon color="action" fontSize="small" />
            <Typography variant="subtitle1" color="text.secondary">
              Written in by volunteers ({volunteerOrgs.length} not yet in master list)
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {filteredVolunteer.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No matches found</Typography>
          ) : (
            <List disablePadding>
              {filteredVolunteer.map((name) => (
                <ListItem
                  key={name}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'grey.100',
                    '&:last-child': { borderBottom: 'none' },
                    px: 0,
                  }}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handlePromote(name)}
                    >
                      Add to master list
                    </Button>
                  }
                >
                  <ListItemText
                    primary={name}
                    secondary={<Chip label="volunteer-entered" size="small" variant="outlined" sx={{ mt: 0.5 }} />}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Organization Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setNewName(''); }} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving || !newName.trim()}>
            {saving ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog
        open={mergeOpen}
        onClose={() => !merging && setMergeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Merge Organizations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick two organization names that should be the same entity, then choose which one to keep as the canonical name. All user records will be updated.
          </Typography>
          <Stack spacing={2}>
            <Autocomplete
              options={allOrgNames}
              value={mergeSource}
              onChange={(_, v) => setMergeSource(v)}
              renderInput={(params) => <TextField {...params} label="Organization A" />}
            />
            <Autocomplete
              options={allOrgNames.filter((n) => n !== mergeSource)}
              value={mergeTarget}
              onChange={(_, v) => setMergeTarget(v)}
              renderInput={(params) => <TextField {...params} label="Organization B" />}
            />
            {mergeSource && mergeTarget && mergeSource !== mergeTarget && (
              <FormControl>
                <FormLabel>Keep as canonical name</FormLabel>
                <RadioGroup
                  value={mergeTarget}
                  onChange={(e) => {
                    // The selected radio is the canonical (target); the other becomes source.
                    const keep = e.target.value;
                    const drop = keep === mergeSource ? mergeTarget : mergeSource;
                    setMergeSource(drop);
                    setMergeTarget(keep);
                  }}
                >
                  <FormControlLabel value={mergeSource} control={<Radio />} label={mergeSource} />
                  <FormControlLabel value={mergeTarget} control={<Radio />} label={mergeTarget} />
                </RadioGroup>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  "{mergeSource}" will be replaced with "{mergeTarget}" on all user records.
                </Typography>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)} disabled={merging}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleMerge}
            disabled={merging || !mergeSource || !mergeTarget || mergeSource === mergeTarget}
          >
            {merging ? 'Merging...' : 'Merge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Organization?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.name}</strong> from the master list? This won't affect
            existing user profiles that already have this organization saved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
