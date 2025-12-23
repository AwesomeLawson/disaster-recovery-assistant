import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import type { Message } from '../types';

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [threadId] = useState('general'); // For demo purposes, use a general thread
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time messages
    const unsubscribe = messageService.subscribeToMessages(threadId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [threadId]);

  const loadMessages = async () => {
    try {
      const data = await messageService.getMessages(threadId);
      setMessages(data.reverse()); // Reverse to show oldest first
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await messageService.sendMessage(threadId, [], newMessage, 'inApp');
      setNewMessage('');
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message) => {
              const isCurrentUser = message.senderId === user?.id;
              return (
                <ListItem
                  key={message.id}
                  sx={{
                    flexDirection: 'column',
                    alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 1,
                      maxWidth: '70%',
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {isCurrentUser ? 'You' : 'U'}
                    </Avatar>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        bgcolor: isCurrentUser ? 'primary.light' : 'grey.100',
                        color: isCurrentUser ? 'white' : 'text.primary',
                      }}
                    >
                      <Typography variant="body1">{message.content}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          opacity: 0.8,
                        }}
                      >
                        {formatTimestamp(message.createdAt)}
                      </Typography>
                    </Paper>
                  </Box>
                </ListItem>
              );
            })}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
