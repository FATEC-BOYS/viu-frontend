import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Share2, 
  Star,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  FileText,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtFile {
  id: number;
  name: string;
  version: string;
  status: string;
  uploadDate: string;
  url: string;
  type: string;
  size: number;
  isMainVersion?: boolean;
  thumbnail?: string;
}

interface ArtViewerProps {
  art: ArtFile | null;
  allArts?: ArtFile[];
  open: boolean;
  onClose: () => void;
  onSetMainVersion?: (artId: number) => void;
  onDownload?: (art: ArtFile) => void;
  onShare?: (art: ArtFile) => void;
}

export default function ArtViewer({ 
  art, 
  allArts = [], 
  open, 
  onClose, 
  onSetMainVersion,
  onDownload,
  onShare 
}: ArtViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // For PDF support
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = art ? allArts.findIndex(a => a.id === art.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allArts.length - 1;

  useEffect(() => {
    if (open) {
      setZoom(100);
      setRotation(0);
      setCurrentPage(1);
      setIsPlaying(false);
    }
  }, [open, art]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) goToPrevious();
          break;
        case 'ArrowRight':
          if (hasNext) goToNext();
          break;
        case '+':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case ' ':
          if (art?.type.startsWith('video/')) {
            e.preventDefault();
            togglePlay();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, art, hasPrevious, hasNext]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const goToPrevious = () => {
    if (hasPrevious) {
      const previousArt = allArts[currentIndex - 1];
      // In a real app, this would trigger a parent component update
      console.log('Navigate to previous:', previousArt);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      const nextArt = allArts[currentIndex + 1];
      // In a real app, this would trigger a parent component update
      console.log('Navigate to next:', nextArt);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value / 100;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aprovado":
        return "bg-green-100 text-green-800";
      case "revisao":
        return "bg-orange-100 text-orange-800";
      case "feedback":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aprovado":
        return "Aprovado";
      case "revisao":
        return "Em Revisão";
      case "feedback":
        return "Aguardando Feedback";
      default:
        return status;
    }
  };

  const renderContent = () => {
    if (!art) return null;

    if (art.type.startsWith('image/')) {
      return (
        <div 
          ref={containerRef}
          className="flex items-center justify-center h-full overflow-hidden bg-black/5 rounded-lg"
        >
          <img
            ref={imageRef}
            src={art.url || "/placeholder.svg"}
            alt={art.name}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              cursor: zoom > 100 ? 'grab' : 'default'
            }}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      );
    }

    if (art.type.startsWith('video/')) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center bg-black rounded-lg">
            <video
              ref={videoRef}
              className="max-w-full max-h-[60vh] object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src={art.url || ""} type={art.type} />
              Seu navegador não suporta reprodução de vídeo.
            </video>
          </div>

          {/* Video Controls */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <div className="flex-1">
                <Progress 
                  value={duration ? (currentTime / duration) * 100 : 0}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newTime = (clickX / rect.width) * duration;
                    handleSeek(newTime);
                  }}
                />
              </div>
              
              <span className="text-sm text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <div className="w-24">
                <Progress 
                  value={volume}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newVolume = (clickX / rect.width) * 100;
                    handleVolumeChange(newVolume);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (art.type === 'application/pdf') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center h-[60vh] bg-muted/30 rounded-lg">
            <div className="text-center space-y-4">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold">Visualização de PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Clique em "Abrir PDF" para visualizar o arquivo
                </p>
              </div>
              <Button onClick={() => window.open(art.url, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir PDF
              </Button>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-[60vh] bg-muted/30 rounded-lg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Tipo de arquivo não suportado</h3>
            <p className="text-sm text-muted-foreground">
              Use o botão de download para baixar o arquivo
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!art) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <DialogTitle className="text-xl">{art.name}</DialogTitle>
                  <Badge variant="secondary" className={getStatusColor(art.status)}>
                    {getStatusLabel(art.status)}
                  </Badge>
                  {art.isMainVersion && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3 mr-1" />
                      Versão Principal
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  {art.version} • Enviado em {new Date(art.uploadDate).toLocaleDateString('pt-BR')}
                  {allArts.length > 1 && ` • ${currentIndex + 1} de ${allArts.length}`}
                </DialogDescription>
              </div>

              <div className="flex items-center space-x-2">
                {/* Navigation */}
                {allArts.length > 1 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={goToPrevious}
                      disabled={!hasPrevious}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={goToNext}
                      disabled={!hasNext}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* Tools for images */}
                {art.type.startsWith('image/') && (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">{zoom}%</span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRotate}>
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* Actions */}
                {onSetMainVersion && !art.isMainVersion && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onSetMainVersion(art.id)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                {onShare && (
                  <Button variant="ghost" size="sm" onClick={() => onShare(art)}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button variant="ghost" size="sm" onClick={() => onDownload(art)}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 pt-4">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-muted/30">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>Tipo: {art.type}</span>
                <span>Tamanho: {(art.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Use as setas do teclado para navegar</span>
                {art.type.startsWith('image/') && (
                  <span>• + / - para zoom • R para rotação</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
