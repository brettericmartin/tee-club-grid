import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { quickSeedPopularEquipment, seedAllEquipmentImages } from '@/services/seed-equipment-images';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SeedEquipment() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleQuickSeed = async () => {
    setLoading(true);
    try {
      await quickSeedPopularEquipment();
      toast.success('Popular equipment seeded with images!');
      setResults([{ message: 'Successfully seeded popular equipment with images' }]);
    } catch (error) {
      toast.error('Failed to seed equipment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAll = async () => {
    setLoading(true);
    try {
      const results = await seedAllEquipmentImages();
      setResults(results);
      toast.success(`Seeded ${results.length} equipment items with images`);
    } catch (error) {
      toast.error('Failed to seed all equipment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSampleEquipment = async () => {
    setLoading(true);
    try {
      // Add some popular equipment to the database
      const equipment = [
        // Drivers
        { brand: 'TaylorMade', model: 'Stealth 2 Driver', category: 'drivers', msrp: 599.99, image_url: 'https://www.taylormadegolf.com/dw/image/v2/AAIW_PRD/on/demandware.static/-/Sites-TMaG-Library/default/v1677614041352/2023/drivers/stealth2/hero/Stealth2_Driver_Hero.png' },
        { brand: 'Titleist', model: 'TSi3 Driver', category: 'drivers', msrp: 549.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/v1612988461194/products/drivers/tsi/tsi3/TSi3_Driver_Hero.png' },
        { brand: 'Callaway', model: 'Paradym Driver', category: 'drivers', msrp: 599.99, image_url: 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/default/v1674165433614/products/drivers/2023/paradym/hero/Paradym_Driver_Hero.png' },
        { brand: 'Ping', model: 'G430 Max Driver', category: 'drivers', msrp: 549.99, image_url: 'https://ping.com/dw/image/v2/AAHB_PRD/on/demandware.static/-/Sites-ping-Library/default/products/drivers/g430/hero/G430_Driver_Hero.png' },
        
        // Irons
        { brand: 'TaylorMade', model: 'P790 Irons', category: 'irons', msrp: 1399.99, image_url: 'https://www.taylormadegolf.com/dw/image/v2/AAIW_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2023/irons/p790/hero/P790_Iron_Hero.png' },
        { brand: 'Titleist', model: 'T100 Irons', category: 'irons', msrp: 1399.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/products/irons/t-series/t100/T100_Iron_Hero.png' },
        { brand: 'Mizuno', model: 'JPX 923 Forged', category: 'irons', msrp: 1299.99, image_url: '/placeholder.svg' },
        { brand: 'Ping', model: 'i230 Irons', category: 'irons', msrp: 1199.99, image_url: 'https://ping.com/dw/image/v2/AAHB_PRD/on/demandware.static/-/Sites-ping-Library/default/products/irons/i230/hero/i230_Iron_Hero.png' },
        
        // Wedges
        { brand: 'Titleist', model: 'Vokey SM9', category: 'wedges', msrp: 179.99, image_url: '/placeholder.svg' },
        { brand: 'Cleveland', model: 'RTX ZipCore', category: 'wedges', msrp: 149.99, image_url: '/placeholder.svg' },
        { brand: 'Callaway', model: 'Jaws Raw', category: 'wedges', msrp: 159.99, image_url: '/placeholder.svg' },
        
        // Putters
        { brand: 'Scotty Cameron', model: 'Newport 2', category: 'putters', msrp: 599.99, image_url: 'https://www.scottycameron.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/putters/select/newport-2/Newport_2_Putter_Hero.png' },
        { brand: 'Odyssey', model: 'White Hot OG', category: 'putters', msrp: 249.99, image_url: '/placeholder.svg' },
        { brand: 'TaylorMade', model: 'Spider GT', category: 'putters', msrp: 349.99, image_url: '/placeholder.svg' },
        
        // Balls
        { brand: 'Titleist', model: 'Pro V1', category: 'balls', msrp: 54.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/golf-balls/pro-v1/Pro_V1_Ball_Hero.png' },
        { brand: 'Callaway', model: 'Chrome Soft', category: 'balls', msrp: 49.99, image_url: '/placeholder.svg' },
        { brand: 'TaylorMade', model: 'TP5', category: 'balls', msrp: 49.99, image_url: '/placeholder.svg' },
      ];

      const insertResults = [];
      
      for (const item of equipment) {
        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from('equipment')
            .select('id')
            .eq('brand', item.brand)
            .eq('model', item.model)
            .single();

          if (!existing) {
            const { data, error } = await supabase
              .from('equipment')
              .insert({
                ...item,
                specs: {},
                release_date: '2023-01-01'
              })
              .select()
              .single();

            if (error) throw error;
            insertResults.push({ success: true, item: `${item.brand} ${item.model}` });
          } else {
            insertResults.push({ exists: true, item: `${item.brand} ${item.model}` });
          }
        } catch (error) {
          insertResults.push({ error: true, item: `${item.brand} ${item.model}` });
        }
      }

      const added = insertResults.filter(r => r.success).length;
      const existing = insertResults.filter(r => r.exists).length;
      
      toast.success(`Added ${added} new items. ${existing} already existed.`);
      setResults(insertResults);
    } catch (error) {
      toast.error('Failed to add sample equipment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Seed Equipment Database</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Add popular golf equipment with initial images to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleAddSampleEquipment} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Equipment...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Sample Equipment
                </>
              )}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will add popular equipment from major brands (TaylorMade, Titleist, Callaway, Ping, etc.) 
                with placeholder images where manufacturer images aren't available.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seed Equipment Images</CardTitle>
            <CardDescription>
              Add initial images to equipment that doesn't have any photos yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleQuickSeed} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Seed Popular Equipment
                  </>
                )}
              </Button>

              <Button 
                onClick={handleSeedAll} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Seeding All...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Seed All Equipment
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                This will attempt to find and add product images from known sources. 
                Images will be added as system-generated content that users can later vote on.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {result.success && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Added: {result.item}</span>
                      </>
                    )}
                    {result.exists && (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        <span>Already exists: {result.item}</span>
                      </>
                    )}
                    {result.error && (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>Error: {result.item}</span>
                      </>
                    )}
                    {result.equipment && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{result.equipment} - {result.imagesAdded} images added</span>
                      </>
                    )}
                    {result.message && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{result.message}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}