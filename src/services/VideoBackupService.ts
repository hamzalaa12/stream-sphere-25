import { supabase } from '@/integrations/supabase/client';

export interface BackupJob {
  id: string;
  video_quality_id: string;
  backup_server_id: string;
  backup_path: string;
  backup_size_bytes: number;
  checksum?: string;
  backup_type: 'auto' | 'manual';
  is_verified: boolean;
  created_at: string;
}

export interface BackupPolicy {
  id: string;
  name: string;
  description: string;
  backup_frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  min_backup_copies: number;
  backup_servers: string[];
  quality_filter: string[];
  is_active: boolean;
}

export interface BackupStats {
  total_backups: number;
  verified_backups: number;
  failed_backups: number;
  total_size_bytes: number;
  last_backup_time: string;
  redundancy_level: number;
}

export class VideoBackupService {
  private static readonly DEFAULT_RETENTION_DAYS = 90;
  private static readonly MIN_BACKUP_COPIES = 2;
  private static readonly VERIFICATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  // إنشاء نسخة احتياطية لفيديو
  static async createBackup(
    videoQualityId: string,
    backupServerId: string,
    backupType: 'auto' | 'manual' = 'auto'
  ): Promise<BackupJob> {
    try {
      // الحصول على معلومات جودة الفيديو
      const { data: videoQuality, error: qualityError } = await supabase
        .from('video_qualities')
        .select('*, video_files(*)')
        .eq('id', videoQualityId)
        .single();

      if (qualityError || !videoQuality) {
        throw new Error('لا يمكن العثور على ملف الفيديو');
      }

      // الحصول على معلومات السيرفر الاحتياطي
      const { data: backupServer, error: serverError } = await supabase
        .from('internal_servers')
        .select('*')
        .eq('id', backupServerId)
        .eq('is_active', true)
        .single();

      if (serverError || !backupServer) {
        throw new Error('السيرفر الاحتياطي غير متوفر');
      }

      // إنشاء مسار النسخة الاحتياطية
      const backupPath = this.generateBackupPath(
        backupServer.storage_path,
        videoQuality.video_files.id,
        videoQuality.quality
      );

      // نسخ الملف إلى السيرفر الاحتياطي
      await this.copyFileToBackupServer(
        videoQuality.file_path,
        backupPath,
        backupServer
      );

      // حساب checksum للتحقق من سلامة النسخة
      const checksum = await this.calculateFileChecksum(backupPath);

      // إنشاء سجل النسخة الاحتياطية
      const { data: backup, error: backupError } = await supabase
        .from('video_backups')
        .insert({
          video_quality_id: videoQualityId,
          backup_server_id: backupServerId,
          backup_path: backupPath,
          backup_size_bytes: videoQuality.file_size_bytes,
          checksum: checksum,
          backup_type: backupType,
          is_verified: false
        })
        .select()
        .single();

      if (backupError) throw backupError;

      // جدولة التحقق من النسخة الاحتياطية
      await this.scheduleBackupVerification(backup.id);

      // تسجيل النشاط
      await this.logBackupActivity(videoQualityId, 'backup_created', {
        backup_id: backup.id,
        server_name: backupServer.name,
        backup_type: backupType
      });

      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error}`);
    }
  }

  // التحقق من سلامة النسخة الاحتياطية
  static async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const { data: backup, error } = await supabase
        .from('video_backups')
        .select('*, video_qualities(*)')
        .eq('id', backupId)
        .single();

      if (error || !backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      // التحقق من وجود الملف
      const fileExists = await this.checkFileExists(backup.backup_path);
      if (!fileExists) {
        await this.markBackupAsFailed(backupId, 'الملف غير موجود');
        return false;
      }

      // التحقق من checksum
      const currentChecksum = await this.calculateFileChecksum(backup.backup_path);
      if (currentChecksum !== backup.checksum) {
        await this.markBackupAsFailed(backupId, 'checksum غير متطابق');
        return false;
      }

      // التحقق من حجم الملف
      const fileSize = await this.getFileSize(backup.backup_path);
      if (fileSize !== backup.backup_size_bytes) {
        await this.markBackupAsFailed(backupId, 'حجم الملف غير متطابق');
        return false;
      }

      // تحديث حالة التحقق
      await supabase
        .from('video_backups')
        .update({ is_verified: true })
        .eq('id', backupId);

      await this.logBackupActivity(backup.video_quality_id, 'backup_verified', {
        backup_id: backupId
      });

      return true;
    } catch (error) {
      console.error('Error verifying backup:', error);
      await this.markBackupAsFailed(backupId, `خطأ في التحقق: ${error}`);
      return false;
    }
  }

  // استعادة فيديو من النسخة الاحتياطية
  static async restoreFromBackup(
    backupId: string,
    targetServerId: string
  ): Promise<void> {
    try {
      const { data: backup, error } = await supabase
        .from('video_backups')
        .select('*, video_qualities(*), internal_servers(*)')
        .eq('id', backupId)
        .single();

      if (error || !backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      if (!backup.is_verified) {
        throw new Error('النسخة الاحتياطية غير محققة');
      }

      // الحصول على السيرفر المستهدف
      const { data: targetServer, error: serverError } = await supabase
        .from('internal_servers')
        .select('*')
        .eq('id', targetServerId)
        .single();

      if (serverError || !targetServer) {
        throw new Error('السيرفر المستهدف غير متوفر');
      }

      // إنشاء مسار الاستعادة
      const restorePath = this.generateRestorePath(
        targetServer.storage_path,
        backup.video_qualities.video_file_id,
        backup.video_qualities.quality
      );

      // نسخ الملف من النسخة الاحتياطية
      await this.copyFileFromBackup(
        backup.backup_path,
        restorePath,
        targetServer
      );

      // تحديث مسار الفيديو الأصلي
      await supabase
        .from('video_qualities')
        .update({
          file_path: restorePath,
          server_id: targetServerId,
          is_ready: true
        })
        .eq('id', backup.video_quality_id);

      await this.logBackupActivity(backup.video_quality_id, 'backup_restored', {
        backup_id: backupId,
        target_server: targetServer.name
      });

    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error(`فشل في الاستعادة من النسخة الاحتياطية: ${error}`);
    }
  }

  // إدارة السياسات الآلية للنسخ الاحتياطي
  static async createBackupPolicy(policy: Omit<BackupPolicy, 'id'>): Promise<BackupPolicy> {
    try {
      const { data, error } = await supabase
        .from('backup_policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating backup policy:', error);
      throw new Error('فشل في إنشاء سياسة النسخ الاحتياطي');
    }
  }

  // تنفيذ السياسات الآلية
  static async executeBackupPolicies(): Promise<void> {
    try {
      // الحصول على السياسات النشطة
      const { data: policies, error } = await supabase
        .from('backup_policies')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      for (const policy of policies || []) {
        await this.executeSinglePolicy(policy);
      }
    } catch (error) {
      console.error('Error executing backup policies:', error);
    }
  }

  // تنفيذ سياسة واحدة
  private static async executeSinglePolicy(policy: BackupPolicy): Promise<void> {
    try {
      // العثور على الفيديوهات التي تحتاج نسخ احتياطية
      const query = supabase
        .from('video_qualities')
        .select('*, video_backups(count)')
        .eq('is_ready', true);

      // تطبيق فلاتر الجودة
      if (policy.quality_filter.length > 0) {
        query.in('quality', policy.quality_filter);
      }

      const { data: videoQualities, error } = await query;
      if (error) throw error;

      for (const videoQuality of videoQualities || []) {
        const currentBackups = videoQuality.video_backups?.[0]?.count || 0;
        
        // إنشاء نسخ احتياطية إضافية إذا لزم الأمر
        if (currentBackups < policy.min_backup_copies) {
          const neededBackups = policy.min_backup_copies - currentBackups;
          
          for (let i = 0; i < neededBackups; i++) {
            const availableServer = await this.selectBackupServer(
              policy.backup_servers,
              videoQuality.id
            );
            
            if (availableServer) {
              await this.createBackup(videoQuality.id, availableServer, 'auto');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error executing policy:', policy.name, error);
    }
  }

  // اختيار أفضل سيرفر للنسخ الاحتياطي
  private static async selectBackupServer(
    allowedServers: string[],
    excludeVideoQualityId: string
  ): Promise<string | null> {
    try {
      const { data: servers, error } = await supabase
        .from('internal_servers')
        .select('*, video_backups(count)')
        .in('id', allowedServers)
        .eq('is_active', true)
        .order('used_storage_gb');

      if (error || !servers) return null;

      // العثور على السيرفر الذي لا يحتوي على نسخة احتياطية لهذا الفيديو
      for (const server of servers) {
        const { data: existingBackup } = await supabase
          .from('video_backups')
          .select('id')
          .eq('backup_server_id', server.id)
          .eq('video_quality_id', excludeVideoQualityId)
          .limit(1);

        if (!existingBackup || existingBackup.length === 0) {
          return server.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error selecting backup server:', error);
      return null;
    }
  }

  // تنظيف النسخ الاحتياطية القديمة
  static async cleanupOldBackups(retentionDays: number = this.DEFAULT_RETENTION_DAYS): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // العثور على النسخ الاحتياطية القديمة
      const { data: oldBackups, error } = await supabase
        .from('video_backups')
        .select('*')
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      for (const backup of oldBackups || []) {
        // التأكد من وجود نسخ احتياطية أخرى حديثة
        const { data: recentBackups } = await supabase
          .from('video_backups')
          .select('id')
          .eq('video_quality_id', backup.video_quality_id)
          .gte('created_at', cutoffDate.toISOString())
          .limit(this.MIN_BACKUP_COPIES);

        if (recentBackups && recentBackups.length >= this.MIN_BACKUP_COPIES) {
          await this.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // حذف نسخة احتياطية
  static async deleteBackup(backupId: string): Promise<void> {
    try {
      const { data: backup, error: fetchError } = await supabase
        .from('video_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (fetchError || !backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      // حذف الملف الفعلي
      await this.deleteBackupFile(backup.backup_path);

      // حذف السجل من قاعدة البيانات
      const { error: deleteError } = await supabase
        .from('video_backups')
        .delete()
        .eq('id', backupId);

      if (deleteError) throw deleteError;

      await this.logBackupActivity(backup.video_quality_id, 'backup_deleted', {
        backup_id: backupId
      });
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw new Error(`فشل في حذف النسخة الاحتياطية: ${error}`);
    }
  }

  // الحصول على إحصائيات النسخ الاحتياطية
  static async getBackupStats(videoFileId?: string): Promise<BackupStats> {
    try {
      let query = supabase.from('video_backups').select('*, video_qualities(video_file_id)');
      
      if (videoFileId) {
        query = query.eq('video_qualities.video_file_id', videoFileId);
      }

      const { data: backups, error } = await query;
      if (error) throw error;

      const totalBackups = backups?.length || 0;
      const verifiedBackups = backups?.filter(b => b.is_verified).length || 0;
      const failedBackups = totalBackups - verifiedBackups;
      const totalSizeBytes = backups?.reduce((sum, b) => sum + b.backup_size_bytes, 0) || 0;
      
      const lastBackup = backups?.reduce((latest, backup) => {
        return new Date(backup.created_at) > new Date(latest.created_at) ? backup : latest;
      });

      // حساب مستوى التكرار (متوسط عدد النسخ لكل فيديو)
      const videoQualityIds = [...new Set(backups?.map(b => b.video_quality_id))];
      const redundancyLevel = videoQualityIds.length > 0 ? totalBackups / videoQualityIds.length : 0;

      return {
        total_backups: totalBackups,
        verified_backups: verifiedBackups,
        failed_backups: failedBackups,
        total_size_bytes: totalSizeBytes,
        last_backup_time: lastBackup?.created_at || '',
        redundancy_level: redundancyLevel
      };
    } catch (error) {
      console.error('Error getting backup stats:', error);
      throw new Error('فشل في الحصول على إحصائيات النسخ الاحتياطية');
    }
  }

  // وظائف مساعدة خاصة
  private static generateBackupPath(
    serverStoragePath: string,
    videoFileId: string,
    quality: string
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${serverStoragePath}/backups/${videoFileId}/${quality}_backup_${timestamp}.mp4`;
  }

  private static generateRestorePath(
    serverStoragePath: string,
    videoFileId: string,
    quality: string
  ): string {
    return `${serverStoragePath}/restored/${videoFileId}/${quality}.mp4`;
  }

  private static async copyFileToBackupServer(
    sourcePath: string,
    backupPath: string,
    backupServer: any
  ): Promise<void> {
    // في التطبيق الحقيقي، هذا سينسخ الملف فعلياً
    console.log(`Copying ${sourcePath} to ${backupPath} on server ${backupServer.name}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة
  }

  private static async copyFileFromBackup(
    backupPath: string,
    restorePath: string,
    targetServer: any
  ): Promise<void> {
    // في التطبيق الحقيقي، هذا سينسخ الملف من النسخة الاحتياطية
    console.log(`Restoring ${backupPath} to ${restorePath} on server ${targetServer.name}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة
  }

  private static async calculateFileChecksum(filePath: string): Promise<string> {
    // في التطبيق الحقيقي، هذا سيحسب checksum للملف
    return 'sha256_' + Math.random().toString(36).substr(2, 9);
  }

  private static async checkFileExists(filePath: string): Promise<boolean> {
    // في التطبيق الحقيقي، هذا سيتحقق من وجود الملف
    return true; // محاكاة
  }

  private static async getFileSize(filePath: string): Promise<number> {
    // في التطبيق الحقيقي، هذا سيحصل على حجم الملف
    return Math.floor(Math.random() * 1000000000); // محاكاة
  }

  private static async deleteBackupFile(backupPath: string): Promise<void> {
    // في التطبيق الحقيقي، هذا سيحذف الملف الاحتياطي
    console.log(`Deleting backup file: ${backupPath}`);
  }

  private static async markBackupAsFailed(backupId: string, reason: string): Promise<void> {
    await supabase
      .from('video_backups')
      .update({ 
        is_verified: false,
        // يمكن إضافة حقل error_message إلى الجدول
      })
      .eq('id', backupId);
  }

  private static async scheduleBackupVerification(backupId: string): Promise<void> {
    // في التطبيق الحقيقي، هذا سيجدول مهمة التحقق
    setTimeout(async () => {
      await this.verifyBackup(backupId);
    }, this.VERIFICATION_INTERVAL);
  }

  private static async logBackupActivity(
    videoQualityId: string,
    activityType: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('video_activity_log')
        .insert({
          video_file_id: videoQualityId,
          activity_type: activityType,
          details: details
        });
    } catch (error) {
      console.error('Error logging backup activity:', error);
    }
  }

  // تشغيل النظام الآلي للنسخ الاحتياطية
  static startAutomaticBackupSystem(): void {
    // تنفيذ السياسات كل ساعة
    setInterval(async () => {
      await this.executeBackupPolicies();
    }, 60 * 60 * 1000);

    // تنظيف النسخ القديمة كل يوم
    setInterval(async () => {
      await this.cleanupOldBackups();
    }, 24 * 60 * 60 * 1000);

    console.log('Automatic backup system started');
  }
}
