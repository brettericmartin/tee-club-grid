import React from 'react';
import { ArrowLeft, Package, Wrench, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patchNotes } from '@/data/patchNotes';

const PatchNotes: React.FC = () => {
  const navigate = useNavigate();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feature':
        return <Sparkles className="w-4 h-4" />;
      case 'fix':
        return <Wrench className="w-4 h-4" />;
      case 'improvement':
        return <Package className="w-4 h-4" />;
      case 'performance':
        return <Zap className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feature':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'fix':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'improvement':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'performance':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#111111]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Patch Notes</h1>
              <p className="text-sm text-gray-400">Track all updates and improvements to Teed.club</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {patchNotes.map((patch, index) => (
            <div
              key={patch.version}
              className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Version Header */}
              <div className="bg-gradient-to-r from-green-600/20 to-transparent p-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                        v{patch.version}
                      </span>
                      {index === 0 && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold border border-blue-500/30 animate-pulse">
                          Latest
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mb-1">{patch.title}</h2>
                    <p className="text-sm text-gray-400">{patch.date}</p>
                  </div>
                </div>
              </div>

              {/* Changes */}
              <div className="p-6">
                <div className="space-y-3">
                  {patch.changes.map((change, changeIndex) => (
                    <div
                      key={changeIndex}
                      className="flex items-start gap-3 group"
                    >
                      <div
                        className={`mt-0.5 p-1.5 rounded-lg border ${getCategoryColor(
                          change.category
                        )}`}
                      >
                        {getCategoryIcon(change.category)}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300 leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 p-6 bg-[#1a1a1a] rounded-xl border border-white/10 text-center">
          <p className="text-gray-400 mb-2">
            We're constantly improving Teed.club based on your feedback.
          </p>
          <p className="text-sm text-gray-500">
            Have suggestions? Reach out to us on the Forum!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatchNotes;