import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function EquipmentDataInfo() {
  return (
    <Alert className="mb-6">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Equipment Data Setup</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>To populate equipment data in Supabase:</p>
        <ol className="list-decimal list-inside space-y-1 ml-4">
          <li>Go to your Supabase dashboard</li>
          <li>Navigate to SQL Editor</li>
          <li>Copy the contents of <code className="text-sm bg-muted px-1 rounded">equipment-import.sql</code></li>
          <li>Paste and run the query</li>
        </ol>
        <p className="text-sm mt-2">
          This will import all 66 equipment items with normalized categories.
        </p>
      </AlertDescription>
    </Alert>
  );
}