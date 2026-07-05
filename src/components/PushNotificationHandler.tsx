import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getApiUrl } from '@/lib/api';

import { useSettings } from '@/context/SettingsContext';

function PushNotificationHandler() {
  const { notificationsEnabled } = useSettings();

  useEffect(() => {
    if (!notificationsEnabled) {
      console.log('Push notifications are disabled in settings.');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not supported on web.');
      return;
    }

    const initPush = async () => {
      // 1. Request Permission
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.error('User denied push permissions!');
        return;
      }

      // 2. Register
      await PushNotifications.register();
      
      // 3. Subscribe to topic via our server
      PushNotifications.addListener('registration', async (token) => {
        console.info('Registration token: ', token.value);
        
        try {
          await fetch(getApiUrl('/api/admin/subscribe-to-topic'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, topic: 'new_orders' })
          });
          console.log('Successfully subscribed to new_orders topic');
        } catch (err) {
          console.error('Error subscribing to topic:', err);
        }
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
      });
    };
    initPush();
  }, [notificationsEnabled]);
  return null;
}

export default PushNotificationHandler;
