import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Database, Merge, Tag, Link } from 'lucide-react';
import { 
  migrateEquipmentToSupabase,
  fixEquipmentCategories,
  deduplicateEquipment,
  updateBagEquipmentReferences
} from '@/services/equipment-migration';
import { toast } from 'sonner';

export default function EquipmentMigration() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>({});

  const handleMigration = async () => {
    setLoading('migrate');
    try {
      const result = await migrateEquipmentToSupabase();
      setResults(prev => ({ ...prev, migration: result }));
      toast.success(`Migrated ${result.migrated.length} items, updated ${result.updated.length}`);
    } catch (error) {
      toast.error('Migration failed');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleFixCategories = async () => {
    setLoading('categories');
    try {
      const result = await fixEquipmentCategories();
      setResults(prev => ({ ...prev, categories: result }));
      toast.success(`Fixed ${result.fixed} category inconsistencies`);
    } catch (error) {
      toast.error('Failed to fix categories');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeduplicate = async () => {
    setLoading('deduplicate');
    try {
      const result = await deduplicateEquipment();
      setResults(prev => ({ ...prev, deduplication: result }));
      toast.success(`Removed ${result.duplicatesRemoved} duplicates`);
    } catch (error) {
      toast.error('Deduplication failed');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateReferences = async () => {
    setLoading('references');
    try {
      const result = await updateBagEquipmentReferences();
      setResults(prev => ({ ...prev, references: result }));
      toast.success('Updated bag equipment references');
    } catch (error) {
      toast.error('Failed to update references');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const runAllMigrations = async () => {
    setLoading('all');
    try {
      // Run in sequence
      const migrationResult = await migrateEquipmentToSupabase();
      const categoryResult = await fixEquipmentCategories();
      const dedupeResult = await deduplicateEquipment();
      const refResult = await updateBagEquipmentReferences();

      setResults({
        migration: migrationResult,
        categories: categoryResult,
        deduplication: dedupeResult,
        references: refResult
      });

      toast.success('All migrations completed successfully!');
    } catch (error) {
      toast.error('Migration process failed');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Equipment Data Migration</h1>
        <p className="text-muted-foreground">
          Unify equipment data and fix inconsistencies
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Run these migrations in order. Back up your database before proceeding.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* Step 1: Migrate Equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Step 1: Migrate Equipment Data
            </CardTitle>
            <CardDescription>
              Import all equipment from the hardcoded database to Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleMigration}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'migrate' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                'Migrate Equipment to Supabase'
              )}
            </Button>
            
            {results.migration && (
              <div className="mt-4 text-sm space-y-1">
                <p className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Migrated: {results.migration.migrated.length} items
                </p>
                <p className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  Updated: {results.migration.updated.length} items
                </p>
                {results.migration.errors.length > 0 && (
                  <p className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Errors: {results.migration.errors.length}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Fix Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Step 2: Fix Category Inconsistencies
            </CardTitle>
            <CardDescription>
              Normalize all equipment categories (putter vs putters, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleFixCategories}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'categories' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing Categories...
                </>
              ) : (
                'Fix Equipment Categories'
              )}
            </Button>
            
            {results.categories && (
              <div className="mt-4 text-sm">
                <p className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Fixed {results.categories.fixed} category inconsistencies
                </p>
                <p className="text-muted-foreground mt-2">
                  Standardized categories: {results.categories.categories.join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Remove Duplicates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Step 3: Remove Duplicate Equipment
            </CardTitle>
            <CardDescription>
              Merge duplicate entries (e.g., multiple Newport 2 putters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleDeduplicate}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'deduplicate' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing Duplicates...
                </>
              ) : (
                'Remove Duplicates'
              )}
            </Button>
            
            {results.deduplication && (
              <div className="mt-4 text-sm">
                <p className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Removed {results.deduplication.duplicatesRemoved} duplicates
                </p>
                <p className="text-muted-foreground">
                  {results.deduplication.remaining} unique equipment items remain
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Update References */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Step 4: Update Bag Equipment References
            </CardTitle>
            <CardDescription>
              Fix broken references in user bags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleUpdateReferences}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'references' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating References...
                </>
              ) : (
                'Update Equipment References'
              )}
            </Button>
            
            {results.references && (
              <div className="mt-4 text-sm">
                <p className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {results.references.message}
                </p>
                <p className="text-muted-foreground">
                  Found {results.references.invalidReferences} invalid references
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run All */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Run All Migrations</CardTitle>
            <CardDescription>
              Execute all migration steps in the correct order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runAllMigrations}
              disabled={loading !== null}
              className="w-full"
              variant="default"
            >
              {loading === 'all' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running All Migrations...
                </>
              ) : (
                'Run All Migrations'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}