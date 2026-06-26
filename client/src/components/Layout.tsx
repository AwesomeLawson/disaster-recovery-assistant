import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  ListSubheader,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import WorkIcon from '@mui/icons-material/Work';
import WarningIcon from '@mui/icons-material/Warning';
import MessageIcon from '@mui/icons-material/Message';
import EventIcon from '@mui/icons-material/Event';
import BusinessIcon from '@mui/icons-material/Business';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InsightsIcon from '@mui/icons-material/Insights';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { SessionBanner, useBannerHeight } from './SessionBanner';
import type { UserRole } from '../types';

const drawerWidth = 240;

const PREVIEW_ROLES: { value: UserRole; label: string }[] = [
  { value: 'assessor', label: 'Assessor' },
  { value: 'fieldCoordinator', label: 'Field Coordinator' },
  { value: 'baseCampHost', label: 'Base Camp Host' },
  { value: 'workGroupLead', label: 'Team Leader' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'secChaplain', label: 'SEC / Chaplain' },
];

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, firebaseUser, realUser, previewRole, setPreviewRole } = useAuth();
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const bannerHeight = useBannerHeight();
  const isAdmin = realUser?.roles.includes('administrator') ?? false;

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getMenuItems = () => {
    if (!user) return [];

    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    ];

    if (user.roles.includes('administrator')) {
      items.push(
        { text: 'Events', icon: <EventIcon />, path: '/events' },
        { text: 'Base Camps', icon: <LocationCityIcon />, path: '/base-camps' },
        { text: 'Users', icon: <GroupIcon />, path: '/admin/users' },
        { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
        { text: 'Impact', icon: <InsightsIcon />, path: '/admin/impact' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' }
      );
    }

    if (
      user.roles.includes('assessor') ||
      user.roles.includes('administrator') ||
      user.roles.includes('fieldCoordinator')
    ) {
      items.push({ text: 'Work Orders', icon: <AssessmentIcon />, path: '/work-orders' });
    }

    if (
      user.roles.includes('workGroupLead') ||
      user.roles.includes('volunteer') ||
      user.roles.includes('administrator') ||
      user.roles.includes('fieldCoordinator') ||
      user.roles.includes('secChaplain')
    ) {
      items.push({ text: 'Workgroups', icon: <WorkIcon />, path: '/workgroups' });
    }

    if (
      user.roles.includes('workGroupLead') ||
      user.roles.includes('administrator') ||
      user.roles.includes('fieldCoordinator')
    ) {
      items.push({ text: 'Escalations', icon: <WarningIcon />, path: '/escalations' });
    }

    if (
      user.roles.includes('administrator') ||
      user.roles.includes('baseCampHost') ||
      user.roles.includes('workGroupLead')
    ) {
      items.push({ text: 'Tools', icon: <BuildIcon />, path: '/tools' });
    }

    items.push({ text: 'Log Hours', icon: <AccessTimeIcon />, path: '/log-hours' });
    items.push({ text: 'Trainings', icon: <SchoolIcon />, path: '/trainings' });
    items.push({ text: 'Messages', icon: <MessageIcon />, path: '/messages' });
    items.push({ text: 'Help', icon: <HelpOutlineIcon />, path: '/help' });

    return items;
  };

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center', py: 1 }}>
        <img
          src="/logo.png"
          alt="Faith Responders"
          style={{ height: 52, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        />
      </Toolbar>
      <Divider />
      <List>
        {getMenuItems().map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <SessionBanner />
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, top: bannerHeight }}
      >
        <Container maxWidth="xl" sx={{ pl: { sm: 1 } }}>
          <Toolbar disableGutters>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
              <img
                src="/logo.png"
                alt="Faith Responders"
                style={{ height: 44, borderRadius: 6, background: '#fff', padding: '2px 8px' }}
              />
            </Box>
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar>{firebaseUser?.email?.charAt(0).toUpperCase()}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={() => { navigate('/profile'); handleCloseUserMenu(); }}>
                  <Typography textAlign="center">Profile</Typography>
                </MenuItem>
                {isAdmin && [
                  <Divider key="preview-div" />,
                  <ListSubheader
                    key="preview-header"
                    sx={{ lineHeight: '32px', bgcolor: 'transparent', display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <VisibilityIcon fontSize="small" /> Preview as Role
                  </ListSubheader>,
                  ...PREVIEW_ROLES.map((r) => (
                    <MenuItem
                      key={r.value}
                      onClick={() => { setPreviewRole(r.value); handleCloseUserMenu(); }}
                      selected={previewRole === r.value}
                      sx={{ pl: 4 }}
                    >
                      <Typography variant="body2">{r.label}</Typography>
                    </MenuItem>
                  )),
                  previewRole && (
                    <MenuItem
                      key="exit-preview"
                      onClick={() => { setPreviewRole(null); handleCloseUserMenu(); }}
                      sx={{ pl: 4 }}
                    >
                      <Typography variant="body2" color="error">Exit Preview</Typography>
                    </MenuItem>
                  ),
                  <Divider key="logout-div" />,
                ]}
                <MenuItem onClick={handleLogout}>
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, top: bannerHeight },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: `${64 + bannerHeight}px`,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
