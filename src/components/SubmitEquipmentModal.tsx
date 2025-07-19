import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Upload, Info, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SubmitEquipmentForm } from "@/lib/equipment-types";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";
import { getEquipmentBrands, getEquipmentModels, searchEquipmentByQuery } from "@/services/equipment";
import { useAuth } from "@/contexts/AuthContext";

interface SubmitEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (equipment: SubmitEquipmentForm) => void;
  initialCategory?: string;
}

const SubmitEquipmentModal = ({ isOpen, onClose, onSubmit, initialCategory }: SubmitEquipmentModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<SubmitEquipmentForm>({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    category: "",
    description: "",
    imageUrl: "",
    isCustom: false,
    flex: "",
    weight: undefined,
    size: "",
    color: ""
  });
  
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<{ model: string; category: string }[]>([]);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const categories = Object.values(EQUIPMENT_CATEGORIES);
  
  // Load brands when modal opens and set initial category
  useEffect(() => {
    if (isOpen) {
      loadBrands();
      if (initialCategory) {
        setFormData(prev => ({ ...prev, category: initialCategory }));
      }
    }
  }, [isOpen, initialCategory]);
  
  // Load models when brand is selected
  useEffect(() => {
    if (formData.brand && !showNewBrand) {
      loadModels(formData.brand);
    }
  }, [formData.brand, showNewBrand]);
  
  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      const brandList = await getEquipmentBrands();
      setBrands(brandList);
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };
  
  const loadModels = async (brand: string) => {
    setLoadingModels(true);
    try {
      const modelList = await getEquipmentModels(brand);
      setModels(modelList);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const filteredBrands = brandSearch 
    ? brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
    : brands;
    
  const filteredModels = modelSearch
    ? models.filter(m => m.model.toLowerCase().includes(modelSearch.toLowerCase()))
    : models;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.brand || !formData.model || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      imageFile
    };
    
    onSubmit(submitData);
    
    // Reset form
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      category: "",
      description: "",
      imageUrl: "",
      isCustom: false
    });
    setShowNewBrand(false);
    setShowNewModel(false);
    setBrandSearch("");
    setModelSearch("");
    setImageFile(null);
    setImagePreview("");
    
    toast.success("Equipment added successfully!");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Submit Equipment</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Info Banner */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Community Contributions</p>
              <p className="text-sm text-muted-foreground">
                Help grow the database by submitting missing equipment. Your equipment will be available immediately!
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">Vintage Equipment</Badge>
                <Badge variant="secondary" className="text-xs">Custom Builds</Badge>
                <Badge variant="secondary" className="text-xs">Boutique Brands</Badge>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Brand Selection */}
            <div>
              <Label htmlFor="brand">Brand *</Label>
              {!showNewBrand ? (
                <div className="relative" ref={brandDropdownRef}>
                  <Input
                    id="brand"
                    value={brandSearch || formData.brand}
                    onChange={(e) => {
                      setBrandSearch(e.target.value);
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    placeholder="Search for a brand..."
                    required
                  />
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  
                  {showBrandDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg max-h-48 overflow-y-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-primary hover:text-primary"
                        onClick={() => {
                          setShowNewBrand(true);
                          setShowNewModel(true); // Auto-select new model for new brand
                          setFormData({ ...formData, brand: brandSearch }); // Pre-fill with search text
                          setShowBrandDropdown(false);
                          setBrandSearch("");
                        }}
                      >
                        + Add New Brand
                      </Button>
                      {loadingBrands ? (
                        <div className="p-2 text-center">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </div>
                      ) : (
                        filteredBrands.map(brand => (
                          <Button
                            key={brand}
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              handleInputChange("brand", brand);
                              setBrandSearch("");
                              setShowBrandDropdown(false);
                            }}
                          >
                            {brand}
                          </Button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    placeholder="Enter new brand name"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewBrand(false);
                      setBrandSearch(formData.brand); // Restore the text to search box
                      setFormData({ ...formData, brand: "" });
                    }}
                  >
                    Cancel New Brand
                  </Button>
                </div>
              )}
            </div>
            
            {/* Model Selection */}
            <div>
              <Label htmlFor="model">Model *</Label>
              {!showNewModel ? (
                <div className="relative" ref={modelDropdownRef}>
                  <Input
                    id="model"
                    value={modelSearch || formData.model}
                    onChange={(e) => {
                      setModelSearch(e.target.value);
                      setShowModelDropdown(true);
                    }}
                    onFocus={() => setShowModelDropdown(true)}
                    placeholder="Search for a model..."
                    required
                    disabled={!formData.brand}
                  />
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  
                  {showModelDropdown && formData.brand && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg max-h-48 overflow-y-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-primary hover:text-primary"
                        onClick={() => {
                          setShowNewModel(true);
                          setFormData({ ...formData, model: modelSearch }); // Pre-fill with search text
                          setShowModelDropdown(false);
                          setModelSearch("");
                        }}
                      >
                        + Add New Model
                      </Button>
                      {loadingModels ? (
                        <div className="p-2 text-center">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </div>
                      ) : (
                        filteredModels.map(({ model, category }) => (
                          <Button
                            key={model}
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              handleInputChange("model", model);
                              handleInputChange("category", category);
                              setModelSearch("");
                              setShowModelDropdown(false);
                            }}
                          >
                            <span>{model}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {CATEGORY_DISPLAY_NAMES[category]}
                            </span>
                          </Button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="Enter new model name"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewModel(false);
                      setModelSearch(formData.model); // Restore the text to search box
                      setFormData({ ...formData, model: "" });
                    }}
                  >
                    Cancel New Model
                  </Button>
                </div>
              )}
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

            {/* Shaft specific fields */}
            {formData.category === 'shaft' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flex">Flex</Label>
                    <Input
                      id="flex"
                      value={formData.flex || ''}
                      onChange={(e) => handleInputChange("flex", e.target.value)}
                      placeholder="e.g., Stiff, Regular, X-Stiff"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={formData.weight || ''}
                      onChange={(e) => handleInputChange("weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g., 65"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Grip specific fields */}
            {formData.category === 'grip' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      value={formData.size || ''}
                      onChange={(e) => handleInputChange("size", e.target.value)}
                      placeholder="e.g., Standard, Midsize, Jumbo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color || ''}
                      onChange={(e) => handleInputChange("color", e.target.value)}
                      placeholder="e.g., Black, White, Red"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Custom Equipment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isCustom"
                checked={formData.isCustom}
                onCheckedChange={(checked) => handleInputChange("isCustom", checked as boolean)}
              />
              <Label htmlFor="isCustom" className="cursor-pointer">
                Custom/Boutique Equipment
              </Label>
            </div>
            
            {/* Image Upload */}
            <div>
              <Label htmlFor="image">Equipment Photo</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Equipment preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                After submission, you'll be redirected to upload more photos
              </p>
            </div>

            {/* Submission Guidelines */}
            <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm text-foreground">Submission Guidelines</h4>
              <ul className="text-xs text-foreground/80 space-y-1">
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