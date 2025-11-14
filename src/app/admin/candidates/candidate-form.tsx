
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import type { Candidate, Party, Constituency } from '@/lib/types';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const candidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  partyId: z.string().min(1, "Party is required"),
  constituencyId: z.string().min(1, "Constituency is required"),
  bio: z.string().optional(),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  photoFile: z.any().optional(),
  customLogoFile: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  customLogoUrl: z.string().url().optional().or(z.literal('')),
  removePhoto: z.boolean().default(false),
  isIncumbent: z.boolean().default(false),
  isPartyLeader: z.boolean().default(false),
  isDeputyLeader: z.boolean().default(false),
  partyLevel: z.enum(['higher', 'lower']).default('lower'),
  isIndependentCastriesNorth: z.boolean().default(false),
  isIndependentCastriesCentral: z.boolean().default(false),
}).refine(data => {
    return !!data.photoFile || !!data.imageUrl || data.removePhoto;
}, {
    message: "A photo is required. Please upload a file or provide a URL.",
    path: ["photoFile"],
}).refine(data => {
    if (data.removePhoto) return true;
    return !!data.photoFile || !!data.imageUrl;
}, {
    message: "A photo is required. Please upload a file or provide a URL.",
    path: ["photoFile"],
});


type CandidateFormProps = {
  onSubmit: (data: z.infer<typeof candidateSchema>) => void;
  initialData?: Candidate | null;
  onCancel: () => void;
  parties: Party[];
  constituencies: Constituency[];
};

export function CandidateForm({ onSubmit, initialData, onCancel, parties, constituencies }: CandidateFormProps) {
  const [isPartyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [isConstituencyPopoverOpen, setConstituencyPopoverOpen] = useState(false);
    
  const form = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      partyId: '',
      constituencyId: '',
      bio: '',
      facebookUrl: '',
      instagramUrl: '',
      imageUrl: '',
      customLogoUrl: '',
      removePhoto: false,
      isIncumbent: false,
      isPartyLeader: false,
      isDeputyLeader: false,
      partyLevel: 'lower',
      isIndependentCastriesNorth: false,
      isIndependentCastriesCentral: false,
    },
  });

  const isIndependent = form.watch('isIndependentCastriesNorth') || form.watch('isIndependentCastriesCentral');

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        facebookUrl: initialData.facebookUrl || '',
        instagramUrl: initialData.instagramUrl || '',
        isIncumbent: initialData.isIncumbent ?? false,
        isPartyLeader: initialData.isPartyLeader ?? false,
        isDeputyLeader: initialData.isDeputyLeader ?? false,
        partyLevel: initialData.partyLevel ?? 'lower',
        isIndependentCastriesNorth: initialData.isIndependentCastriesNorth ?? false,
        isIndependentCastriesCentral: initialData.isIndependentCastriesCentral ?? false,
        customLogoUrl: initialData.customLogoUrl ?? '',
        removePhoto: false,
      });
    } else {
        form.reset({
          firstName: '',
          lastName: '',
          partyId: '',
          constituencyId: '',
          bio: '',
          facebookUrl: '',
          instagramUrl: '',
          imageUrl: '',
          customLogoUrl: '',
          removePhoto: false,
          isIncumbent: false,
          isPartyLeader: false,
          isDeputyLeader: false,
          partyLevel: 'lower',
          isIndependentCastriesNorth: false,
          isIndependentCastriesCentral: false,
        });
    }
  }, [initialData, form]);

  const handleFormSubmit = (values: z.infer<typeof candidateSchema>) => {
    onSubmit(values);
  };

  const handleRemovePhoto = () => {
    form.setValue('imageUrl', '');
    form.setValue('removePhoto', true);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Philip" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., J. Pierre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partyId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Political Party</FormLabel>
                <Popover open={isPartyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? parties.find(
                              (party) => party.id === field.value
                            )?.name
                          : "Select a party"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <ScrollArea className="h-64">
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            setPartyPopoverOpen(false);
                        }}
                        value={field.value}
                        className="p-4"
                      >
                        {parties.map(party => (
                          <FormItem className="flex items-center space-x-3 space-y-0" key={party.id}>
                            <FormControl>
                              <RadioGroupItem value={party.id} />
                            </FormControl>
                            <FormLabel className="font-normal w-full cursor-pointer">
                              {party.name} ({party.acronym})
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="constituencyId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Constituency</FormLabel>
                 <Popover open={isConstituencyPopoverOpen} onOpenChange={setConstituencyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? constituencies.find(
                              (c) => c.id === field.value
                            )?.name
                          : "Select a constituency"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <ScrollArea className="h-64">
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            setConstituencyPopoverOpen(false);
                        }}
                        value={field.value}
                        className="p-4"
                      >
                        {constituencies.map(c => (
                          <FormItem className="flex items-center space-x-3 space-y-0" key={c.id}>
                            <FormControl>
                              <RadioGroupItem value={c.id} />
                            </FormControl>
                            <FormLabel className="font-normal w-full cursor-pointer">
                              {c.name}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meet the Candidate</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief biography of the candidate..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="facebookUrl"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Facebook Page URL</FormLabel>
                <FormControl>
                    <Input type="url" placeholder="https://www.facebook.com/..." {...field} />
                </FormControl>
                <FormDescription>The candidate's official Facebook page.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="instagramUrl"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Instagram Page URL</FormLabel>
                <FormControl>
                    <Input type="url" placeholder="https://www.instagram.com/..." {...field} />
                </FormControl>
                <FormDescription>The candidate's official Instagram page.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="photoFile"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Candidate Photo</FormLabel>
                <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                </FormControl>
                <FormDescription>Upload a PNG or JPG file. A square image works best.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Or Image URL</FormLabel>
                  <FormControl>
                      <Input type="url" placeholder="https://example.com/photo.jpg" {...field} />
                  </FormControl>
                  <FormDescription>Provide a direct URL to an image.</FormDescription>
                   {initialData?.imageUrl && !form.getValues('removePhoto') && (
                    <div className="flex items-center gap-2 mt-2">
                      <a href={initialData.imageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current photo</a>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemovePhoto}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
            )}
          />
          {isIndependent && (
               <FormField
                  control={form.control}
                  name="customLogoFile"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Custom Party Logo</FormLabel>
                      <FormControl>
                          <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                      </FormControl>
                      <FormDescription>Upload a logo for this independent candidate.</FormDescription>
                      {initialData?.customLogoUrl && <a href={initialData.customLogoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current logo</a>}
                      <FormMessage />
                      </FormItem>
                  )}
              />
          )}
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="isIncumbent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Incumbent
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isPartyLeader"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Party Leader
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isDeputyLeader"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Deputy Leader
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isIndependentCastriesNorth"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    IND (CN)
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isIndependentCastriesCentral"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    IND (CC)
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="partyLevel"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Party Level</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex items-center space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="higher" />
                    </FormControl>
                    <FormLabel className="font-normal">Higher</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="lower" />
                    </FormControl>
                    <FormLabel className="font-normal">Lower</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Higher level candidates appear first in the list on the public candidates page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Candidate' : 'Add Candidate'}</Button>
        </div>
      </form>
    </Form>
  );
}
