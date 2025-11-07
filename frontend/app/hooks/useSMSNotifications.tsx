'use client';

import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconMessageCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export function useSMSNotifications() {
  const router = useRouter();
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request desktop notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setPermissionGranted(permission === 'granted');
      });
    } else if (Notification.permission === 'granted') {
      setPermissionGranted(true);
    }
  }, []);

  // Listen for new SMS events
  useEffect(() => {
    const handleNewSMS = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { unreadCount, messageId } = customEvent.detail;
      
      // Fetch message details
      const response = await fetch(`https://localhost:8000/api/sms/inbound/${messageId}/`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const message = await response.json();
        const patientName = message.patient 
          ? `${message.patient.first_name} ${message.patient.last_name}`
          : message.from_number;
        
        // Show in-app notification (Mantine toast)
        notifications.show({
          title: `New SMS from ${patientName}`,
          message: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
          color: 'blue',
          icon: <IconMessageCircle size={20} />,
          autoClose: 8000,
          onClick: () => {
            if (message.patient) {
              // Navigate to patient
              router.push(`/patients?type=patients&patientId=${message.patient.id}&openSMS=true`);
            }
          },
          style: { cursor: message.patient ? 'pointer' : 'default' },
        });
        
        // Show desktop notification
        if (permissionGranted && message.patient) {
          const notification = new Notification(`New SMS from ${patientName}`, {
            body: message.message.substring(0, 100),
            icon: '/favicon.ico', // Using favicon for now, can add sms-icon.png later
            tag: messageId,
          });
          
          notification.onclick = () => {
            window.focus();
            router.push(`/patients?type=patients&patientId=${message.patient.id}&openSMS=true`);
          };
        }
      }
    };

    window.addEventListener('newSMSArrived', handleNewSMS);
    
    return () => {
      window.removeEventListener('newSMSArrived', handleNewSMS);
    };
  }, [permissionGranted, router]);
}

