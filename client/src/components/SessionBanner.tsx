import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  assessor: 'Assessor',
  fieldCoordinator: 'Field Coordinator',
  baseCampHost: 'Base Camp Host',
  workGroupLead: 'Team Leader',
  volunteer: 'Volunteer',
  secChaplain: 'SEC / Chaplain',
};

export const SessionBanner: React.FC = () => {
  const { previewRole, setPreviewRole, impersonation, realUser } = useAuth();

  if (impersonation) {
    const onExit = async () => {
      try {
        await authService.logout();
      } finally {
        // Close the tab if possible; otherwise fall back to the login screen.
        window.close();
        window.location.href = '/login';
      }
    };
    return (
      <Box
        sx={{
          width: '100%',
          bgcolor: 'error.main',
          color: 'common.white',
          px: 2,
          py: 1,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: (theme) => theme.zIndex.modal + 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonOffIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            IMPERSONATING {impersonation.targetName} — actions you take are real and recorded under their account.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          color="inherit"
          onClick={onExit}
          sx={{ color: 'error.main', bgcolor: 'common.white', '&:hover': { bgcolor: 'grey.100' } }}
        >
          End Impersonation
        </Button>
      </Box>
    );
  }

  if (previewRole && realUser?.roles.includes('administrator')) {
    return (
      <Box
        sx={{
          width: '100%',
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          px: 2,
          py: 1,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: (theme) => theme.zIndex.modal + 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <VisibilityIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            Previewing UI as: {ROLE_LABELS[previewRole] || previewRole} (your data access is still admin-level)
          </Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          color="inherit"
          onClick={() => setPreviewRole(null)}
          sx={{ color: 'warning.dark', bgcolor: 'common.white', '&:hover': { bgcolor: 'grey.100' } }}
        >
          Exit Preview
        </Button>
      </Box>
    );
  }

  return null;
};

// Height in px that the banner consumes when active — used to push content down.
export const useBannerHeight = (): number => {
  const { previewRole, impersonation, realUser } = useAuth();
  if (impersonation) return 40;
  if (previewRole && realUser?.roles.includes('administrator')) return 40;
  return 0;
};
