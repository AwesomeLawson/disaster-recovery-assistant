import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  TextField,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { helpChatService } from '../services/helpChat.service';
import type { HelpConversation, HelpMessage } from '../types';

const SIDEBAR_WIDTH = 300;

function formatRelative(ts: number): string {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const Help: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [conversations, setConversations] = useState<HelpConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [convoLoading, setConvoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ id: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    try {
      const list = await helpChatService.listMyConversations();
      setConversations(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadConversation = useCallback(async (id: string) => {
    setConvoLoading(true);
    try {
      const { conversation, messages: msgs } = await helpChatService.getConversation(id);
      setMessages(msgs);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? conversation : c))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    } finally {
      setConvoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadConversation(activeId);
  }, [activeId, loadConversation]);

  useEffect(() => {
    // Scroll to bottom when messages change.
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(t);
  }, [messages, sending]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    if (isMobile) setDrawerOpen(false);
  };

  const handleNew = async () => {
    try {
      const conversation = await helpChatService.createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setActiveId(conversation.id);
      setMessages([]);
      if (isMobile) setDrawerOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setInput('');
    setSending(true);

    // Optimistically append the user message.
    const optimisticUser: HelpMessage = {
      id: 'tmp_' + Date.now(),
      conversationId: activeId,
      userId: '',
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const { message, userMessage } = await helpChatService.sendMessage(activeId, text);
      setMessages((prev) => {
        // Replace the optimistic user message with the persisted one + assistant reply.
        const without = prev.filter((m) => m.id !== optimisticUser.id);
        return [...without, userMessage, message];
      });
      // Refresh conversation list so title/preview/sort updates are reflected.
      void loadConversations();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Roll back the optimistic message and restore input.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleOpenItemMenu = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, id });
  };

  const handleCloseMenu = () => setMenuAnchor(null);

  const handleStartRename = () => {
    if (!menuAnchor) return;
    const convo = conversations.find((c) => c.id === menuAnchor.id);
    if (convo) setRenameDialog({ id: convo.id, title: convo.title });
    handleCloseMenu();
  };

  const handleConfirmRename = async () => {
    if (!renameDialog) return;
    const { id, title } = renameDialog;
    if (!title.trim()) {
      setRenameDialog(null);
      return;
    }
    try {
      const newTitle = await helpChatService.renameConversation(id, title.trim());
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
      setRenameDialog(null);
    } catch (err: any) {
      setError(err.message || 'Failed to rename conversation');
    }
  };

  const handleDelete = async () => {
    if (!menuAnchor) return;
    const id = menuAnchor.id;
    handleCloseMenu();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await helpChatService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete conversation');
    }
  };

  const sidebar = (
    <Box sx={{ width: SIDEBAR_WIDTH, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Help
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNew}
        >
          New
        </Button>
      </Box>
      {listLoading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : conversations.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            gap: 1,
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No conversations yet
          </Typography>
          <Button size="small" onClick={handleNew}>
            Start one
          </Button>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {conversations.map((c) => {
            const isActive = activeId === c.id;
            return (
              <ListItem key={c.id} disablePadding divider>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleSelect(c.id)}
                  sx={{ py: 1.5, px: 2, alignItems: 'flex-start' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        noWrap
                        sx={{ flex: 1 }}
                      >
                        {c.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {formatRelative(c.lastMessageAt)}
                      </Typography>
                    </Box>
                    {c.lastMessagePreview && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {c.lastMessagePreview}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenItemMenu(e, c.id)}
                    sx={{ ml: 0.5, mt: -0.5 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  const activeConvo = conversations.find((c) => c.id === activeId) || null;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 112px)', minHeight: 400 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 300,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          {sidebar}
        </Paper>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Right pane */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header / toolbar */}
        {isMobile && (
          <Box
            sx={{
              px: 1,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <IconButton onClick={() => setDrawerOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {activeConvo?.title || 'Help'}
            </Typography>
          </Box>
        )}

        {!activeId ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              gap: 2,
              textAlign: 'center',
            }}
          >
            <SmartToyOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
            <Typography variant="h6">How can we help?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
              Select a conversation or start a new one to ask a question about the
              Faith Responders app. The assistant is grounded in the in-app user guide.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
              New conversation
            </Button>
          </Box>
        ) : (
          <>
            {/* Desktop header */}
            {!isMobile && (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <SmartToyOutlinedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600} noWrap>
                  {activeConvo?.title || 'Conversation'}
                </Typography>
              </Box>
            )}

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
              {convoLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  <Typography variant="body2">
                    Ask a question to get started.
                  </Typography>
                </Box>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: 1,
                          maxWidth: '85%',
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isUser ? 'primary.main' : 'secondary.main',
                            color: isUser ? 'primary.contrastText' : 'secondary.contrastText',
                            flexShrink: 0,
                          }}
                        >
                          {isUser ? (
                            <PersonIcon fontSize="small" />
                          ) : (
                            <SmartToyOutlinedIcon fontSize="small" />
                          )}
                        </Box>
                        <Paper
                          elevation={0}
                          sx={{
                            px: 2,
                            py: 1.25,
                            bgcolor: isUser ? 'primary.main' : 'background.paper',
                            color: isUser ? 'primary.contrastText' : 'text.primary',
                            borderRadius: 2,
                            border: isUser ? 'none' : 1,
                            borderColor: 'divider',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <Typography variant="body2" component="div">
                            {m.content}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  );
                })
              )}
              {sending && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 5, mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    Assistant is thinking…
                  </Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Composer */}
            <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={6}
                minRows={1}
                placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                size="small"
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                aria-label="Send"
              >
                <SendIcon />
              </IconButton>
            </Box>
          </>
        )}
      </Box>

      {/* Per-item menu */}
      <Menu
        anchorEl={menuAnchor?.el || null}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleStartRename}>Rename</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog
        open={Boolean(renameDialog)}
        onClose={() => setRenameDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Rename conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameDialog?.title || ''}
            onChange={(e) =>
              setRenameDialog((prev) =>
                prev ? { ...prev, title: e.target.value } : prev
              )
            }
            inputProps={{ maxLength: 80 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmRename}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
