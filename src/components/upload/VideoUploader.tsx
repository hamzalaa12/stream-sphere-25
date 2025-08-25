import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Play, Pause, CheckCircle, AlertCircle, HardDrive, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { VideoUploadService, UploadSession, VideoFile } from '@/services/VideoUploadService';
import { supabase } from '@/integrations/supabase/client';
import { parseUploadError, getUploadErrorMessage, shouldRetryUpload, getRetryDelay, logUploadError } from '@/utils/uploadErrorHandling';

interface VideoUploaderProps {
  contentId?: string;
  episodeId?: string;
  onUploadComplete?: (videoFile: VideoFile) => void;
  onUploadStart?: () => void;
}

interface InternalServer {
  id: string;
  name: string;
  description: string;
  used_storage_gb: number;
  max_storage_gb: number;
  is_active: boolean;
  priority: number;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  contentId,
  episodeId,
  onUploadComplete,
  onUploadStart
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>(['720p']);
  const [availableServers, setAvailableServers] = useState<InternalServer[]>([]);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const qualityOptions = [
    { value: '360p', label: '360p - جودة منخفضة' },
    { value: '480p', label: '480p - جودة متوسطة' },
    { value: '720p', label: '720p HD - جودة عالية' },
    { value: '1080p', label: '1080p FHD - جودة فائقة' },
    { value: '1440p', label: '1440p QHD - جودة ممتازة' },
    { value: '2160p', label: '2160p 4K - أعلى جودة' }
  ];

  // تحميل السيرفرات المتاحة
  React.useEffect(() => {
    fetchAvailableServers();
  }, []);

  const fetchAvailableServers = async () => {
    try {
      const { data: servers, error } = await supabase
        .from('internal_servers')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) throw error;
      setAvailableServers(servers || []);
      
      // تحديد السيرفر ��لأول كافتراضي
      if (servers && servers.length > 0) {
        setSelectedServers([servers[0].id]);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: '��طأ',
        description: 'فشل في تحميل السيرفرات المتاحة',
        variant: 'destructive'
      });
    }
  };

  // اختيار الملف
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      
      // حساب عدد القطع المتوقع
      const chunkSize = 1024 * 1024; // 1MB
      const chunks = Math.ceil(file.size / chunkSize);
      setTotalChunks(chunks);
    }
  };

  // بدء الرفع
  const startUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'تحذير',
        description: 'يرجى اختيار ملف فيديو للرفع',
        variant: 'destructive'
      });
      return;
    }

    if (selectedServers.length === 0) {
      toast({
        title: 'تحذير',
        description: 'يرجى اختيار سيرفر واحد على الأقل',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      onUploadStart?.();

      // إنشاء جلسة رفع جديدة
      const { session, videoFile } = await VideoUploadService.createUploadSession(
        selectedFile,
        contentId,
        episodeId
      );

      setUploadSession(session);
      setTotalChunks(session.total_chunks);

      // تحديد نقطة البداية (في حالة استئناف الرفع)
      const resumeFromChunk = await VideoUploadService.resumeUpload(session.id);
      if (resumeFromChunk > 0) {
        console.log(`Resuming upload from chunk ${resumeFromChunk + 1}`);
        setUploadedChunks(resumeFromChunk);
        const initialProgress = (resumeFromChunk / session.total_chunks) * 100;
        setUploadProgress(initialProgress);

        toast({
          title: 'استئناف الرفع',
          description: `تم استئناف الرفع من القطعة ${resumeFromChunk + 1}`,
        });
      }

      // بدء رفع القطع
      await uploadFileInChunks(selectedFile, session.id, resumeFromChunk);

      // عند الانتهاء
      onUploadComplete?.(videoFile);
      
      toast({
        title: 'نجح الرفع',
        description: 'تم رفع الفيديو بنجاح وبدء المعالجة',
      });

    } catch (error) {
      console.error('Upload error:', error);

      const uploadError = parseUploadError(error, { sessionId: uploadSession?.id });
      const errorMessage = getUploadErrorMessage(uploadError);

      logUploadError(uploadError, uploadSession?.id, {
        fileSize: selectedFile?.size,
        totalChunks,
        uploadedChunks
      });

      setUploadError(errorMessage.description);

      toast({
        title: errorMessage.title,
        description: errorMessage.description + (errorMessage.action ? `\n${errorMessage.action}` : ''),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // رفع الملف بالقطع مع إمكانية الاستئناف
  const uploadFileInChunks = async (file: File, sessionId: string, resumeFromChunk = 0) => {
    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = resumeFromChunk * chunkSize;
    const startTime = Date.now();

    console.log(`Starting upload from chunk ${resumeFromChunk} of ${totalChunks}`);

    for (let chunkNumber = resumeFromChunk; chunkNumber < totalChunks; chunkNumber++) {
      if (isPaused) {
        // انتظار حتى يتم الاستئناف
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) {
              resolve(undefined);
            } else {
              setTimeout(checkPause, 100);
            }
          };
          checkPause();
        });
      }

      const start = chunkNumber * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const chunkData = await chunk.arrayBuffer();
      
      try {
        await VideoUploadService.uploadChunk(
          sessionId,
          chunkNumber,
          chunkData,
          (progress) => {
            setUploadProgress(progress);
            setUploadedChunks(chunkNumber + 1);
            
            // حساب سرعة الرفع والوقت المتبقي
            uploadedBytes += chunkData.byteLength;
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speed = uploadedBytes / elapsedTime; // bytes per second
            const remainingBytes = file.size - uploadedBytes;
            const estimatedRemaining = remainingBytes / speed;
            
            setUploadSpeed(speed);
            setEstimatedTime(estimatedRemaining);
          }
        );
      } catch (error) {
        console.error(`Chunk ${chunkNumber + 1} upload failed:`, error);

        const uploadError = parseUploadError(error, {
          chunkNumber,
          sessionId
        });

        logUploadError(uploadError, sessionId, {
          fileName: file.name,
          fileSize: file.size,
          chunkSize: chunkData.byteLength,
          totalChunks
        });

        throw new Error(`فشل في رفع القطعة ${chunkNumber + 1}: ${uploadError.message}`);
      }
    }
  };

  // إيقاف/استئناف الرفع
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // إلغاء الرفع
  const cancelUpload = async () => {
    if (uploadSession) {
      try {
        await VideoUploadService.cancelUpload(uploadSession.id);
        setIsUploading(false);
        setUploadSession(null);
        setUploadProgress(0);
        setSelectedFile(null);
        setUploadError(null);
        
        toast({
          title: 'تم الإلغاء',
          description: 'تم إلغاء عملية الرفع بنجاح'
        });
      } catch (error) {
        toast({
          title: 'خطأ',
          description: 'فشل في إلغاء عملية الرفع',
          variant: 'destructive'
        });
      }
    }
  };

  // تنسيق الحجم
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // تنسيق الوقت
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // تنسيق السرعة
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  // حساب النسبة المئوية للتخزين
  const getStoragePercentage = (server: InternalServer): number => {
    return (server.used_storage_gb / server.max_storage_gb) * 100;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          رفع ملف الفيديو
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* اختيار الملف */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>اختيار ملف الفيديو</Label>
            <Badge variant="outline">
              الحد الأقصى: 10GB
            </Badge>
          </div>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              selectedFile 
                ? 'border-green-300 bg-green-50 dark:bg-green-950' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {totalChunks} قطعة
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  اختيار ملف آخر
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    اختيار ملف فيديو
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    التنسيقات المدعومة: MP4, AVI, MKV, MOV, WMV, WebM
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <>
            <Separator />
            
            {/* اختيار السيرفرات */}
            <div className="space-y-4">
              <Label>اختيار السيرفرات للرفع عليها</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableServers.map((server) => (
                  <Card
                    key={server.id}
                    className={`cursor-pointer transition-colors ${
                      selectedServers.includes(server.id)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                    onClick={() => {
                      if (selectedServers.includes(server.id)) {
                        setSelectedServers(selectedServers.filter(id => id !== server.id));
                      } else {
                        setSelectedServers([...selectedServers, server.id]);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            <span className="font-medium">{server.name}</span>
                            <Badge variant="outline" className="text-xs">
                              أولوية {server.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {server.description}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>التخزين المستخدم</span>
                              <span>
                                {server.used_storage_gb}GB / {server.max_storage_gb}GB
                              </span>
                            </div>
                            <Progress 
                              value={getStoragePercentage(server)} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* اختيار الجودات */}
            <div className="space-y-4">
              <Label>اختيار الجودات المطلوبة</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {qualityOptions.map((quality) => (
                  <Card
                    key={quality.value}
                    className={`cursor-pointer transition-colors ${
                      selectedQualities.includes(quality.value)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                    onClick={() => {
                      if (selectedQualities.includes(quality.value)) {
                        setSelectedQualities(selectedQualities.filter(q => q !== quality.value));
                      } else {
                        setSelectedQualities([...selectedQualities, quality.value]);
                      }
                    }}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-medium text-sm">{quality.value}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {quality.label.split(' - ')[1]}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* حالة الرفع */}
            {isUploading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>حالة الرفع</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={togglePause}
                      disabled={!isUploading}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? '��ستئناف' : 'إيقاف مؤقت'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={cancelUpload}
                    >
                      <X className="h-4 w-4" />
                      إلغاء
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>التقدم: {uploadedChunks} / {totalChunks} قطعة</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-3" />
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>السرعة: {formatSpeed(uploadSpeed)}</div>
                    <div>الوقت المتبقي: {formatTime(estimatedTime)}</div>
                  </div>
                </div>

                {isPaused && (
                  <Alert>
                    <Pause className="h-4 w-4" />
                    <AlertDescription>
                      تم إيقاف الرفع مؤقتاً. اضغط "استئ��اف" للمتابعة.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadError}
                  {uploadSession && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setUploadError(null);
                          setIsUploading(true);
                          try {
                            const resumeFromChunk = await VideoUploadService.resumeUpload(uploadSession.id);
                            await uploadFileInChunks(selectedFile!, uploadSession.id, resumeFromChunk);

                            toast({
                              title: 'نجح الرفع',
                              description: 'تم استكمال رفع الفيديو بنجاح',
                            });

                            onUploadComplete?.({
                              id: uploadSession.video_file_id,
                              original_filename: selectedFile!.name,
                              file_size_bytes: selectedFile!.size,
                              mime_type: selectedFile!.type,
                              upload_status: 'completed',
                              processing_status: 'processing'
                            } as VideoFile);

                          } catch (retryError) {
                            const retryUploadError = parseUploadError(retryError);
                            const retryErrorMessage = getUploadErrorMessage(retryUploadError);
                            setUploadError(retryErrorMessage.description);
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        disabled={isUploading}
                      >
                        إعادة المحاولة
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {uploadProgress === 100 && !uploadError && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  تم رفع الفيديو بنجاح! جاري المعالجة لإنتاج الجودات المختلفة...
                </AlertDescription>
              </Alert>
            )}

            {/* زر بدء الرفع */}
            {!isUploading && uploadProgress < 100 && (
              <Button
                onClick={startUpload}
                disabled={!selectedFile || selectedServers.length === 0 || selectedQualities.length === 0}
                className="w-full"
                size="lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                بدء رفع الفيديو
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
