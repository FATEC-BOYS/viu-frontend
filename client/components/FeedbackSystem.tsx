import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Send, 
  Volume2,
  VolumeX,
  Download,
  Trash2,
  Clock,
  User,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Pin,
  MapPin,
  RotateCcw,
  Copy
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Feedback {
  id: number;
  type: 'text' | 'audio';
  content: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  author: string;
  authorRole: 'designer' | 'client';
  timestamp: string;
  status: 'pending' | 'resolved' | 'archived';
  annotations?: {
    x: number;
    y: number;
    note: string;
  }[];
  isPrivate?: boolean;
  replyTo?: number;
}

interface FeedbackSystemProps {
  artId: number;
  artName: string;
  feedbacks: Feedback[];
  onAddFeedback: (feedback: Omit<Feedback, 'id' | 'timestamp'>) => void;
  onUpdateFeedback: (feedbackId: number, updates: Partial<Feedback>) => void;
  onDeleteFeedback: (feedbackId: number) => void;
  userRole: 'designer' | 'client';
  userName: string;
}

export default function FeedbackSystem({
  artId,
  artName,
  feedbacks,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
  userRole,
  userName
}: FeedbackSystemProps) {
  const [newTextFeedback, setNewTextFeedback] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotations, setAnnotations] = useState<{ x: number; y: number; note: string }[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [annotationNote, setAnnotationNote] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const artImageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const simulateTranscription = async (audioBlob: Blob): Promise<string> => {
    // Simulate API call to speech-to-text service
    setIsTranscribing(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsTranscribing(false);
        // Mock transcription result
        resolve("Esta é uma transcrição automática do áudio. O feedback foi registrado com sucesso e pode conter sugestões importantes sobre o design.");
      }, 3000);
    });
  };

  const handleTextFeedback = async () => {
    if (!newTextFeedback.trim() && annotations.length === 0) return;

    const feedback: Omit<Feedback, 'id' | 'timestamp'> = {
      type: 'text',
      content: newTextFeedback.trim(),
      author: userName,
      authorRole: userRole,
      status: 'pending',
      annotations: annotations.length > 0 ? annotations : undefined,
      replyTo: replyToId || undefined,
    };

    onAddFeedback(feedback);
    setNewTextFeedback("");
    setAnnotations([]);
    setReplyToId(null);
  };

  const handleAudioFeedback = async () => {
    if (!audioBlob) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    let transcription = "";

    try {
      transcription = await simulateTranscription(audioBlob);
    } catch (error) {
      console.error('Erro na transcrição:', error);
    }

    const feedback: Omit<Feedback, 'id' | 'timestamp'> = {
      type: 'audio',
      content: transcription || "Áudio sem transcrição disponível",
      audioUrl,
      audioDuration: recordingDuration,
      transcription,
      author: userName,
      authorRole: userRole,
      status: 'pending',
      replyTo: replyToId || undefined,
    };

    onAddFeedback(feedback);
    setAudioBlob(null);
    setRecordingDuration(0);
    setReplyToId(null);
  };

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!showAnnotations) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setCurrentAnnotation({ x, y });
  };

  const addAnnotation = () => {
    if (currentAnnotation && annotationNote.trim()) {
      setAnnotations(prev => [...prev, {
        ...currentAnnotation,
        note: annotationNote.trim()
      }]);
      setCurrentAnnotation(null);
      setAnnotationNote("");
    }
  };

  const removeAnnotation = (index: number) => {
    setAnnotations(prev => prev.filter((_, i) => i !== index));
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'all') return true;
    return feedback.status === filter;
  });

  const sortedFeedbacks = filteredFeedbacks.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const AudioPlayer = ({ feedback }: { feedback: Feedback }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(feedback.audioDuration || 0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    return (
      <div className="space-y-2">
        <audio
          ref={audioRef}
          src={feedback.audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
        
        <div className="flex items-center space-x-3 bg-muted/50 p-3 rounded">
          <Button variant="outline" size="sm" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <div className="flex-1">
            <Progress value={duration ? (currentTime / duration) * 100 : 0} className="h-2" />
          </div>
          
          <span className="text-sm text-muted-foreground">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
          </span>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {feedback.transcription && (
          <div className="mt-2">
            <div className="flex items-center space-x-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Transcrição Automática</span>
              <Button variant="ghost" size="sm">
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-sm bg-muted/30 p-2 rounded italic">
              {feedback.transcription}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Art Preview with Annotations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Feedback em {artName}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={showAnnotations ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Anotações
              </Button>
              <select
                className="text-sm border rounded px-2 py-1"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="resolved">Resolvidos</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={artImageRef}
            className="relative bg-muted/30 rounded-lg h-64 flex items-center justify-center cursor-crosshair"
            onClick={handleImageClick}
          >
            <div className="text-muted-foreground">
              {showAnnotations ? "Clique na imagem para adicionar anotações" : "Preview da Arte"}
            </div>
            
            {/* Existing Annotations */}
            {annotations.map((annotation, index) => (
              <div
                key={index}
                className="absolute w-4 h-4 bg-red-500 rounded-full cursor-pointer flex items-center justify-center text-white text-xs font-bold"
                style={{ 
                  left: `${annotation.x}%`, 
                  top: `${annotation.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={annotation.note}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAnnotation(index);
                }}
              >
                {index + 1}
              </div>
            ))}
            
            {/* Current Annotation */}
            {currentAnnotation && (
              <div
                className="absolute w-4 h-4 bg-blue-500 rounded-full animate-pulse"
                style={{ 
                  left: `${currentAnnotation.x}%`, 
                  top: `${currentAnnotation.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )}
          </div>

          {/* Annotation Input */}
          {currentAnnotation && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Nova Anotação</h4>
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Descreva o feedback para este ponto específico..."
                  value={annotationNote}
                  onChange={(e) => setAnnotationNote(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <div className="flex flex-col space-y-2">
                  <Button size="sm" onClick={addAnnotation} disabled={!annotationNote.trim()}>
                    Adicionar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setCurrentAnnotation(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Annotations List */}
          {annotations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Anotações Adicionadas</h4>
              <div className="space-y-2">
                {annotations.map((annotation, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="flex-1">{annotation.note}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAnnotation(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {replyToId ? "Responder Feedback" : "Adicionar Feedback"}
          </CardTitle>
          {replyToId && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Respondendo ao feedback #{replyToId}</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyToId(null)}>
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text Feedback */}
          <div>
            <label className="text-sm font-medium mb-2 block">Feedback por Texto</label>
            <Textarea
              placeholder="Escreva seu feedback sobre a arte..."
              value={newTextFeedback}
              onChange={(e) => setNewTextFeedback(e.target.value)}
              rows={4}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                {annotations.length > 0 && `${annotations.length} anotação(ões) adicionada(s)`}
              </span>
              <Button 
                onClick={handleTextFeedback}
                disabled={!newTextFeedback.trim() && annotations.length === 0}
                size="sm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar Feedback
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Audio Feedback */}
          <div>
            <label className="text-sm font-medium mb-2 block">Feedback por Áudio</label>
            
            {!audioBlob ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="flex-shrink-0"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Parar ({formatDuration(recordingDuration)})
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Gravar Áudio
                      </>
                    )}
                  </Button>
                  
                  {isRecording && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Gravando...</span>
                    </div>
                  )}
                </div>
                
                {isRecording && (
                  <Alert>
                    <Mic className="h-4 w-4" />
                    <AlertDescription>
                      Gravação em andamento. Máximo de 5 minutos. Clique em "Parar" quando terminar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Áudio Gravado</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  
                  <audio controls className="w-full mb-3">
                    <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
                  </audio>
                  
                  {isTranscribing && (
                    <div className="flex items-center space-x-2 mb-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Transcrevendo áudio...</span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleAudioFeedback}
                      disabled={isTranscribing}
                      className="flex-1"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Áudio
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setAudioBlob(null);
                        setRecordingDuration(0);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Feedbacks ({sortedFeedbacks.length})
        </h3>

        {sortedFeedbacks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Nenhum feedback ainda</h4>
              <p className="text-muted-foreground">
                Seja o primeiro a adicionar feedback para esta arte.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedFeedbacks.map((feedback) => (
            <Card key={feedback.id} className={cn(
              "transition-all",
              feedback.status === 'resolved' && "opacity-75"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {feedback.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold">{feedback.author}</span>
                      <Badge variant="outline">
                        {feedback.authorRole === 'designer' ? 'Designer' : 'Cliente'}
                      </Badge>
                      <Badge variant="secondary" className={cn(
                        feedback.type === 'audio' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {feedback.type === 'audio' ? <Mic className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                        {feedback.type === 'audio' ? 'Áudio' : 'Texto'}
                      </Badge>
                      <Badge variant="secondary" className={cn(
                        feedback.status === 'resolved' ? "bg-green-100 text-green-800" : 
                        feedback.status === 'pending' ? "bg-orange-100 text-orange-800" : 
                        "bg-gray-100 text-gray-800"
                      )}>
                        {feedback.status === 'resolved' ? 'Resolvido' : 
                         feedback.status === 'pending' ? 'Pendente' : 'Arquivado'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.timestamp), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>

                    {feedback.type === 'text' ? (
                      <p className="text-sm mb-3">{feedback.content}</p>
                    ) : (
                      <div className="mb-3">
                        <AudioPlayer feedback={feedback} />
                      </div>
                    )}

                    {/* Annotations */}
                    {feedback.annotations && feedback.annotations.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">Anotações:</h5>
                        <div className="space-y-1">
                          {feedback.annotations.map((annotation, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs">
                              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <span>{annotation.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setReplyToId(feedback.id)}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Responder
                      </Button>
                      
                      {feedback.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onUpdateFeedback(feedback.id, { status: 'resolved' })}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Marcar como Resolvido
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDeleteFeedback(feedback.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
