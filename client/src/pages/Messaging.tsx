import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import type { Thread, Message } from '../types';

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [contacts, setContacts] = useState<{ users: any[]; workgroups: any[] } | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = messageService.subscribeToThreads(user.id, updatedThreads => {
      setThreads(updatedThreads);
      setThreadsLoading(false);
      // Keep activeThread in sync if it's in the updated list
      setActiveThread(prev =>
        prev ? (updatedThreads.find(t => t.id === prev.id) ?? prev) : null
      );
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!activeThread) { setMessages([]); return; }
    const unsubscribe = messageService.subscribeToMessages(activeThread.id, msgs => {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return unsubscribe;
  }, [activeThread?.id]);

  const handleSelectThread = (thread: Thread) => {
    setActiveThread(thread);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeThread || sending) return;
    const text = newMessage;
    setNewMessage('');
    setSending(true);
    try {
      await messageService.sendMessage(activeThread.id, text);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleOpenComposer = async () => {
    setComposerOpen(true);
    if (!contacts) {
      setContactsLoading(true);
      try {
        const data = await messageService.getReachableContacts();
        setContacts(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load contacts');
        setComposerOpen(false);
      } finally {
        setContactsLoading(false);
      }
    }
  };

  const handleStartDirect = async (otherUserId: string) => {
    setComposerOpen(false);
    try {
      const thread = await messageService.getOrCreateDirectThread(otherUserId);
      setActiveThread(thread);
    } catch (err: any) {
      setError(err.message || 'Failed to open conversation');
    }
  };

  const handleStartWorkgroup = async (workgroupId: string) => {
    setComposerOpen(false);
    try {
      const thread = await messageService.getOrCreateWorkgroupThread(workgroupId);
      setActiveThread(thread);
    } catch (err: any) {
      setError(err.message || 'Failed to open conversation');
    }
  };

  const getThreadDisplayName = (thread: Thread) => {
    if (thread.type === 'workgroup') return thread.title;
    const otherId = thread.participantIds.find(id => id !== user?.id);
    return otherId ? (thread.participantNames[otherId] ?? thread.title) : thread.title;
  };

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 112px)', minHeight: 400 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, minWidth: 300 }}
        >
          {error}
        </Alert>
      )}

      {/* Thread list */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: 1,
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>Messages</Typography>
          <IconButton onClick={handleOpenComposer} color="primary" size="small" title="New message">
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        {threadsLoading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : threads.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, gap: 1 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">No conversations yet</Typography>
            <Button size="small" onClick={handleOpenComposer}>Start one</Button>
          </Box>
        ) : (
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {threads.map(thread => {
              const name = getThreadDisplayName(thread);
              const isActive = activeThread?.id === thread.id;
              return (
                <ListItem key={thread.id} disablePadding divider>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => handleSelectThread(thread)}
                    sx={{ py: 1.5, px: 2 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: 13,
                          bgcolor: thread.type === 'workgroup' ? 'secondary.main' : 'primary.main',
                          color: thread.type === 'workgroup' ? 'secondary.contrastText' : 'primary.contrastText',
                        }}
                      >
                        {thread.type === 'workgroup' ? <GroupsIcon fontSize="small" /> : initials(name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                            {name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" flexShrink={0}>
                            {formatTime(thread.lastMessageAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {thread.lastMessagePreview || 'No messages yet'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Message panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeThread ? (
          <>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeThread.type === 'workgroup' ? (
                <GroupsIcon color="action" />
              ) : (
                <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'primary.main' }}>
                  {initials(getThreadDisplayName(activeThread))}
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
                  {getThreadDisplayName(activeThread)}
                </Typography>
                {activeThread.type === 'workgroup' && (
                  <Typography variant="caption" color="text.secondary">
                    {activeThread.participantIds.length} members
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No messages yet. Say hello!</Typography>
                </Box>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                return (
                  <Box
                    key={msg.id}
                    sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-end' }}
                  >
                    {!isMe && (
                      <Avatar sx={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>
                        {initials(msg.senderName)}
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: '65%' }}>
                      {!isMe && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, display: 'block', mb: 0.25 }}>
                          {msg.senderName}
                        </Typography>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 1,
                          bgcolor: isMe ? 'primary.main' : 'grey.100',
                          color: isMe ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2.5,
                          borderBottomRightRadius: isMe ? 0.5 : 2.5,
                          borderBottomLeftRadius: isMe ? 2.5 : 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                        </Typography>
                      </Paper>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, textAlign: isMe ? 'right' : 'left' }}>
                        {formatTime(msg.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />
            <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message…"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                multiline
                maxRows={4}
              />
              <IconButton color="primary" onClick={handleSend} disabled={!newMessage.trim() || sending}>
                {sending ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, color: 'text.disabled' }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 56, opacity: 0.3 }} />
            <Typography color="text.secondary">Select a conversation or start a new one</Typography>
            <Button variant="outlined" size="small" onClick={handleOpenComposer}>New Message</Button>
          </Box>
        )}
      </Box>

      {/* New Message dialog */}
      <Dialog open={composerOpen} onClose={() => setComposerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Message</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {contactsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : contacts ? (
            <>
              {contacts.workgroups.length > 0 && (
                <>
                  <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                    <Typography variant="overline" color="text.secondary">Workgroup Threads</Typography>
                  </Box>
                  <List dense disablePadding>
                    {contacts.workgroups.map((wg: any) => (
                      <ListItem key={wg.id} disablePadding>
                        <ListItemButton onClick={() => handleStartWorkgroup(wg.id)} sx={{ px: 2 }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                              <GroupsIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={wg.name}
                            secondary={`${(wg.volunteerUserIds?.length ?? 0) + 1} members`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 1 }} />
                </>
              )}

              {contacts.users.length > 0 && (
                <>
                  <Box sx={{ px: 2, pb: 0.5 }}>
                    <Typography variant="overline" color="text.secondary">Direct Messages</Typography>
                  </Box>
                  <List dense disablePadding sx={{ pb: 1 }}>
                    {contacts.users.map((u: any) => (
                      <ListItem key={u.id} disablePadding>
                        <ListItemButton onClick={() => handleStartDirect(u.id)} sx={{ px: 2 }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                              {(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${u.firstName} ${u.lastName}`}
                            secondary={
                              <Box component="span" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                                {(u.roles as string[])?.map((r: string) => (
                                  <Chip key={r} label={r} size="small" sx={{ height: 16, fontSize: 10 }} />
                                ))}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {contacts.users.length === 0 && contacts.workgroups.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No contacts available yet</Typography>
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
