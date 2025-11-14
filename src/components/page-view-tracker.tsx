'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Function to get or create a session ID
const getSessionId = () => {
    if (typeof window === 'undefined') return '';
    let sessionId = sessionStorage.getItem('lucianvotes_session_id');
    if (!sessionId) {
        sessionId = uuidv4();
        sessionStorage.setItem('lucianvotes_session_id', sessionId);
    }
    return sessionId;
}

export function PageViewTracker() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const pathname = usePathname();

    useEffect(() => {
        if (!firestore || !pathname) return;
        
        // Exclude admin pages from being tracked
        if (pathname.startsWith('/admin')) {
            return;
        }

        const logPageView = async () => {
            try {
                let locationData: { ipAddress?: string; city?: string; country?: string } = {};
                try {
                    const response = await fetch('https://ipapi.co/json/');
                    if (response.ok) {
                        const data = await response.json();
                        locationData = {
                            ipAddress: data.ip,
                            city: data.city,
                            country: data.country_name,
                        };
                    }
                } catch(e) {
                    console.warn("Could not fetch location data for page view", e);
                }

                const pageViewData = {
                    sessionId: getSessionId(),
                    userId: user?.uid || null,
                    path: pathname,
                    timestamp: serverTimestamp(),
                    ...locationData,
                };
                
                await addDoc(collection(firestore, 'page_views'), pageViewData);

            } catch (error) {
                console.error("Error logging page view:", error);
            }
        };

        logPageView();

    }, [firestore, pathname, user]);

    return null; // This component does not render anything
}
