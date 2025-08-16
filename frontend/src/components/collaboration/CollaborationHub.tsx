'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Share2,
  MessageSquare,
  Phone,
  PhoneOff,
  Settings,
  UserPlus,
  Crown,
  Eye,
  Hand,
  Clock,
  Send,
  Camera,
  Monitor,
  Wifi,
  WifiOff
} from 'lucide-react';
import { type User, type Examination } from '@/types';

interface CollaborationHubProps {
  examination: Examination;
  studyInstanceUID?: string;
  currentUser: User;
  onCollaborationStart?: (sessionId: string) => void;
  onCollaborationEnd?: () => void;
  enabled?: boolean;
}

interface CollaborationSession {
  id: string;
  hostUserId: string;
  participants: Participant[];
  studyInstanceUID: string;
  title: string;
  isActive: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharingEnabled: boolean;
  recordingEnabled: boolean;
  currentViewport: ViewportState;
  annotations: CollaborativeAnnotation[];
  chatMessages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface Participant {
  user: User;
  role: 'host' | 'presenter' | 'viewer';
  status: 'connected' | 'disconnected' | 'away';
  videoEnabled: boolean;
  audioEnabled: boolean;
  lastSeen: Date;
  permissions: {
    canControlViewer: boolean;
    canAnnotate: boolean;
    canInvite: boolean;
    canRecord: boolean;
  };
}

interface ViewportState {
  windowLevel: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  currentFrame: number;
  layout: string;
  tool: string;
}

interface CollaborativeAnnotation {
  id: string;
  userId: string;
  userName: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'freehand' | 'text' | 'measurement';
  coordinates: number[];
  text?: string;
  color: string;
  timestamp: Date;
  isTemporary: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  type: 'text' | 'system' | 'annotation' | 'viewport_change';
  timestamp: Date;
  metadata?: any;
}

export function CollaborationHub({
  examination,
  studyInstanceUID,
  currentUser,
  onCollaborationStart,
  onCollaborationEnd,
  enabled = true
}: CollaborationHubProps) {
  const [activeSession, setActiveSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // Initialize collaboration
  useEffect(() => {
    if (enabled && studyInstanceUID) {
      initializeCollaboration();
    }
    
    return () => {
      cleanup();
    };
  }, [enabled, studyInstanceUID]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const initializeCollaboration = useCallback(async () => {
    try {
      // Initialize WebSocket connection
      const wsUrl = `wss://localhost:3001/collaboration/${studyInstanceUID}`;
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        setIsConnected(true);
        sendMessage({
          type: 'join',
          userId: currentUser.id,
          studyInstanceUID
        });
      };
      
      websocketRef.current.onmessage = handleWebSocketMessage;
      websocketRef.current.onclose = () => setIsConnected(false);
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      // Simulate network quality monitoring
      const qualityInterval = setInterval(() => {
        const qualities: ('good' | 'fair' | 'poor')[] = ['good', 'good', 'good', 'fair', 'poor'];
        setNetworkQuality(qualities[Math.floor(Math.random() * qualities.length)]);
      }, 10000);

      return () => clearInterval(qualityInterval);
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
    }
  }, [studyInstanceUID, currentUser.id]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'session_created':
          setActiveSession(data.session);
          setIsHost(data.session.hostUserId === currentUser.id);
          break;
          
        case 'participant_joined':
          setParticipants(prev => [...prev, data.participant]);
          addSystemMessage(`${data.participant.user.firstName} joined the session`);
          break;
          
        case 'participant_left':
          setParticipants(prev => prev.filter(p => p.user.id !== data.userId));
          addSystemMessage(`User left the session`);
          break;
          
        case 'chat_message':
          setChatMessages(prev => [...prev, data.message]);
          break;
          
        case 'viewport_sync':
          // Sync viewport changes
          break;
          
        case 'annotation_added':
          // Handle collaborative annotations
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [currentUser.id]);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startCollaboration = useCallback(async () => {
    try {
      const sessionData = {
        studyInstanceUID,
        hostUserId: currentUser.id,
        title: `${examination.examType} - ${examination.patient.firstName} ${examination.patient.lastName}`,
        videoEnabled,
        audioEnabled
      };

      sendMessage({
        type: 'create_session',
        ...sessionData
      });

      if (onCollaborationStart) {
        onCollaborationStart(`session-${Date.now()}`);
      }
    } catch (error) {
      console.error('Failed to start collaboration:', error);
    }
  }, [studyInstanceUID, currentUser.id, examination, videoEnabled, audioEnabled, onCollaborationStart]);

  const endCollaboration = useCallback(async () => {
    try {
      sendMessage({
        type: 'end_session',
        sessionId: activeSession?.id
      });

      setActiveSession(null);
      setParticipants([]);
      setChatMessages([]);
      setVideoEnabled(false);
      setAudioEnabled(false);
      setScreenSharing(false);

      if (onCollaborationEnd) {
        onCollaborationEnd();
      }
    } catch (error) {
      console.error('Failed to end collaboration:', error);
    }
  }, [activeSession?.id, onCollaborationEnd]);

  const toggleVideo = useCallback(async () => {
    try {
      if (!videoEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
      
      setVideoEnabled(!videoEnabled);
      sendMessage({
        type: 'toggle_video',
        enabled: !videoEnabled,
        userId: currentUser.id
      });
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  }, [videoEnabled, currentUser.id]);

  const toggleAudio = useCallback(async () => {
    try {
      setAudioEnabled(!audioEnabled);
      sendMessage({
        type: 'toggle_audio',
        enabled: !audioEnabled,
        userId: currentUser.id
      });
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  }, [audioEnabled, currentUser.id]);

  const toggleScreenSharing = useCallback(async () => {
    try {
      if (!screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        // Handle screen sharing stream
      }
      
      setScreenSharing(!screenSharing);
      sendMessage({
        type: 'toggle_screen_sharing',
        enabled: !screenSharing,
        userId: currentUser.id
      });
    } catch (error) {
      console.error('Failed to toggle screen sharing:', error);
    }
  }, [screenSharing, currentUser.id]);

  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      message: newMessage.trim(),
      type: 'text',
      timestamp: new Date()
    };

    sendMessage({
      type: 'chat_message',
      message
    });

    setNewMessage('');
  }, [newMessage, currentUser]);

  const inviteUser = useCallback(async () => {
    if (!inviteEmail.trim() || !activeSession) return;

    try {
      sendMessage({
        type: 'invite_user',
        email: inviteEmail.trim(),
        sessionId: activeSession.id
      });

      addSystemMessage(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  }, [inviteEmail, activeSession]);

  const addSystemMessage = useCallback((message: string) => {
    const systemMessage: ChatMessage = {
      id: `sys-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      message,
      type: 'system',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, systemMessage]);
  }, []);

  const cleanup = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-6">
      {/* Collaboration Status */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle className="text-xl">Collaboration Hub</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time collaboration and telemedicine
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Wifi className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
                
                <Badge variant="outline">
                  {networkQuality === 'good' ? '🟢' : networkQuality === 'fair' ? '🟡' : '🔴'} 
                  {networkQuality}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!activeSession ? (
                <Button onClick={startCollaboration} disabled={!isConnected}>
                  <Users className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              ) : (
                <Button onClick={endCollaboration} variant="destructive">
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Session Info */}
        {activeSession && (
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="font-medium">{activeSession.title}</p>
                  <p className="text-sm text-gray-600">
                    Session ID: {activeSession.id}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isHost && (
                    <Badge variant="default">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {participants.length} participant(s)
                  </Badge>
                </div>
              </div>
              
              {/* Media Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={videoEnabled ? 'default' : 'outline'}
                  onClick={toggleVideo}
                >
                  {videoEnabled ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <VideoOff className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant={audioEnabled ? 'default' : 'outline'}
                  onClick={toggleAudio}
                >
                  {audioEnabled ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant={screenSharing ? 'default' : 'outline'}
                  onClick={toggleScreenSharing}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                
                {isHost && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Collaboration Interface */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Conference */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Video Conference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
                  {videoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-white">
                        <VideoOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Camera is off</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Participant overlays */}
                  <div className="absolute top-4 left-4 space-y-2">
                    {participants.map(participant => (
                      <div
                        key={participant.user.id}
                        className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-lg px-3 py-2"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {participant.user.firstName[0]}{participant.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">
                          {participant.user.firstName}
                        </span>
                        
                        <div className="flex space-x-1">
                          {participant.videoEnabled ? (
                            <Video className="w-3 h-3 text-green-400" />
                          ) : (
                            <VideoOff className="w-3 h-3 text-red-400" />
                          )}
                          {participant.audioEnabled ? (
                            <Mic className="w-3 h-3 text-green-400" />
                          ) : (
                            <MicOff className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat and Participants */}
          <div className="space-y-6">
            <Tabs defaultValue="chat" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="participants">
                  <Users className="w-4 h-4 mr-2" />
                  Participants
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Session Chat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Chat messages */}
                      <div className="h-64 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded">
                        {chatMessages.map(message => (
                          <div
                            key={message.id}
                            className={`text-sm ${
                              message.type === 'system'
                                ? 'text-center text-gray-500 italic'
                                : message.userId === currentUser.id
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {message.type !== 'system' && (
                              <div className="font-medium text-xs text-gray-600 mb-1">
                                {message.userName}
                              </div>
                            )}
                            <div
                              className={`inline-block px-3 py-2 rounded-lg max-w-xs ${
                                message.type === 'system'
                                  ? 'bg-gray-200 text-gray-600'
                                  : message.userId === currentUser.id
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white border'
                              }`}
                            >
                              {message.message}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat input */}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendChatMessage();
                            }
                          }}
                        />
                        <Button onClick={sendChatMessage} disabled={!newMessage.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="participants">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Participants ({participants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {participants.map(participant => (
                        <div
                          key={participant.user.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {participant.user.firstName[0]}{participant.user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <p className="font-medium text-sm">
                                {participant.user.firstName} {participant.user.lastName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {participant.role}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                participant.status === 'connected' ? 'default' :
                                participant.status === 'away' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {participant.status}
                            </Badge>
                            
                            <div className="flex space-x-1">
                              {participant.videoEnabled ? (
                                <Video className="w-3 h-3 text-green-500" />
                              ) : (
                                <VideoOff className="w-3 h-3 text-gray-400" />
                              )}
                              {participant.audioEnabled ? (
                                <Mic className="w-3 h-3 text-green-500" />
                              ) : (
                                <MicOff className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {participants.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No other participants in this session
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <CardContent className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-medium mb-4">Invite Collaborator</h3>
            <div className="space-y-4">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
              <div className="flex space-x-2">
                <Button onClick={inviteUser} className="flex-1">
                  Send Invitation
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}