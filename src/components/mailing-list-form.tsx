
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { subscribeToMailingList } from '@/lib/actions';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const mailingListSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('A valid email is required'),
});

export function MailingListForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof mailingListSchema>>({
    resolver: zodResolver(mailingListSchema),
    defaultValues: {
      firstName: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof mailingListSchema>) {
    setIsLoading(true);
    const result = await subscribeToMailingList(values);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: result.error,
      });
    } else {
      toast({
        title: 'Subscription Successful!',
        description: "You've been added to the mailing list.",
      });
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem className="w-full sm:w-1/3">
              <FormControl>
                <Input placeholder="First Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="w-full sm:w-1/3">
              <FormControl>
                <Input type="email" placeholder="Email Address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Subscribe
        </Button>
      </form>
    </Form>
  );
}
