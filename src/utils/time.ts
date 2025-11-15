import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);

export function formatTimestamp(timestamp: number): string {
  const now = dayjs();
  const timestampDayJs = dayjs(timestamp);
  const elapsedTime = now.diff(timestampDayJs, 'minute');

  if (elapsedTime < 1) {
    return `Just now - ${timestampDayJs.format('h:mm A')}`;
  } else if (elapsedTime < 60) {
    return `${elapsedTime}m ago - ${timestampDayJs.format('h:mm A')}`;
  } else if (elapsedTime < 1440) {
    return `${Math.floor(elapsedTime / 60)}h ago - ${timestampDayJs.format(
      'h:mm A'
    )}`;
  } else {
    return timestampDayJs.format('MMM D, YYYY - h:mm A');
  }
}

export function oneMonthAgo() {
  const oneMonthAgoTimestamp = dayjs().subtract(1, 'month').valueOf();
  return oneMonthAgoTimestamp;
}

export function formatTime(seconds: number): string {
  seconds = Math.floor(seconds);
  const minutes: number | string = Math.floor(seconds / 60);
  let hours: number | string = Math.floor(minutes / 60);

  let remainingSeconds: number | string = seconds % 60;
  let remainingMinutes: number | string = minutes % 60;

  if (remainingSeconds < 10) {
    remainingSeconds = '0' + remainingSeconds;
  }

  if (remainingMinutes < 10) {
    remainingMinutes = '0' + remainingMinutes;
  }

  if (hours === 0) {
    hours = '';
  } else {
    hours = hours + ':';
  }

  return hours + remainingMinutes + ':' + remainingSeconds;
}
