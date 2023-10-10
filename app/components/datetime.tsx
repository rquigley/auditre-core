'use client';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';

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
