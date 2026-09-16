import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl">
            <ShieldCheck size={48} />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Audit Ready AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload dine fødevarestandarder, udtræk krav automatisk og generér 
          dokumentation, der gør din næste audit til en leg.
        </p>
        <Link 
          href="/dashboard" 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
        >
          Gå til Dashboard
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}
