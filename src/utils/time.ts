import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(relativeTime);
dayjs.extend(utc);

export function formatTimestamp(timestamp: number): string {
  const now = dayjs();
  const timestampDayJs = dayjs(timestamp);
  const elapsedTime = now.diff(timestampDayJs, "minute");

  if (elapsedTime < 1) {
    return `Just now - ${timestampDayJs.format("h:mm A")}`;
  } else if (elapsedTime < 60) {
    return `${elapsedTime}m ago - ${timestampDayJs.format("h:mm A")}`;
  } else if (elapsedTime < 1440) {
    return `${Math.floor(elapsedTime / 60)}h ago - ${timestampDayJs.format("h:mm A")}`;
  } else {
    return timestampDayJs.format("MMM D, YYYY - h:mm A");
  }
}


export function oneMonthAgo(){
    const oneMonthAgoTimestamp = dayjs().subtract(1, "month").valueOf();
    return oneMonthAgoTimestamp
}