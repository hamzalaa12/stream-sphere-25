import React from 'react';
import { Download, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ServerCardProps {
  server: {
    id: string;
    server_name: string;
    quality: string;
    streaming_url: string;
    download_url?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  showDownload?: boolean;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  isSelected,
  onSelect,
  showDownload = false
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all border-2 hover:border-primary/50 ${
        isSelected ? 'border-primary bg-primary/10' : 'border-border'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <h4 className="font-semibold">{server.server_name}</h4>
              </div>
              <p className="text-sm text-muted-foreground">جودة {server.quality}</p>
            </div>
            {isSelected && (
              <Badge variant="default">نشط</Badge>
            )}
          </div>
          
          {showDownload && server.download_url && (
            <Button 
              asChild 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={server.download_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                تحميل {server.quality}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};