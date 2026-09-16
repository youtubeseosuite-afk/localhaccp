'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { analyzeStandard } from './actions';
import * as pdfjs from 'pdfjs-dist';

// Konfigurer PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Funktion til at udtrække tekst fra PDF i browseren
  async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  }

  async function handleUpload() {
    if (!file || !name) return alert('Udfyld venligst navn og vælg en fil');
    
    setLoading(true);

    try {
      // 1. Udtræk tekst direkte i browseren (Lynhurtigt og stabilt)
      const extractedText = await extractTextFromPDF(file);

      // 2. Upload fil til Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: storageError } = await supabase.storage
        .from('standards')
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('standards')
        .getPublicUrl(fileName);

      // 3. Send TEKSTEN og URL til serveren (Ingen tunge filer længere!)
      const result = await analyzeStandard({ 
        name, 
        fileUrl: publicUrl, 
        text: extractedText 
      });

      if (result.error) throw new Error(result.error);

      setDone(true);
      setTimeout(() => router.push('/dashboard'), 3000);

    } catch (error: any) {
      console.error(error);
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
        
        <h1 className="text-2xl font-bold text-center mb-2">Upload Standard</h1>
        <p className="text-gray-500 text-center mb-8">Upload din PDF, så finder AI'en alle krav til dig.</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn på standard</label>
            <input 
              type="text" 
              placeholder="F.eks. IFS Food v8" 
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF Fil</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <FileText size={20} />
                  <span className="truncate">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="mx-auto mb-2" size={24} />
                  <span className="block">Klik for at vælge PDF</span>
                </div>
              )}
              <input 
                id="fileInput" 
                type="file" 
                accept=".pdf" 
                hidden 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
              />
            </div>
          </div>

          <button 
            disabled={loading}
            onClick={handleUpload}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Start AI Analyse'}
          </button>

          {done && (
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium animate-bounce">
              <CheckCircle size={20} />
              Krav udtrukket med succes!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
