'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { analyzeStandard } from './actions';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpload() {
    if (!file || !name) return alert('Udfyld venligst navn og vælg en fil');
    
    setLoading(true);

    try {
      // 1. Upload til Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('standards')
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('standards')
        .getPublicUrl(fileName);

      // 2. Kald Server Action til AI Analyse
      const result = await analyzeStandard({ 
        name, 
        fileUrl: publicUrl, 
        fileBlob: file 
      });

      if (result.error) throw new Error(result.error);

      setDone(true);
      setTimeout(() => router.push('/dashboard'), 3000);

    } catch (error: any) {
      alert(`Fejl: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
            <Upload size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl
