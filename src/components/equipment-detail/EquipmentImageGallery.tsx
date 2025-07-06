interface EquipmentImageGalleryProps {
  images: string[];
  brand: string;
  model: string;
  selectedImageIndex: number;
  onImageSelect: (index: number) => void;
}

const EquipmentImageGallery = ({ 
  images, 
  brand, 
  model, 
  selectedImageIndex, 
  onImageSelect 
}: EquipmentImageGalleryProps) => {
  return (
    <div className="space-y-4">
      <div className="aspect-square bg-background rounded-lg flex items-center justify-center overflow-hidden">
        <img
          src={images[selectedImageIndex] || images[0]}
          alt={`${brand} ${model}`}
          className="w-full h-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onImageSelect(index)}
              className={`flex-shrink-0 w-16 h-16 bg-background rounded-md overflow-hidden border-2 ${
                selectedImageIndex === index ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img
                src={image}
                alt={`View ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipmentImageGallery;