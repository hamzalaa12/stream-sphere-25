import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, Cpu, HardDrive, Wifi, Database, 
  Activity, AlertTriangle, CheckCircle, 
  RefreshCw, Settings, Monitor, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    load1m: number;
    load5m: number;
    load15m: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    iops: number;
  };
  network: {
    upload: number;
    download: number;
    latency: number;
    packetsLost: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
    size: number;
    slowQueries: number;
  };
  services: {
    web: 'active' | 'inactive' | 'error';
    database: 'active' | 'inactive' | 'error';
    cdn: 'active' | 'inactive' | 'error';
    storage: 'active' | 'inactive' | 'error';
    streaming: 'active' | 'inactive' | 'error';
  };
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: {
      usage: 0,
      cores: 8,
      temperature: 65,
      load1m: 0.5,
      load5m: 0.7,
      load15m: 0.8
    },
    memory: {
      total: 32,
      used: 0,
      free: 0,
      cached: 0,
      usage: 0
    },
    disk: {
      total: 1000,
      used: 0,
      free: 0,
      usage: 0,
      iops: 0
    },
    network: {
      upload: 0,
      download: 0,
      latency: 0,
      packetsLost: 0
    },
    database: {
      connections: 0,
      maxConnections: 100,
      queryTime: 0,
      size: 0,
      slowQueries: 0
    },
    services: {
      web: 'active',
      database: 'active',
      cdn: 'active',
      storage: 'active',
      streaming: 'active'
    }
  });

  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    generateMetrics();
    const interval = setInterval(() => {
      if (autoRefresh) {
        generateMetrics();
      }
    }, 5000); // تحديث كل 5 ثوانِ

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const generateMetrics = () => {
    // محاكاة بيانات النظام (في التطبيق الحقيقي، ستأتي من API)
    const newMetrics: SystemMetrics = {
      cpu: {
        usage: Math.floor(Math.random() * 80) + 10,
        cores: 8,
        temperature: Math.floor(Math.random() * 20) + 55,
        load1m: Math.random() * 2,
        load5m: Math.random() * 2,
        load15m: Math.random() * 2
      },
      memory: {
        total: 32,
        used: Math.floor(Math.random() * 24) + 4,
        free: 0,
        cached: Math.floor(Math.random() * 4) + 1,
        usage: 0
      },
      disk: {
        total: 1000,
        used: Math.floor(Math.random() * 600) + 200,
        free: 0,
        usage: 0,
        iops: Math.floor(Math.random() * 1000) + 100
      },
      network: {
        upload: Math.floor(Math.random() * 100) + 10,
        download: Math.floor(Math.random() * 500) + 50,
        latency: Math.floor(Math.random() * 50) + 5,
        packetsLost: Math.random() * 0.1
      },
      database: {
        connections: Math.floor(Math.random() * 80) + 10,
        maxConnections: 100,
        queryTime: Math.random() * 50 + 5,
        size: Math.floor(Math.random() * 50) + 10,
        slowQueries: Math.floor(Math.random() * 5)
      },
      services: {
        web: Math.random() > 0.95 ? 'error' : 'active',
        database: Math.random() > 0.98 ? 'error' : 'active',
        cdn: Math.random() > 0.97 ? 'error' : 'active',
        storage: Math.random() > 0.96 ? 'error' : 'active',
        streaming: Math.random() > 0.94 ? 'error' : 'active'
      }
    };

    // حساب القيم المشتقة
    newMetrics.memory.free = newMetrics.memory.total - newMetrics.memory.used - newMetrics.memory.cached;
    newMetrics.memory.usage = (newMetrics.memory.used / newMetrics.memory.total) * 100;
    
    newMetrics.disk.free = newMetrics.disk.total - newMetrics.disk.used;
    newMetrics.disk.usage = (newMetrics.disk.used / newMetrics.disk.total) * 100;

    setMetrics(newMetrics);
    setLastUpdate(new Date());

    // إضافة نقطة جديدة لبيانات الأداء
    const newDataPoint: PerformanceData = {
      timestamp: new Date().toLocaleTimeString('ar'),
      cpu: newMetrics.cpu.usage,
      memory: newMetrics.memory.usage,
      network: newMetrics.network.download
    };

    setPerformanceHistory(prev => {
      const updated = [...prev, newDataPoint];
      return updated.slice(-20); // الاحتفاظ بآخر 20 نقطة
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'inactive': return 'text-yellow-500 bg-yellow-500/10';
      case 'error': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'inactive': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'error': return 'خطأ';
      default: return 'غير معروف';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-500';
    if (usage < 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} GB`;
    return `${(bytes / 1024).toFixed(1)} TB`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">مراقب النظام</h2>
            <p className="text-muted-foreground">
              آخر تحديث: {lastUpdate.toLocaleTimeString('ar')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'إيقاف التحديث' : 'تشغيل التحديث'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={generateMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث يدوي
          </Button>
        </div>
      </div>

      {/* الخدمات */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            حالة الخدمات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(metrics.services).map(([service, status]) => (
              <motion.div
                key={service}
                whileHover={{ scale: 1.05 }}
                className="text-center"
              >
                <div className={`p-3 rounded-lg ${getStatusColor(status)} mb-2`}>
                  <div className="flex items-center justify-center mb-2">
                    {getStatusIcon(status)}
                  </div>
                  <p className="text-sm font-medium capitalize">{service}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getStatusText(status)}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* المقاييس الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* المعالج */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-500" />
                <span className="font-medium">المعالج</span>
              </div>
              <span className={`text-2xl font-bold ${getUsageColor(metrics.cpu.usage)}`}>
                {metrics.cpu.usage}%
              </span>
            </div>
            
            <Progress value={metrics.cpu.usage} className="mb-4" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>الأنوية:</span>
                <span>{metrics.cpu.cores}</span>
              </div>
              <div className="flex justify-between">
                <span>الحرارة:</span>
                <span>{metrics.cpu.temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span>الحمولة (1م):</span>
                <span>{metrics.cpu.load1m.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الذاكرة */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <span className="font-medium">الذاكرة</span>
              </div>
              <span className={`text-2xl font-bold ${getUsageColor(metrics.memory.usage)}`}>
                {metrics.memory.usage.toFixed(0)}%
              </span>
            </div>
            
            <Progress value={metrics.memory.usage} className="mb-4" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>الإجمالي:</span>
                <span>{metrics.memory.total} GB</span>
              </div>
              <div className="flex justify-between">
                <span>المستخدم:</span>
                <span>{metrics.memory.used} GB</span>
              </div>
              <div className="flex justify-between">
                <span>التخزين المؤقت:</span>
                <span>{metrics.memory.cached} GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التخزين */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-purple-500" />
                <span className="font-medium">التخزين</span>
              </div>
              <span className={`text-2xl font-bold ${getUsageColor(metrics.disk.usage)}`}>
                {metrics.disk.usage.toFixed(0)}%
              </span>
            </div>
            
            <Progress value={metrics.disk.usage} className="mb-4" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>الإجمالي:</span>
                <span>{formatBytes(metrics.disk.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>المستخدم:</span>
                <span>{formatBytes(metrics.disk.used)}</span>
              </div>
              <div className="flex justify-between">
                <span>IOPS:</span>
                <span>{metrics.disk.iops}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الشبكة */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-orange-500" />
                <span className="font-medium">الشبكة</span>
              </div>
              <span className="text-2xl font-bold text-orange-500">
                {metrics.network.latency}ms
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>التحميل:</span>
                <span className="text-green-500">{metrics.network.download} Mbps</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>الرفع:</span>
                <span className="text-blue-500">{metrics.network.upload} Mbps</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>الحزم المفقودة:</span>
                <span className="text-red-500">{metrics.network.packetsLost.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قاعدة البيانات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              إحصائيات قاعدة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>الاتصالات النشطة</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(metrics.database.connections / metrics.database.maxConnections) * 100} 
                    className="w-24" 
                  />
                  <span className="font-medium">
                    {metrics.database.connections}/{metrics.database.maxConnections}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span>متوسط وقت الاستعلام</span>
                <span className="font-medium">{metrics.database.queryTime.toFixed(1)}ms</span>
              </div>
              
              <div className="flex justify-between">
                <span>حجم قاعدة البيانات</span>
                <span className="font-medium">{formatBytes(metrics.database.size)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>الاستعلامات البطيئة</span>
                <span className={`font-medium ${metrics.database.slowQueries > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {metrics.database.slowQueries}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الأداء التاريخي */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              الأداء التاريخي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="المعالج %"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="الذاكرة %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}