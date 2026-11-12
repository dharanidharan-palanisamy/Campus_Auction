'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_SERVER_URL } from '@/lib/api';

export interface AdminEventNotification {
  id: string;
  type: 'LISTING_CREATED' | 'BID_PLACED' | 'STUDENT_REGISTERED' | 'STUDENT_STATUS' | 'LISTING_MODERATED';
  title: string;
  message: string;
  timestamp: Date;
  meta?: any;
}


// Global singleton socket to prevent duplicate connections across AdminLayout & Admin pages
let sharedSocket: Socket | null = null;
let activeSubscribers = 0;

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_SERVER_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Use HTTP polling first, then upgrade seamlessly to WebSocket.
      // This prevents "Firefox can't establish connection to ws://..." interruptions.
      transports: ['polling', 'websocket'],
      autoConnect: true,
      withCredentials: true,
    });
  }
  return sharedSocket;
}

export function useAdminSocket(onEventReceived?: (event: AdminEventNotification) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AdminEventNotification[]>([]);
  const onEventReceivedRef = useRef(onEventReceived);

  useEffect(() => {
    onEventReceivedRef.current = onEventReceived;
  }, [onEventReceived]);

  const addNotification = useCallback((notif: Omit<AdminEventNotification, 'id' | 'timestamp'> & { meta?: any }) => {
    const newNotif: AdminEventNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      ...notif
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);

    if (onEventReceivedRef.current) {
      onEventReceivedRef.current(newNotif);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socket = getSharedSocket();
    activeSubscribers++;

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join_admin');
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_admin');
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = () => {
      setIsConnected(false);
    };

    // 1. New student registered in client panel
    const onStudentRegistered = (payload: any) => {
      const student = payload?.student || {};
      addNotification({
        type: 'STUDENT_REGISTERED',
        title: 'New Student Registered',
        message: `${student.fullName || student.campusAlias || 'A new student'} (${student.studentId || student.email}) registered and needs verification.`,
        meta: student
      });
    };

    // 2. New listing created in client panel
    const onListingCreated = (payload: any) => {
      const listing = payload?.listing || {};
      const priceFormatted = listing.startingPriceInCents 
        ? `₹${(listing.startingPriceInCents / 100).toFixed(0)}` 
        : '';
      addNotification({
        type: 'LISTING_CREATED',
        title: 'New Listing Created',
        message: `"${listing.title || 'Untitled Listing'}" listed ${priceFormatted ? `starting at ${priceFormatted}` : ''} by ${listing.seller?.campusAlias || 'Student'}.`,
        meta: listing
      });
    };

    // 3. New bid placed in client panel
    const onBidPlaced = (payload: any) => {
      const bid = payload?.bid || {};
      const amount = bid.amountInCents 
        ? `₹${(bid.amountInCents / 100).toFixed(0)}` 
        : '';
      addNotification({
        type: 'BID_PLACED',
        title: 'New Auction Bid',
        message: `${bid.bidderAlias || 'Bidder'} placed a leading bid of ${amount} on "${payload.listingTitle || 'Auction Listing'}".`,
        meta: payload
      });
    };

    // 4. Student status changed
    const onStudentStatusChanged = (payload: any) => {
      addNotification({
        type: 'STUDENT_STATUS',
        title: 'Student Status Updated',
        message: `Verification or access status updated for student ${payload?.studentId}.`,
        meta: payload
      });
    };

    // 5. Listing moderated
    const onListingModerated = (payload: any) => {
      addNotification({
        type: 'LISTING_MODERATED',
        title: 'Listing Moderated',
        message: `Listing ${payload?.listingId} status set to ${payload?.status}.`,
        meta: payload
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('admin:student:registered', onStudentRegistered);
    socket.on('admin:listing:created', onListingCreated);
    socket.on('admin:bid:placed', onBidPlaced);
    socket.on('admin:student:status-changed', onStudentStatusChanged);
    socket.on('admin:listing:moderated', onListingModerated);

    return () => {
      activeSubscribers--;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('admin:student:registered', onStudentRegistered);
      socket.off('admin:listing:created', onListingCreated);
      socket.off('admin:bid:placed', onBidPlaced);
      socket.off('admin:student:status-changed', onStudentStatusChanged);
      socket.off('admin:listing:moderated', onListingModerated);

      if (activeSubscribers <= 0) {
        activeSubscribers = 0;
        if (socket.connected) {
          socket.emit('leave_admin');
        }
      }
    };
  }, [addNotification]);

  return {
    isConnected,
    notifications,
    dismissNotification,
    socket: sharedSocket
  };
}
