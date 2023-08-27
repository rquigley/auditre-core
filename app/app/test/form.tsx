'use client';

import { headers, cookies } from 'next/headers';
//import { run } from '@/bin/db-reset';
import { useState } from 'react';

export default function Form({
  setupDemo,
}: {
  setupDemo: () => Promise<void>;
}) {
  const [cookieIsSet, setCookieIsSet] = useState(false);
  const [demoIsSet, setDemoIsSet] = useState(false);

  return (
    <div>
      <form
        className="bg-white shadow sm:rounded-lg p-3 m-5"
        action={async () => {
          setCookieIsSet(true);
        }}
      >
        {cookieIsSet && <p>Cookie has been set</p>}
        <button type="submit" className="hover:text-green-500">
          Add to Cart
        </button>
      </form>

      <form
        className="bg-white shadow sm:rounded-lg  p-3 m-5"
        action={async () => {
          await setupDemo();
          setDemoIsSet(true);
        }}
      >
        {demoIsSet && <p>Demo has been set up</p>}
        <button type="submit" className="hover:text-green-500">
          Setup a demo
        </button>
      </form>
    </div>
  );
}
