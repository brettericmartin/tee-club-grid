import { useState } from 'react';
import { Search, Upload, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  importEquipmentFromAPI, 
  searchAllSources,
  bulkImportEquipment,
  GOLF_APIS 
} from '@/services/equipment-import';

export function EquipmentImport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState('manual');

  // Manual entry form
  const [manualForm, setManualForm] = useState({
    brand: '',
    model: '',
    category: 'drivers',
    year: new Date().getFullYear(),
    msrp: '',
    description: '',
    imageUrl: ''
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchAllSources(searchQuery);
      setSearchResults(results);
      
      const totalFound = results.reduce((sum, r) => sum + (r.data?.length || 0), 0);
      toast.success(`Found ${totalFound} results across ${results.length} sources`);
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleManualImport = async () => {
    try {
      const result = await importEquipmentFromAPI({
        brand: manualForm.brand,
        model: manualForm.model,
        category: manualForm.category,
        year: manualForm.year,
        msrp: parseFloat(manualForm.msrp),
        description: manualForm.description,
        images: manualForm.imageUrl ? [manualForm.imageUrl] : []
      });

      toast.success(`${result.isNew ? 'Added' : 'Updated'} ${manualForm.brand} ${manualForm.model}`);
      
      // Reset form
      setManualForm({
        brand: '',
        model: '',
        category: 'drivers',
        year: new Date().getFullYear(),
        msrp: '',
        description: '',
        imageUrl: ''
      });
    } catch (error) {
      toast.error('Import failed');
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const results = await bulkImportEquipment(file);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast.success(`Imported ${successful} items. ${failed} failed.`);
      
      if (failed > 0) {
        console.error('Failed imports:', results.filter(r => !r.success));
      }
    } catch (error) {
      toast.error('Bulk import failed');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Equipment Import</h1>
        <p className="text-muted-foreground">
          Import golf equipment data from various sources
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search & Import</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          <TabsTrigger value="apis">API Sources</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Equipment</CardTitle>
              <CardDescription>
                Search across multiple sources for equipment data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by brand, model, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="w-4 h-4 mr-2" />
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  {searchResults.map((source) => (
                    <div key={source.source}>
                      <h3 className="font-semibold mb-2">
                        {source.source} ({source.data?.length || 0} results)
                      </h3>
                      {source.success ? (
                        <div className="grid gap-2">
                          {source.data.map((item: any) => (
                            <Card key={item.id} className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">
                                    {item.brand} {item.model}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.category} • ${item.msrp}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => importEquipmentFromAPI(item)}
                                >
                                  Import
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-destructive">
                          Error: {source.error?.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Equipment Entry</CardTitle>
              <CardDescription>
                Add equipment manually with all details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={manualForm.brand}
                    onChange={(e) => setManualForm({ ...manualForm, brand: e.target.value })}
                    placeholder="TaylorMade"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={manualForm.model}
                    onChange={(e) => setManualForm({ ...manualForm, model: e.target.value })}
                    placeholder="Stealth 2 Driver"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={manualForm.category}
                    onValueChange={(value) => setManualForm({ ...manualForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drivers">Drivers</SelectItem>
                      <SelectItem value="woods">Fairway Woods</SelectItem>
                      <SelectItem value="hybrids">Hybrids</SelectItem>
                      <SelectItem value="irons">Irons</SelectItem>
                      <SelectItem value="wedges">Wedges</SelectItem>
                      <SelectItem value="putters">Putters</SelectItem>
                      <SelectItem value="balls">Golf Balls</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={manualForm.year}
                    onChange={(e) => setManualForm({ ...manualForm, year: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="msrp">MSRP</Label>
                  <Input
                    id="msrp"
                    type="number"
                    step="0.01"
                    value={manualForm.msrp}
                    onChange={(e) => setManualForm({ ...manualForm, msrp: e.target.value })}
                    placeholder="599.99"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={manualForm.imageUrl}
                  onChange={(e) => setManualForm({ ...manualForm, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <Button onClick={handleManualImport} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Import Equipment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Import multiple equipment items from CSV or JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="mb-2">Drop a CSV or JSON file here, or click to browse</p>
                <Input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Expected format:</p>
                <pre className="text-xs bg-muted p-2 rounded">
{`CSV:
brand,model,category,year,msrp
TaylorMade,Stealth 2 Driver,drivers,2023,599.99

JSON:
[
  {
    "brand": "TaylorMade",
    "model": "Stealth 2 Driver",
    "category": "drivers",
    "year": 2023,
    "msrp": 599.99
  }
]`}
                </pre>
              </div>

              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Sources Tab */}
        <TabsContent value="apis">
          <div className="grid gap-4">
            {Object.entries(GOLF_APIS).map(([key, api]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {api.name}
                    {api.free && (
                      <span className="text-sm font-normal text-green-600">Free</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {api.url}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {api.requiresKey && (
                      <p className="text-sm">
                        <span className="font-medium">API Key Required:</span> Yes
                      </p>
                    )}
                    {api.pricing && (
                      <p className="text-sm">
                        <span className="font-medium">Pricing:</span> {api.pricing}
                      </p>
                    )}
                    {api.requiresPartnership && (
                      <p className="text-sm text-amber-600">
                        Requires partnership agreement
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Site
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}