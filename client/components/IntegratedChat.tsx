import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreHorizontal, 
  Download,
  Eye,
  Reply,
  Search,
  Phone,
  Video,
  Settings,
  Archive,
  Pin,
  Star,
  Circle,
  CheckCircle2,
  Image as ImageIcon,
  File,
  Clock,
  Users
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  sender: string;
  senderRole: 'designer' | 'client' | 'system';
  timestamp: string;
  readBy: string[];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: number;
  isEdited?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
}

interface ChatParticipant {
  id: string;
  name: string;
  role: 'designer' | 'client';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface IntegratedChatProps {
  projectId: number;
  projectName: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  currentUser: string;
  currentUserRole: 'designer' | 'client';
  onSendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'readBy'>) => void;
  onSendFile: (file: File, type: 'file' | 'image') => void;
  onMarkAsRead: (messageIds: number[]) => void;
}

export default function IntegratedChat({
  projectId,
  projectName,
  participants,
  messages,
  currentUser,
  currentUserRole,
  onSendMessage,
  onSendFile,
  onMarkAsRead
}: IntegratedChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when component loads
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => !msg.readBy.includes(currentUser) && msg.sender !== currentUser)
      .map(msg => msg.id);
    
    if (unreadMessages.length > 0) {
      onMarkAsRead(unreadMessages);
    }
  }, [messages, currentUser, onMarkAsRead]);

  // Simulate typing indicator
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (newMessage.length > 0) {
      setIsTyping(true);
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [newMessage]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Omit<ChatMessage, 'id' | 'timestamp' | 'readBy'> = {
      content: newMessage.trim(),
      type: 'text',
      sender: currentUser,
      senderRole: currentUserRole,
      replyTo: replyToMessage?.id,
    };

    onSendMessage(message);
    setNewMessage("");
    setReplyToMessage(null);
    messageInputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    
    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      onSendFile(file, isImage ? 'image' : 'file');
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Ontem ${format(date, "HH:mm")}`;
    } else {
      return format(date, "dd/MM HH:mm");
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      let dateKey;
      
      if (isToday(date)) {
        dateKey = 'Hoje';
      } else if (isYesterday(date)) {
        dateKey = 'Ontem';
      } else {
        dateKey = format(date, "dd 'de' MMMM", { locale: ptBR });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const messageGroups = groupMessagesByDate(filteredMessages);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension || '')) {
      return ImageIcon;
    }
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onlineParticipants = participants.filter(p => p.isOnline);
  const offlineParticipants = participants.filter(p => !p.isOnline);

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{projectName}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{participants.length} participantes</span>
              <span>•</span>
              <span>{onlineParticipants.length} online</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Buscar mensagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center space-x-2 mt-3">
          {participants.slice(0, 5).map((participant) => (
            <div key={participant.id} className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback>
                  {participant.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                participant.isOnline ? "bg-green-500" : "bg-gray-400"
              )} />
            </div>
          ))}
          {participants.length > 5 && (
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
              +{participants.length - 5}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    {date}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message, index) => {
                    const isOwnMessage = message.sender === currentUser;
                    const showAvatar = !isOwnMessage && (
                      index === 0 || 
                      dateMessages[index - 1]?.sender !== message.sender
                    );
                    const isRead = message.readBy.length > 1; // More than just sender

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-end space-x-2",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwnMessage && (
                          <Avatar className={cn("w-8 h-8", !showAvatar && "invisible")}>
                            <AvatarFallback>
                              {message.sender.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={cn(
                          "max-w-[70%] space-y-1",
                          isOwnMessage && "items-end"
                        )}>
                          {/* Reply Reference */}
                          {message.replyTo && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <Reply className="w-3 h-3 inline mr-1" />
                              Respondendo a mensagem anterior
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={cn(
                            "px-4 py-2 rounded-lg relative group",
                            isOwnMessage 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted",
                            message.type === 'system' && "bg-blue-50 text-blue-800 text-center text-sm"
                          )}>
                            {/* Sender Name (for group chats) */}
                            {!isOwnMessage && showAvatar && (
                              <div className="text-xs font-medium mb-1">
                                {message.sender}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {message.senderRole === 'designer' ? 'Designer' : 'Cliente'}
                                </Badge>
                              </div>
                            )}

                            {/* Message Content */}
                            {message.type === 'text' && (
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}

                            {message.type === 'file' && (
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="flex-shrink-0">
                                  {React.createElement(getFileIcon(message.fileName || ''), { 
                                    className: "w-8 h-8" 
                                  })}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{message.fileName}</p>
                                  <p className="text-xs opacity-75">
                                    {message.fileSize && formatFileSize(message.fileSize)}
                                  </p>
                                </div>
                                <div className="flex space-x-1">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {message.type === 'image' && (
                              <div className="space-y-2">
                                <img 
                                  src={message.fileUrl} 
                                  alt={message.fileName}
                                  className="max-w-full rounded cursor-pointer"
                                  onClick={() => window.open(message.fileUrl, '_blank')}
                                />
                                <div className="flex justify-between items-center">
                                  <span className="text-xs opacity-75">{message.fileName}</span>
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Message Actions */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setReplyToMessage(message)}
                                >
                                  <Reply className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Star className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Message Info */}
                          <div className={cn(
                            "flex items-center space-x-2 text-xs text-muted-foreground",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}>
                            <span>{formatMessageTime(message.timestamp)}</span>
                            {message.isEdited && <span>(editado)</span>}
                            {isOwnMessage && (
                              <div className="flex items-center space-x-1">
                                {isRead ? (
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Circle className="w-3 h-3" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {currentUser.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Avatar className="w-6 h-6">
                  <AvatarFallback>
                    {typingUsers[0].split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>{typingUsers[0]} está digitando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Reply className="w-4 h-4" />
              <span>Respondendo a <strong>{replyToMessage.sender}</strong></span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReplyToMessage(null)}
            >
              ×
            </Button>
          </div>
          <div className="text-sm text-muted-foreground truncate mt-1">
            {replyToMessage.content}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-end space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <Input
              ref={messageInputRef}
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="resize-none"
            />
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
          >
            <Smile className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
      />
    </Card>
  );
}
