'use client';
import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

export default function Datetime({
  dateTime,
  className,
}: {
  dateTime: Date;
  className?: string;
}) {
  const [showRelative, setShowRelative] = useState(true);
  const dt = dayjs(dateTime);
  const relative = dt.fromNow();
  const absolute = dt.format('M/D/YY H:ma');
  return (
    <time
      onClick={() => setShowRelative(!showRelative)}
      dateTime={absolute}
      className={className}
    >
      {showRelative ? relative : absolute}
    </time>
  );
}
