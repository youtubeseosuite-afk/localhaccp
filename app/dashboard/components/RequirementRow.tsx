'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';

export default function RequirementRow({ requirement }: { requirement: any }) {
  const supabase = createClient();
  const [status, setStatus] = useState(requirement.status);

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    await supabase
      .from('requirements')
      .update({ status: newStatus })
      .eq('id', requirement.id);
  }

  // Find det tilknyttede dokument (hvis der er et)
  const doc = requirement.requirement_documents?.[0]?.documents;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition">
      <td className="p-4 text-sm text-gray-500">{requirement.section || 'N/A'}</td>
      <td className="p-4 text-sm text-gray-800 font-medium max-w-md truncate">
        {requirement.requirement_text}
      </td>
      <td className="p-4">
        <select 
          value={status} 
          onChange={(e) => updateStatus(e.target.value)}
          className={`text-xs font-semibold p-1 rounded border ${
            status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
            status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
            'bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          <option value="pending">Afventer</option>
          <option value="in_progress">Under udarbejdelse</option>
          <option value="completed">Fuldført</option>
        </select>
      </td>
      <td className="p-4">
        {doc ? (
          <a 
            href={doc.file_url} 
            target="_blank" 
            className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
          >
            <FileText size={14} />
            {doc.name} <ExternalLink size={12} />
          </a>
        ) : (
          <button 
            className="text-xs text-gray-400 hover:text-blue-600 transition flex items-center gap-1"
            onClick={() => alert('AI Generering starter...')}
          >
            + Generér udkast
          </button>
        )}
      </td>
    </tr>
  );
}
