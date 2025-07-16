import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Badge {
  id: number;
  name: string;
  description: string;
  category: string;
  icon?: string;
  brand?: string;
  color: string;
  rarity: string;
  filename: string;
}

interface BadgeManifest {
  badges: Badge[];
  totalCount: number;
  categories: string[];
  rarities: string[];
}

const rarityColors = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-600'
};

export default function BadgePreview() {
  const [manifest, setManifest] = useState<BadgeManifest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Load badge manifest
    fetch('/badges/manifest.json')
      .then(res => res.json())
      .then(data => setManifest(data))
      .catch(err => console.error('Failed to load badge manifest:', err));
  }, []);

  if (!manifest) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading badges...</div>
      </div>
    );
  }

  const filteredBadges = selectedCategory === 'all' 
    ? manifest.badges 
    : manifest.badges.filter(b => b.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-primary hover:text-primary/80">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Teed.club Badge System</h1>
          </div>
          <div className="text-sm text-gray-400">
            {manifest.totalCount} badges total
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {manifest.categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                selectedCategory === cat 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {filteredBadges.map(badge => (
            <div key={badge.id} className="text-center group">
              <div className={`relative rounded-xl p-2 border-2 ${rarityColors[badge.rarity as keyof typeof rarityColors]} bg-gray-900/50 hover:bg-gray-900/80 transition-all`}>
                <img 
                  src={`/badges/${badge.filename}`} 
                  alt={badge.name}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-xl p-2">
                  <p className="text-xs text-center">{badge.description}</p>
                </div>
              </div>
              <h3 className="mt-2 text-sm font-medium">{badge.name}</h3>
              <p className="text-xs text-gray-500 capitalize">{badge.rarity}</p>
            </div>
          ))}
        </div>

        {/* Rarity Legend */}
        <div className="mt-12 p-6 bg-gray-900/50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Badge Rarity</h2>
          <div className="flex gap-6 flex-wrap">
            {Object.entries(rarityColors).map(([rarity, color]) => (
              <div key={rarity} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded border-2 ${color}`} />
                <span className="text-sm capitalize">{rarity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}