import React, { useEffect, useState } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import type { CommunicationPreference } from '../types';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { userService } from '../services/user.service';
import { legalReleaseService } from '../services/legalRelease.service';
import { eventService } from '../services/event.service';
import { userEventDataService } from '../services/userEventData.service';
import type { User, UserRole, UserCapability, LegalRelease, Event, UserEventData } from '../types';

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'assessor', label: 'Assessor' },
  { value: 'fieldCoordinator', label: 'Field Coordinator' },
  { value: 'baseCampHost', label: 'Base Camp Host' },
  { value: 'workGroupLead', label: 'Team Leader' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'secChaplain', label: 'SEC/Chaplain' },
];

const ALL_CAPABILITIES: { value: UserCapability; label: string }[] = [
  { value: 'trainer', label: 'Trainer' },
  { value: 'assessor', label: 'Assessor' },
  { value: 'basicDRT', label: 'Basic DRT' },
  { value: 'chainsaw', label: 'Chainsaw' },
  { value: 'spiritualEmotionalCare', label: 'Spiritual & Emotional Care' },
  { value: 'heavyEquipment', label: 'Heavy Equipment' },
  { value: 'construction', label: 'Construction' },
  { value: 'adminBaseCampSupport', label: 'Admin/Base Camp Support' },
];

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('all');
  const [bgCheckFilter, setBgCheckFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([]);
  const [editingCapabilities, setEditingCapabilities] = useState<UserCapability[]>([]);
  const [editingProfile, setEditingProfile] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    communicationPreference: 'email' as CommunicationPreference,
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    lastBackgroundCheck: '',
    contacted: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ creationTime: string; lastSignInTime: string; providers: string[] } | null>(null);
  const [authInfoLoading, setAuthInfoLoading] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseData, setReleaseData] = useState<LegalRelease | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [eventDataForUser, setEventDataForUser] = useState<UserEventData[]>([]);
  const [eventDataLoading, setEventDataLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmEventId, setConfirmEventId] = useState<string | null>(null);
  const [confirmRanges, setConfirmRanges] = useState<{ start: string; end: string }[]>([]);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    loadUsers();
    eventService.listEvents().then(setAllEvents).catch(() => {});
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.listUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const BG_CHECK_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

  const getBgCheckExpiry = (u: User): number | null =>
    u.lastBackgroundCheck ? u.lastBackgroundCheck + BG_CHECK_VALIDITY_MS : null;

  const getBgCheckStatus = (u: User): 'expired' | 'week' | 'twoWeeks' | 'ok' | 'none' => {
    const expiry = getBgCheckExpiry(u);
    if (expiry === null) return 'none';
    const now = Date.now();
    const msLeft = expiry - now;
    if (msLeft < 0) return 'expired';
    if (msLeft <= 7 * 24 * 60 * 60 * 1000) return 'week';
    if (msLeft <= 14 * 24 * 60 * 60 * 1000) return 'twoWeeks';
    return 'ok';
  };

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.phoneNumber.includes(term) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.roleApprovalStatus === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.roles.includes(roleFilter as UserRole));
    }

    if (capabilityFilter !== 'all') {
      filtered = filtered.filter((u) => (u.capabilities || []).includes(capabilityFilter as UserCapability));
    }

    if (bgCheckFilter !== 'all') {
      filtered = filtered.filter((u) => {
        const status = getBgCheckStatus(u);
        if (bgCheckFilter === 'expired') return status === 'expired';
        if (bgCheckFilter === 'week') return status === 'week';
        if (bgCheckFilter === 'twoWeeks') return status === 'week' || status === 'twoWeeks';
        if (bgCheckFilter === 'none') return status === 'none';
        return true;
      });
    }

    filtered = [...filtered].sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName);
      return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
    });

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, roleFilter, capabilityFilter, bgCheckFilter, users]);

  const handleApproveUser = async (user: User, approve: boolean, pendingBgCheckDate?: string) => {
    try {
      setSaving(true);
      // If approving and a bg check date was entered but not yet saved to Firestore, persist it first
      if (approve && pendingBgCheckDate && !user.lastBackgroundCheck) {
        await userService.updateUserProfile(user.id, {
          lastBackgroundCheck: new Date(pendingBgCheckDate).getTime(),
        });
      }
      await userService.approveUserRole(user.id, approve, user.requestedRoles || []);
      await loadUsers();
      setDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'error';
      case 'assessor': return 'primary';
      case 'fieldCoordinator': return 'secondary';
      case 'workGroupLead': return 'secondary';
      case 'volunteer': return 'info';
      case 'baseCampHost': return 'info';
      case 'secChaplain': return 'success';
      default: return 'default';
    }
  };

  const openUserDialog = async (user: User) => {
    setSelectedUser(user);
    setEditingRoles([...user.roles]);
    setEditingCapabilities([...(user.capabilities || [])]);
    setEditingProfile({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      communicationPreference: user.communicationPreference || 'email',
      addressStreet: user.address?.street || '',
      addressCity: user.address?.city || '',
      addressState: user.address?.state || '',
      addressZip: user.address?.zip || '',
      lastBackgroundCheck: user.lastBackgroundCheck
        ? new Date(user.lastBackgroundCheck).toISOString().split('T')[0]
        : '',
      contacted: user.contacted ?? false,
    });
    setAuthInfo(null);
    setEventDataForUser([]);
    setNoteText('');
    setNoteError('');
    setDialogOpen(true);
    setAuthInfoLoading(true);
    setEventDataLoading(true);
    userService.getUserAuthInfo(user.id)
      .then(setAuthInfo)
      .catch(() => {})
      .finally(() => setAuthInfoLoading(false));
    userEventDataService.listForUser(user.id)
      .then(setEventDataForUser)
      .catch(() => {})
      .finally(() => setEventDataLoading(false));
  };

  const handleRoleToggle = (role: UserRole) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCapabilityToggle = (cap: UserCapability) => {
    setEditingCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const hasAddress = editingProfile.addressStreet || editingProfile.addressCity || editingProfile.addressState || editingProfile.addressZip;
      await Promise.all([
        userService.updateUserProfile(selectedUser.id, {
          firstName: editingProfile.firstName,
          lastName: editingProfile.lastName,
          phoneNumber: editingProfile.phoneNumber,
          communicationPreference: editingProfile.communicationPreference,
          address: hasAddress
            ? { street: editingProfile.addressStreet, city: editingProfile.addressCity, state: editingProfile.addressState, zip: editingProfile.addressZip }
            : undefined,
          lastBackgroundCheck: editingProfile.lastBackgroundCheck
            ? new Date(editingProfile.lastBackgroundCheck).getTime()
            : undefined,
          contacted: editingProfile.contacted,
          capabilities: editingCapabilities,
        }),
        userService.updateUserRoles(selectedUser.id, editingRoles),
      ]);
      await loadUsers();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await userService.deleteUser(selectedUser.id);
      setDeleteConfirmOpen(false);
      setDialogOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    if (!window.confirm(
      `Open a new tab signed in as ${selectedUser.firstName} ${selectedUser.lastName}?\n\n` +
      `Any actions you take in that tab — messages, edits, form submissions — are REAL and recorded as them.`
    )) return;
    try {
      await userService.launchImpersonation(selectedUser.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start impersonation');
    }
  };

  const openConfirmDialog = (eventId: string) => {
    const data = eventDataForUser.find((d) => d.eventId === eventId);
    setConfirmRanges(
      (data?.confirmedDates ?? []).map((r) => ({
        start: new Date(r.start).toISOString().split('T')[0],
        end: new Date(r.end).toISOString().split('T')[0],
      }))
    );
    setConfirmNotes(data?.notes ?? '');
    setConfirmEventId(eventId);
    setConfirmError('');
    setConfirmDialogOpen(true);
  };

  const handleSaveConfirmedDates = async () => {
    if (!selectedUser || !confirmEventId) return;
    for (const r of confirmRanges) {
      if (!r.start || !r.end) {
        setConfirmError('Please complete all date ranges or remove incomplete ones');
        return;
      }
      if (r.start > r.end) {
        setConfirmError('End date must be after start date');
        return;
      }
    }
    setConfirmSaving(true);
    setConfirmError('');
    try {
      await userEventDataService.confirmDates(
        selectedUser.id,
        confirmEventId,
        confirmRanges.map((r) => ({ start: new Date(r.start).getTime(), end: new Date(r.end).getTime() })),
        confirmNotes || undefined,
      );
      setEventDataForUser(await userEventDataService.listForUser(selectedUser.id));
      setConfirmDialogOpen(false);
    } catch (err: any) {
      setConfirmError(err.message || 'Failed to save confirmed dates');
    } finally {
      setConfirmSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedUser || !noteText.trim()) return;
    setNoteSaving(true);
    setNoteError('');
    try {
      await userService.addContactNote(selectedUser.id, noteText.trim());
      setNoteText('');
      // Refresh user list so the latest note appears in the list view too
      const updatedUsers = await userService.listUsers();
      setUsers(updatedUsers);
      const refreshed = updatedUsers.find((u) => u.id === selectedUser.id);
      if (refreshed) setSelectedUser(refreshed);
    } catch (err: any) {
      setNoteError(err.message || 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleExport = () => {
    const BG_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;
    const csvEscape = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const capabilityLabel = (cap: string) =>
      ALL_CAPABILITIES.find((c) => c.value === cap)?.label ?? cap;

    const TSHIRT_LABELS: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra Large', '2XL': '2X', '3XL': '3X' };

    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Organization',
      'Address Street', 'Address City', 'Address State', 'Address ZIP',
      'Communication Preference', 'T-Shirt Size', 'Roles', 'Requested Roles', 'Approval Status',
      'Capabilities', 'Events', 'Availability',
      'Legal Release Signed', 'Contacted',
      'Background Check Date', 'Background Check Expiry',
      'Account Created',
    ];

    const rows = filteredUsers.map((u) => {
      const bgDate = u.lastBackgroundCheck ? new Date(u.lastBackgroundCheck).toLocaleDateString() : '';
      const bgExpiry = u.lastBackgroundCheck ? new Date(u.lastBackgroundCheck + BG_VALIDITY_MS).toLocaleDateString() : '';
      const avail = (u.availability || [])
        .map((r) => `${new Date(r.start).toLocaleDateString()}–${new Date(r.end).toLocaleDateString()}`)
        .join('; ');
      const caps = (u.capabilities || []).map(capabilityLabel).join('; ');
      return [
        u.firstName, u.lastName, u.email, u.phoneNumber, u.organization || '',
        u.address?.street || '', u.address?.city || '', u.address?.state || '', u.address?.zip || '',
        u.communicationPreference, u.tshirtSize ? (TSHIRT_LABELS[u.tshirtSize] ?? u.tshirtSize) : '', (u.roles || []).join('; '), (u.requestedRoles || []).join('; '), u.roleApprovalStatus,
        caps, (u.eventIds || []).join('; '), avail,
        u.legalReleaseSigned ? 'Yes' : 'No', u.contacted ? 'Yes' : 'No',
        bgDate, bgExpiry,
        new Date(u.createdAt).toLocaleDateString(),
      ].map(csvEscape).join(',');
    });

    const csv = [headers.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faith-responders-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const RELEASE_SECTIONS = [
    { id: 'travel', text: 'I have chosen to travel to the designated disaster response or recovery area to perform cleanup, response or recovery construction work designed to assist homeowners impacted by a disaster.' },
    { id: 'compliance', text: 'I acknowledge and agree that, in the event of a local disaster, any actions I take while representing or operating under the name of Faith Responders shall bind me, and any individual, organization, or church I am affiliated with for the purposes of such service, to full compliance with all safety protocols, procedures, rules, and regulations established by Faith Responders.' },
    { id: 'notification', text: 'I further acknowledge and agree that Faith Responders must be notified of, and made aware of, any actions, engagement, or response activities undertaken by me or on my behalf while operating under its name or authority.' },
    { id: 'physicalRisk', text: 'I understand that this work entails a risk of physical injury and often involves hard physical labor, heavy lifting, and other strenuous activity, and that some activities may take place on or while using equipment and/or on ladders. I certify that I am in good health and physically able to perform this work. I also certify that I understand and agree to follow the safety protocols for on-site work and in using the equipment needed for this work.' },
    { id: 'accommodations', text: 'In the event that I require accommodations, I acknowledge and agree that Faith Responders, the Global Methodist Church, the host site, and any associated church are not responsible or liable for my personal belongings or property, nor are they obligated to provide secure storage, lock-up facilities, or security for any items I bring. I agree to hold harmless and release Faith Responders and its affiliates from any liability for theft, loss, or damage to my property, regardless of the source or cause.' },
    { id: 'conductRules', text: 'I further acknowledge that I am required to comply with all rules, policies, and regulations governing the accommodations in effect at the time of my stay. I understand and agree that no alcoholic beverages, smoking, or firearms are permitted at any housing location or on church property.' },
    { id: 'confidentiality', text: 'I understand the need for confidentiality and will not discuss, photograph or otherwise disclose identifying information about the occupants of the home or location I am working on without prior permission from the homeowner and Faith Responders. This includes any references to names, addresses or other identifiable information. This also includes postings to social media, Facebook or church marketing.' },
    { id: 'photoPermission', text: 'I grant permission to Faith Responders, its representatives, staff and partnering organizations to photograph, film or otherwise record my image, likeness, voice or statements during any Faith Responders events, outreach, deployment, training or activity. I authorize Faith Responders to use these photos, videos and recordings for ministry purposes including but not limited to social media, Facebook, email, fundraising, volunteer recruitment, website or printed materials. I understand these images may be used without compensation and may be edited, modified, or combined with other media.' },
  ];

  const handleViewRelease = async (user: User) => {
    if (!user.legalReleaseId) return;
    setReleaseData(null);
    setReleaseError('');
    setReleaseLoading(true);
    setReleaseDialogOpen(true);
    try {
      const release = await legalReleaseService.getLegalRelease(user.legalReleaseId);
      setReleaseData(release);
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to load consent form');
    } finally {
      setReleaseLoading(false);
    }
  };

  const handlePrintRelease = (user: User, release: LegalRelease) => {
    const fullName = `${user.firstName} ${user.lastName}`;
    const signedDate = release.signedAt
      ? new Date(release.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Unknown';
    const sectionsHtml = RELEASE_SECTIONS.map((s, i) => `
      <div style="margin-bottom:12px;padding:10px;border:1px solid #4caf50;border-radius:4px;background:#f1f8f1;">
        <p style="margin:0 0 6px 0;font-size:13px;"><strong>${i + 1}.</strong> ${s.text}</p>
        <p style="margin:0;font-size:12px;color:#2e7d32;">✓ Acknowledged and agreed</p>
      </div>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Individual Release of Liability — ${fullName}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 20px; color: #111; }
  h2 { text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; color: #555; font-size: 13px; margin-bottom: 20px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
  .section { margin-bottom: 12px; padding: 10px; border: 1px solid #4caf50; border-radius: 4px; background: #f1f8f1; }
  .section p { margin: 0 0 6px 0; font-size: 13px; }
  .section .ack { margin: 0; font-size: 12px; color: #2e7d32; }
  .release-box { padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 13px; margin-bottom: 20px; }
  .sig-img { max-width: 300px; border: 1px solid #ccc; border-radius: 4px; display: block; margin-top: 8px; }
  .meta { display: flex; gap: 32px; margin-bottom: 20px; }
  .meta div { font-size: 13px; }
  .meta .label { font-size: 11px; color: #777; display: block; }
  .footer { text-align: center; font-style: italic; color: #777; font-size: 12px; margin-top: 30px; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h2>Individual Release of Liability</h2>
<p class="sub">Faith Responders Disaster Relief and Recovery Agency, a ministry partner of the Florida Conference of the GMC<br>
3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799</p>
<hr>
<p style="font-size:14px;margin-bottom:16px;">I, <strong>${fullName}</strong>, acknowledge and state the following:</p>
${sectionsHtml}
<hr>
<div class="release-box">
  I, <strong>${fullName}</strong>, hereby release, discharge, indemnify and forever hold Faith Responders, the Global Methodist Church, its affiliates and any other related disaster response agency, together with its officers, agents, servants and employees, harmless from any and all causes of action arising from my participation in this project, including travel or lodging associated therewith, or any damages which may be caused by their own negligence.
</div>
<p style="font-size:13px;font-weight:600;margin-bottom:4px;">Signature</p>
${release.signatureImageUrl ? `<img src="${release.signatureImageUrl}" class="sig-img" alt="Signature" />` : '<p style="color:#c00;font-size:13px;">Signature image not available</p>'}
<div class="meta" style="margin-top:16px;">
  <div><span class="label">Date Signed</span>${signedDate}</div>
  <div><span class="label">Email</span>${user.email}</div>
  ${user.phoneNumber ? `<div><span class="label">Phone</span>${user.phoneNumber}</div>` : ''}
</div>
<p class="footer">"The only thing that matters is faith expressing itself through love" — Galatians 5:6 (NIV)<br>THANK YOU FOR SERVING!</p>
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading users...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>User Management</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={filteredUsers.length === 0}
        >
          Export CSV
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, email, or phone..."
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
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
              <MenuItem value="assessor">Assessor</MenuItem>
              <MenuItem value="fieldCoordinator">Field Coordinator</MenuItem>
              <MenuItem value="baseCampHost">Base Camp Host</MenuItem>
              <MenuItem value="workGroupLead">Team Leader</MenuItem>
              <MenuItem value="volunteer">Volunteer</MenuItem>
              <MenuItem value="secChaplain">SEC/Chaplain</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Capability</InputLabel>
            <Select
              value={capabilityFilter}
              label="Capability"
              onChange={(e) => setCapabilityFilter(e.target.value)}
            >
              <MenuItem value="all">All Capabilities</MenuItem>
              {ALL_CAPABILITIES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Background Check</InputLabel>
            <Select
              value={bgCheckFilter}
              label="Background Check"
              onChange={(e) => setBgCheckFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="week">Expires within 1 week</MenuItem>
              <MenuItem value="twoWeeks">Expires within 2 weeks</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="none">No check on file</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredUsers.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || capabilityFilter !== 'all' || bgCheckFilter !== 'all'
              ? 'No users match your filters'
              : 'No users found'}
          </Typography>
        ) : (
          <List>
            {filteredUsers.map((user) => (
              <ListItem
                key={user.id}
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
                onClick={() => openUserDialog(user)}
              >
                <ListItemText
                  primary={`${user.firstName} ${user.lastName}`}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        {user.email} &bull; {user.phoneNumber}
                      </Typography>
                      {user.roleApprovalStatus !== 'approved' && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Registered {new Date(user.createdAt).toLocaleString()}
                        </Typography>
                      )}
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={user.roleApprovalStatus}
                          size="small"
                          color={getStatusColor(user.roleApprovalStatus) as any}
                          sx={{ mr: 1 }}
                        />
                        {user.contacted && <Chip label="Contacted" size="small" color="success" variant="outlined" sx={{ mr: 1 }} />}
                        {(() => {
                          const status = getBgCheckStatus(user);
                          const expiry = getBgCheckExpiry(user);
                          if (status === 'expired') return <Chip label="BG Check Expired" size="small" color="error" sx={{ mr: 1 }} />;
                          if (status === 'week') return <Chip label={`BG Expires ${new Date(expiry!).toLocaleDateString()}`} size="small" color="error" variant="outlined" sx={{ mr: 1 }} />;
                          if (status === 'twoWeeks') return <Chip label={`BG Expires ${new Date(expiry!).toLocaleDateString()}`} size="small" color="warning" variant="outlined" sx={{ mr: 1 }} />;
                          return null;
                        })()}
                        {user.roles.map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            size="small"
                            color={getRoleColor(role) as any}
                            variant="outlined"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                        {(user.capabilities || []).map((cap) => (
                          <Chip
                            key={cap}
                            label={ALL_CAPABILITIES.find((c) => c.value === cap)?.label ?? cap}
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                        {user.requestedRoles && user.requestedRoles.length > 0 && user.roleApprovalStatus === 'pending' && (
                          <>
                            <Typography variant="caption" sx={{ mx: 1 }}>
                              Requested:
                            </Typography>
                            {user.requestedRoles.map((role) => (
                              <Chip
                                key={`req-${role}`}
                                label={role}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ mr: 0.5 }}
                              />
                            ))}
                          </>
                        )}
                      </Box>
                      {(() => {
                        const notes = user.contactNotes;
                        if (!notes || notes.length === 0) return null;
                        const latest = [...notes].sort((a, b) => b.createdAt - a.createdAt)[0];
                        return (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {new Date(latest.createdAt).toLocaleDateString()} · {latest.authorName}: {latest.text.length > 80 ? latest.text.slice(0, 80) + '…' : latest.text}
                          </Typography>
                        );
                      })()}
                    </Box>
                  }
                />
                {user.roleApprovalStatus === 'pending' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={!user.lastBackgroundCheck ? 'Background check required before approving' : ''} arrow>
                        <span>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleApproveUser(user, true); }}
                            disabled={!user.lastBackgroundCheck || saving}
                          >
                            Approve
                          </Button>
                        </span>
                      </Tooltip>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleApproveUser(user, false); }}
                        disabled={saving}
                      >
                        Reject
                      </Button>
                    </Box>
                    {!user.lastBackgroundCheck && (
                      <Typography variant="caption" color="text.secondary">Background check required</Typography>
                    )}
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>User Details</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="First Name"
                    value={editingProfile.firstName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, firstName: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Last Name"
                    value={editingProfile.lastName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, lastName: e.target.value })}
                  />
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.email}
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Phone Number"
                  value={editingProfile.phoneNumber}
                  onChange={(e) => setEditingProfile({ ...editingProfile, phoneNumber: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Communication Preference</InputLabel>
                  <Select
                    value={editingProfile.communicationPreference}
                    label="Communication Preference"
                    onChange={(e) => setEditingProfile({ ...editingProfile, communicationPreference: e.target.value as CommunicationPreference })}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  label="Street"
                  value={editingProfile.addressStreet}
                  onChange={(e) => setEditingProfile({ ...editingProfile, addressStreet: e.target.value })}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="City"
                    value={editingProfile.addressCity}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressCity: e.target.value })}
                  />
                  <TextField
                    size="small"
                    sx={{ width: 90 }}
                    label="State"
                    value={editingProfile.addressState}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressState: e.target.value })}
                  />
                  <TextField
                    size="small"
                    sx={{ width: 110 }}
                    label="ZIP"
                    value={editingProfile.addressZip}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressZip: e.target.value })}
                  />
                </Box>

                {selectedUser.organization && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Church / Organization</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{selectedUser.organization}</Typography>
                  </>
                )}

                {selectedUser.tshirtSize && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">T-Shirt Size</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {{ S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra Large', '2XL': '2X', '3XL': '3X' }[selectedUser.tshirtSize] ?? selectedUser.tshirtSize}
                    </Typography>
                  </>
                )}

                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Background Check Date"
                  value={editingProfile.lastBackgroundCheck}
                  onChange={(e) => setEditingProfile({ ...editingProfile, lastBackgroundCheck: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: new Date().toISOString().split('T')[0] }}
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingProfile.contacted}
                      onChange={(e) => setEditingProfile({ ...editingProfile, contacted: e.target.checked })}
                    />
                  }
                  label="Contacted"
                  sx={{ mb: 1 }}
                />

                {/* Contact notes log */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Contact Notes
                  </Typography>
                  {(selectedUser.contactNotes && selectedUser.contactNotes.length > 0) && (
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1,
                        mb: 1,
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                      }}
                    >
                      {[...(selectedUser.contactNotes)].sort((a, b) => a.createdAt - b.createdAt).map((note, i) => (
                        <Box key={i} sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
                            {new Date(note.createdAt).toLocaleString()} · {note.authorName}
                          </Typography>
                          <Typography variant="body2">{note.text}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {noteError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setNoteError('')}>{noteError}</Alert>}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      placeholder="Add a note…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!noteText.trim() || noteSaving}
                      onClick={handleAddNote}
                      sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {noteSaving ? 'Saving…' : 'Add Note'}
                    </Button>
                  </Box>
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedUser.roleApprovalStatus}
                  size="small"
                  color={getStatusColor(selectedUser.roleApprovalStatus) as any}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Roles
                </Typography>
                <FormGroup row>
                  {ALL_ROLES.map(({ value, label }) => (
                    <FormControlLabel
                      key={value}
                      control={
                        <Checkbox
                          checked={editingRoles.includes(value)}
                          onChange={() => handleRoleToggle(value)}
                          size="small"
                        />
                      }
                      label={label}
                      sx={{ minWidth: 160 }}
                    />
                  ))}
                </FormGroup>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Capabilities
                </Typography>
                <FormGroup row>
                  {ALL_CAPABILITIES.map(({ value, label }) => (
                    <FormControlLabel
                      key={value}
                      control={
                        <Checkbox
                          checked={editingCapabilities.includes(value)}
                          onChange={() => handleCapabilityToggle(value)}
                          size="small"
                        />
                      }
                      label={label}
                      sx={{ minWidth: 160 }}
                    />
                  ))}
                </FormGroup>
                <Divider sx={{ my: 2 }} />

                {selectedUser.requestedRoles && selectedUser.requestedRoles.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Requested Roles
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {selectedUser.requestedRoles.map((role) => (
                        <Chip
                          key={`req-${role}`}
                          label={role}
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </Box>
                  </>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Legal Release Signed</Typography>
                    <Typography variant="body1">{selectedUser.legalReleaseSigned ? 'Yes' : 'No'}</Typography>
                  </Box>
                  {selectedUser.legalReleaseSigned && selectedUser.legalReleaseId && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewRelease(selectedUser)}
                    >
                      View Consent Form
                    </Button>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Event Availability
                </Typography>
                {eventDataLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading…</Typography>
                ) : (selectedUser.eventIds && selectedUser.eventIds.length > 0) ? (
                  selectedUser.eventIds.map((eventId) => {
                    const ev = allEvents.find((e) => e.id === eventId);
                    const data = eventDataForUser.find((d) => d.eventId === eventId);
                    return (
                      <Box key={eventId} sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{ev?.name ?? eventId}</Typography>
                          <Button size="small" startIcon={<EditIcon />} onClick={() => openConfirmDialog(eventId)}>
                            Set Confirmed Dates
                          </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Submitted</Typography>
                            {(data?.submittedAvailability ?? []).length === 0 ? (
                              <Typography variant="caption" color="text.secondary">None</Typography>
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {(data?.submittedAvailability ?? []).map((r, i) => (
                                  <Chip key={i} label={`${new Date(r.start).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}`} size="small" color="primary" variant="outlined" />
                                ))}
                              </Box>
                            )}
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Confirmed</Typography>
                            {(data?.confirmedDates ?? []).length === 0 ? (
                              <Typography variant="caption" color="text.secondary">None</Typography>
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {(data?.confirmedDates ?? []).map((r, i) => (
                                  <Chip key={i} label={`${new Date(r.start).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}`} size="small" color="success" />
                                ))}
                              </Box>
                            )}
                            {data?.confirmedAt && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                Confirmed {new Date(data.confirmedAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {data?.notes && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Notes: {data.notes}
                          </Typography>
                        )}
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Not signed up for any events.
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Account Activity
                </Typography>
                {authInfoLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading…</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Profile Created</Typography>
                      <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString()}</Typography>
                    </Box>
                    {authInfo && (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Auth Account Created</Typography>
                          <Typography variant="body2">{new Date(authInfo.creationTime).toLocaleString()}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Last Sign-In</Typography>
                          <Typography variant="body2">{new Date(authInfo.lastSignInTime).toLocaleString()}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Sign-In Method</Typography>
                          <Typography variant="body2">
                            {authInfo.providers.map((p) =>
                              p === 'password' ? 'Email/Password' :
                              p === 'google.com' ? 'Google' :
                              p === 'facebook.com' ? 'Facebook' : p
                            ).join(', ')}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving || deleting}
              >
                Delete User
              </Button>
              {!selectedUser.roles.includes('administrator') && (
                <Button
                  variant="outlined"
                  onClick={handleImpersonate}
                  disabled={saving || deleting}
                >
                  Impersonate
                </Button>
              )}
              {selectedUser.roleApprovalStatus === 'pending' && (
                <>
                  <Button
                    color="error"
                    onClick={() => handleApproveUser(selectedUser, false)}
                    disabled={saving}
                  >
                    Reject
                  </Button>
                  <Tooltip
                    title={!editingProfile.lastBackgroundCheck ? 'Enter a background check date above before approving' : ''}
                    arrow
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleApproveUser(
                          selectedUser,
                          true,
                          editingProfile.lastBackgroundCheck || undefined
                        )}
                        disabled={saving || !editingProfile.lastBackgroundCheck}
                      >
                        Approve
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !editingProfile.firstName.trim() || !editingProfile.lastName.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User?</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> ({selectedUser?.email})?
            This removes their account and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Set Confirmed Dates — {allEvents.find((e) => e.id === confirmEventId)?.name ?? confirmEventId}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set the confirmed dates for {selectedUser?.firstName} {selectedUser?.lastName} at this event.
            </Typography>
            {confirmError && <Alert severity="error" sx={{ mb: 2 }}>{confirmError}</Alert>}
            {confirmRanges.map((range, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  type="date"
                  label="From"
                  InputLabelProps={{ shrink: true }}
                  value={range.start}
                  onChange={(e) => setConfirmRanges((prev) => prev.map((r, j) => j === i ? { ...r, start: e.target.value } : r))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="To"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: range.start }}
                  value={range.end}
                  onChange={(e) => setConfirmRanges((prev) => prev.map((r, j) => j === i ? { ...r, end: e.target.value } : r))}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" onClick={() => setConfirmRanges((prev) => prev.filter((_, j) => j !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setConfirmRanges((prev) => [...prev, { start: '', end: '' }])}
              sx={{ mt: 1, mb: 2 }}
            >
              Add Dates
            </Button>
            <TextField
              fullWidth
              size="small"
              label="Notes (optional)"
              multiline
              rows={2}
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={confirmSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveConfirmedDates} disabled={confirmSaving}>
            {confirmSaving ? 'Saving...' : 'Save Confirmed Dates'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={releaseDialogOpen} onClose={() => setReleaseDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Individual Release of Liability
          {selectedUser && releaseData && (
            <Button
              startIcon={<PrintIcon />}
              variant="outlined"
              size="small"
              onClick={() => handlePrintRelease(selectedUser, releaseData)}
            >
              Print
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {releaseLoading && <Typography>Loading...</Typography>}
          {releaseError && <Alert severity="error">{releaseError}</Alert>}
          {releaseData && selectedUser && (() => {
            const fullName = `${selectedUser.firstName} ${selectedUser.lastName}`;
            const signedDate = releaseData.signedAt
              ? new Date(releaseData.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : null;
            return (
              <>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                  Faith Responders Disaster Relief and Recovery Agency, a ministry partner of the Florida Conference of the GMC
                  <br />3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  I, <strong>{fullName}</strong>, acknowledge and state the following:
                </Typography>
                {RELEASE_SECTIONS.map((section, index) => (
                  <Box
                    key={section.id}
                    sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'success.main', borderRadius: 1, bgcolor: 'success.50' }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Box component="span" sx={{ fontWeight: 600, mr: 1 }}>{index + 1}.</Box>
                      {section.text}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="caption" color="success.dark">Acknowledged and agreed</Typography>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2">
                    I, <strong>{fullName}</strong>, hereby release, discharge, indemnify and forever hold Faith Responders, the Global Methodist Church, its affiliates and any other related disaster response agency, together with its officers, agents, servants and employees, harmless from any and all causes of action arising from my participation in this project, including travel or lodging associated therewith, or any damages which may be caused by their own negligence.
                  </Typography>
                </Box>
                <Typography variant="subtitle2" gutterBottom>Signature</Typography>
                {releaseData.signatureImageUrl ? (
                  <Box
                    component="img"
                    src={releaseData.signatureImageUrl}
                    alt="Signature"
                    sx={{ maxWidth: 320, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 2, display: 'block' }}
                  />
                ) : (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>Signature image not available</Typography>
                )}
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {signedDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date Signed</Typography>
                      <Typography variant="body2">{signedDate}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2">{selectedUser.email}</Typography>
                  </Box>
                  {selectedUser.phoneNumber && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body2">{selectedUser.phoneNumber}</Typography>
                    </Box>
                  )}
                </Box>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};
