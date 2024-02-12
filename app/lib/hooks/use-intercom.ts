// @ts-nocheck
import { useEffect } from 'react';

type UserType = {
  name: string | null;
  //   id: string;
  email: string;
  //   createdAt: number;
};

const APP_ID = 'ralcjpft';

export function useIntercom(user: UserType) {
  useEffect(() => {
    window.intercomSettings = {
      api_base: 'https://api-iam.intercom.io',
      app_id: APP_ID,
      name: user.name,
      //   user_id: user.id,
      email: user.email,
      //   created_at: user.createdAt,
    };

    // Inject Intercom script
    // Copy/paste from https://app.intercom.com/a/apps/ralcjpft/settings/installation?installationType=web
    // We pre-filled your app ID in the widget URL: 'https://widget.intercom.io/widget/ralcjpft'
    (function () {
      const w = window;
      const ic = w.Intercom;
      if (typeof ic === 'function') {
        ic('reattach_activator');
        ic('update', w.intercomSettings);
      } else {
        const d = document;
        const i = function () {
          // eslint-disable-next-line prefer-rest-params
          i.c(arguments);
        };
        i.q = [];
        i.c = function (args) {
          i.q.push(args);
        };
        w.Intercom = i;
        const l = function () {
          const s = d.createElement('script');
          s.type = 'text/javascript';
          s.async = true;
          s.src = 'https://widget.intercom.io/widget/ralcjpft';
          const x = d.getElementsByTagName('script')[0];
          x.parentNode.insertBefore(s, x);
        };
        if (document.readyState === 'complete') {
          l();
        } else if (w.attachEvent) {
          w.attachEvent('onload', l);
        } else {
          w.addEventListener('load', l, false);
        }
      }
    })();
  }, [user]); // Re-run the effect if the user object changes
}
