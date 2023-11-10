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
  const [showInitial, setShowInitial] = useState(true);
  const dt = dayjs(dateTime);
  let initial;
  if (dt.isBefore(dayjs().subtract(2, 'day'))) {
    initial = dt.format('M/D/YY');
  } else {
    initial = dt.fromNow();
  }

  const absolute = dt.format('M/D/YY H:ma');
  return (
    <time
      onClick={() => setShowInitial(!showInitial)}
      dateTime={absolute}
      className={className}
    >
      {showInitial ? initial : absolute}
    </time>
  );
}
