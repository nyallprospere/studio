'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MailingListForm } from './mailing-list-form';
import { Mail } from 'lucide-react';

export function MailingListPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkAndShowPopup = () => {
      const hasSubscribed = localStorage.getItem('hasSubscribedToMailingList') === 'true';
      if (hasSubscribed) {
        return;
      }

      let visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
      visitCount++;
      localStorage.setItem('visitCount', visitCount.toString());

      let delay = -1;
      if (visitCount === 1) {
        delay = 10000; // 10 seconds
      } else if (visitCount === 2) {
        delay = 20000; // 20 seconds
      } else if (visitCount === 10) {
        delay = 5000; // 5 seconds on the 10th visit
      }

      if (delay > 0) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, delay);
        return () => clearTimeout(timer);
      }
    };

    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      checkAndShowPopup();
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };
  
  const handleSuccess = () => {
    localStorage.setItem('hasSubscribedToMailingList', 'true');
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center font-headline text-2xl">Join Our Mailing List</DialogTitle>
          <DialogDescription className="text-center">
            Get the latest election news, analysis, and exclusive content delivered directly to your inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <MailingListForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
