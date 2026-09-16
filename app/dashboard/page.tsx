import { createClient } from '@/lib/supabase/server';
import RequirementRow from './components/RequirementRow';
import { CheckCircle, AlertCircle, FileText, Upload } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Hent alle krav og tilknyttede dokumenter
  const { data: requirements, error } = await supabase
    .from('requirements')
    .select(`
      *,
      requirement_documents(
        document_id,
        documents ( name, file_url )
      )
    `)
    .order('created_at', { ascending: true });

  if (error) return <div className="p-8 text-red-500">Fejl ved hentning af data: {error.message}</div>;

  // Beregn statistik
  const total = requirements?.length || 0;
  const completed = requirements?.filter(r => r.status === 'completed').length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Navigation */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Dashboard</h1>
            <p className="text-gray-500">Overblik over fødevarestandard krav og dokumentation</p>
          </div>
          <Link 
            href="/upload" 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Upload size={20} />
            Upload ny standard
          </Link>
        </div>

        {/* Statistik Kort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><FileText size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Total antal krav</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full"><CheckCircle size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Opfyldte krav</p>
                <p className="text-2xl font-bold">{completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><AlertCircle size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Audit Parathed</p>
                <p className="text-2xl font-bold">{progress}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Krav Tabel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-semibold text-sm text-gray-600">Sektion</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Krav</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Dokumentation</th>
              </tr>
            </thead>
            <tbody>
              {requirements?.map((req) => (
                <RequirementRow key={req.id} requirement={req} />
              ))}
            </tbody>
          </table>
          {total === 0 && (
            <div className="p-12 text-center text-gray-400">
              Ingen krav fundet. Start med at uploade en standard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
