// components/feedback/FeedbackPanel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// Define o formato dos dados que o componente retornará
export interface FeedbackData {
  text: string;
  audio?: Blob;
}

// Define as propriedades que o componente aceita (uma função onSubmit)
interface FeedbackPanelProps {
  onSubmit: (data: FeedbackData) => Promise<void>;
}

export function FeedbackPanel({ onSubmit }: FeedbackPanelProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs para manipular o gravador de mídia e o timer
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Função para iniciar a gravação
  const startRecording = async () => {
    // Solicita permissão para usar o microfone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      // Armazena os pedaços de áudio gravados
      const audioChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      // Quando a gravação para, junta os pedaços e cria um Blob
      recorder.onstop = () => {
        const completeBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(completeBlob);
        // Para o stream do microfone para o ícone do navegador sumir
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      // Inicia o timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      alert('Não foi possível acessar o microfone. Por favor, verifique as permissões do seu navegador.');
    }
  };

  // Função para parar a gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Função para descartar o áudio gravado
  const discardAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Função para formatar o tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !audioBlob) {
      alert('Por favor, escreva um texto ou grave um áudio.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      text: text,
      audio: audioBlob || undefined,
    });
    // Limpa o formulário após o envio
    setText('');
    discardAudio();
    setIsSubmitting(false);
  };

  // Limpa os timers quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Escreva seu feedback aqui..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        disabled={isSubmitting}
      />

      {/* Seção de Gravação de Áudio */}
      <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
        {!isRecording && !audioBlob && (
          <Button type="button" variant="outline" size="icon" onClick={startRecording} disabled={isSubmitting}>
            <Mic className="size-5" />
          </Button>
        )}
        {isRecording && (
          <Button type="button" variant="destructive" size="icon" onClick={stopRecording}>
            <Square className="size-5" />
          </Button>
        )}
        <div className="flex-1">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <Progress value={(recordingTime % 60) * (100/60)} className="h-2" />
              <span className="text-sm font-mono text-destructive">{formatTime(recordingTime)}</span>
            </div>
          ) : audioBlob ? (
            <div className="flex items-center gap-2">
              <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10" />
              <Button type="button" variant="ghost" size="icon" onClick={discardAudio}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ou grave um feedback em áudio</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isSubmitting || isRecording}>
        {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
        <Send className="size-4" />
      </Button>
    </form>
  );
}
