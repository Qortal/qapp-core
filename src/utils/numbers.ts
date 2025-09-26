type ByteFormat = 'Decimal' | 'Binary';

export function formatBytes(
  bytes: number,
  decimals = 2,
  format: ByteFormat = 'Binary'
) {
  if (bytes === 0) return '0 Bytes';

  const k = format === 'Binary' ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = mins.toString().padStart(hrs > 0 ? 2 : 1, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  return hrs > 0
    ? `${hrs}:${paddedMins}:${paddedSecs}`
    : `${paddedMins}:${paddedSecs}`;
}
