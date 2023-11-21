'use client';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';

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
  const [initial, setInitial] = useState('');
  const dt = dayjs(dateTime);
  const absolute = dt.format('M/D/YY H:ma');

  useEffect(() => {
    if (dt.isBefore(dayjs().subtract(2, 'day'))) {
      setInitial(dt.format('M/D/YY'));
    } else {
      setInitial(dt.fromNow());
    }
  }, [dt]);

  return (
    <time
      onClick={() => setShowInitial(!showInitial)}
      dateTime={absolute}
      className={className}
      // suppressHydrationWarning={true}
    >
      {showInitial ? initial : absolute}
    </time>
  );
}
