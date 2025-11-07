'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SMSContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  lastMessageId: string | null;
}

const SMSContext = createContext<SMSContextType | undefined>(undefined);

export function SMSProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const refreshUnreadCount = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/unread-count/', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const newCount = data.unread_count || 0;
        const latestId = data.latest_message_id || null;
        
        // Check if there's a new message
        if (latestId && latestId !== lastMessageId && lastMessageId !== null) {
          // New message detected! Trigger notification
          window.dispatchEvent(new CustomEvent('newSMSArrived', { 
            detail: { unreadCount: newCount, messageId: latestId }
          }));
        }
        
        setUnreadCount(newCount);
        setLastMessageId(latestId);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    // Initial load
    refreshUnreadCount();
    
    // Poll every 5 seconds
    const interval = setInterval(refreshUnreadCount, 5000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array! lastMessageId change should NOT restart interval

  // Listen for manual refresh events (when messages are marked as read)
  useEffect(() => {
    const handleSmsMarkedRead = () => {
      refreshUnreadCount();
    };
    
    window.addEventListener('smsMarkedRead', handleSmsMarkedRead);
    
    return () => {
      window.removeEventListener('smsMarkedRead', handleSmsMarkedRead);
    };
  }, []);

  return (
    <SMSContext.Provider value={{ unreadCount, refreshUnreadCount, lastMessageId }}>
      {children}
    </SMSContext.Provider>
  );
}

export function useSMS() {
  const context = useContext(SMSContext);
  if (!context) {
    throw new Error('useSMS must be used within SMSProvider');
  }
  return context;
}

