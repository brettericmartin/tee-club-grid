import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Info } from "lucide-react";
import { toast } from "sonner";
import { SubmitEquipmentForm } from "@/lib/equipment-types";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";

interface SubmitEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (equipment: SubmitEquipmentForm) => void;
}

const SubmitEquipmentModal = ({ isOpen, onClose, onSubmit }: SubmitEquipmentModalProps) => {
  const [formData, setFormData] = useState<SubmitEquipmentForm>({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    category: "",
    description: "",
    imageUrl: ""
  });

  const categories = Object.values(EQUIPMENT_CATEGORIES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.brand || !formData.model || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      category: "",
      description: "",
      imageUrl: ""
    });
    
    toast.success("Equipment submitted for review!");
    onClose();
  };

  const handleInputChange = (field: keyof SubmitEquipmentForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Submit Equipment</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Community Contributions</p>
              <p className="text-sm text-muted-foreground">
                Help grow the database by submitting missing equipment. All submissions are reviewed before being added.
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">Vintage Equipment</Badge>
                <Badge variant="secondary" className="text-xs">Custom Builds</Badge>
                <Badge variant="secondary" className="text-xs">Boutique Brands</Badge>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Brand and Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  placeholder="e.g., TaylorMade"
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  placeholder="e.g., Stealth 2"
                  required
                />
              </div>
            </div>

            {/* Category and Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_DISPLAY_NAMES[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange("year", parseInt(e.target.value))}
                  min="1950"
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of the equipment, key features, or why it's special..."
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div>
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            {/* Submission Guidelines */}
            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Submission Guidelines</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Equipment must be authentic golf equipment</li>
                <li>• Include accurate brand and model names</li>
                <li>• Vintage equipment (pre-2020) is welcome</li>
                <li>• Custom or modified equipment should be clearly described</li>
                <li>• Images should be clear and show the equipment clearly</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Submit Equipment
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitEquipmentModal;