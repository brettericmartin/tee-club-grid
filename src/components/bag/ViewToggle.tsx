import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  viewMode: 'list' | 'gallery';
  setViewMode: (mode: 'list' | 'gallery') => void;
}

const ViewToggle = ({ viewMode, setViewMode }: ViewToggleProps) => {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => setViewMode('list')}
        variant="ghost"
        size="sm"
        className={`p-2 rounded-lg transition-colors ${
          viewMode === 'list' 
            ? 'bg-white/20 text-white' 
            : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
        }`}
      >
        <List className="w-5 h-5" />
      </Button>
      <Button
        onClick={() => setViewMode('gallery')}
        variant="ghost"
        size="sm"
        className={`p-2 rounded-lg transition-colors ${
          viewMode === 'gallery' 
            ? 'bg-white/20 text-white' 
            : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
        }`}
      >
        <Grid className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default ViewToggle;