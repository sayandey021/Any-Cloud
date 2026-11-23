import React from 'react';
import { cn, formatBytes } from '../../lib/utils';
import { StorageSummary } from '../../types/cloud';

const PROVIDER_COLORS: Record<string, string> = {
  gdrive: 'bg-blue-500',
  drive: 'bg-blue-500',
  onedrive: 'bg-sky-500',
  s3: 'bg-amber-500',
  dropbox: 'bg-indigo-500',
  box: 'bg-cyan-500',
  webdav: 'bg-emerald-500',
  local: 'bg-violet-500',
  alibabacloud: 'bg-orange-500',
  alibaba: 'bg-orange-500',
  cloudinary: 'bg-indigo-600',
  googlephotos: 'bg-rose-500',
  huaweidrive: 'bg-red-600',
  iclouddrive: 'bg-blue-600',
  kdrive: 'bg-teal-500',
  koofr: 'bg-red-500',
  linkbox: 'bg-purple-500',
  mailru: 'bg-blue-600',
  pcloud: 'bg-cyan-600',
  pikpak: 'bg-blue-500',
  mega: 'bg-red-600',
  protondrive: 'bg-purple-600',
  qingstor: 'bg-teal-400',
  zohoworkdrive: 'bg-emerald-600',
};

export const StorageBar: React.FC<{ summary: StorageSummary }> = ({ summary }) => {
  return (
    <div className="space-y-3">
      {/* Visual Multi-Segment Bar */}
      <div className="w-full h-3.5 bg-muted rounded-full overflow-hidden flex shadow-inner">
        {summary.clouds.map((cloud) => {
          if (!summary.total_bytes || cloud.quota_used <= 0) return null;
          const sharePct = (cloud.quota_used / summary.total_bytes) * 100;
          if (sharePct < 0.5) return null;

          const color = PROVIDER_COLORS[cloud.provider.toLowerCase()] || 'bg-primary';

          return (
            <div
              key={cloud.account_id}
              style={{ width: `${sharePct}%` }}
              title={`${cloud.account_name}: ${formatBytes(cloud.quota_used)}`}
              className={cn(color, 'h-full transition-all duration-300 first:rounded-l-full')}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {summary.clouds.map((cloud) => {
          const color = PROVIDER_COLORS[cloud.provider.toLowerCase()] || 'bg-primary';
          return (
            <div key={cloud.account_id} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', color)} />
              <span className="font-medium text-foreground">{cloud.account_name}:</span>
              <span>{formatBytes(cloud.quota_used)}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
          <span>Free: {formatBytes(summary.free_bytes)}</span>
        </div>
      </div>
    </div>
  );
};
