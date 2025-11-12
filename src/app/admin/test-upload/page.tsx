
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { uploadFile } from '@/firebase/storage';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function TestUploadPage() {
    const { storage } = useFirebase();
    const { toast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ url: string; path: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
            return;
        }
        if (!storage) {
            setError("Firebase Storage service is not available. Check FirebaseProvider initialization.");
            return;
        }

        setIsLoading(true);
        setUploadResult(null);
        setError(null);

        const filePath = `test-uploads/${Date.now()}-${file.name}`;

        try {
            const downloadURL = await uploadFile(storage, file, filePath);
            setUploadResult({ url: downloadURL, path: filePath });
            toast({ title: 'Success', description: 'File uploaded successfully.' });
        } catch (err: any) {
            console.error("Original upload error:", err);
            const errorMessage = `Code: ${err.code}\nMessage: ${err.message}`;
            setError(errorMessage);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'See error details on the page.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader
                title="Test File Upload"
                description="Use this page to troubleshoot file uploads to Firebase Storage."
            />
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Storage Upload Test</CardTitle>
                    <CardDescription>Select a file and click upload. The result will be displayed below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input id="file-upload" type="file" onChange={handleFileChange} className="max-w-sm" />
                    {file && <p className="text-sm text-muted-foreground">Selected file: {file.name} ({Math.round(file.size / 1024)} KB)</p>}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleUpload} disabled={!file || isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Upload File
                    </Button>
                </CardFooter>
            </Card>

            {uploadResult && (
                <Card className="mt-6 border-green-500 bg-green-50/50 dark:bg-green-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle /> Upload Successful
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>
                            <span className="font-semibold">File URL:</span>
                            <Link href={uploadResult.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline break-all">
                                {uploadResult.url}
                            </Link>
                        </p>
                        <p><span className="font-semibold">Storage Path:</span> <span className="ml-2 font-mono bg-muted p-1 rounded-sm">{uploadResult.path}</span></p>
                    </CardContent>
                </Card>
            )}

            {error && (
                 <Card className="mt-6 border-destructive bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <XCircle /> Upload Failed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p className="font-semibold">Firebase Storage Error Details:</p>
                        <pre className="font-mono bg-muted p-2 rounded-md whitespace-pre-wrap">{error}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
