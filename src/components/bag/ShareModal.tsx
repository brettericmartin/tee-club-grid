import { useState } from "react";
import { 
  Copy, 
  Share2, 
  Code, 
  QrCode, 
  Twitter, 
  Facebook, 
  Download,
  Check,
  ClipboardList,
  Camera,
  X,
  List,
  Grid3x3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as QRCode from "qrcode";
import { DOMAIN_CONFIG } from "@/config/domain";
import { toPng } from "html-to-image";
import { formatCompactCurrency } from "@/lib/formatters";
import { BagCard } from "@/components/bags/BagCard";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bag: {
    id: string;
    name: string;
    likes_count?: number;
    views_count?: number;
    background_image?: string;
    created_at: string;
    is_trending?: boolean;
    bag_equipment?: any[];
    profiles?: {
      id?: string;
      username?: string;
      display_name?: string;
      avatar_url?: string;
      handicap?: number;
      title?: string;
    };
  };
}

const ShareModal = ({ isOpen, onClose, bag }: ShareModalProps) => {
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [showScreenshotView, setShowScreenshotView] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState<'card' | 'list'>('card');
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Generate the shareable URL with /bag/username/bagname format
  const username = bag.profiles?.username || '';
  const bagSlug = bag.name?.toLowerCase().replace(/\s+/g, '-') || 'bag';
  
  // Always use the new format if we have a username, otherwise fall back to UUID
  const shareUrl = username && username.trim() !== ''
    ? `${DOMAIN_CONFIG.production}/bag/${username}/${bagSlug}` 
    : DOMAIN_CONFIG.getBagShareUrl(bag.id);
  const directBagUrl = DOMAIN_CONFIG.getBagShareUrl(bag.id);
  
  const shareTitle = `Check out ${bag.profiles?.display_name || bag.profiles?.username || 'this'}'s ${bag.name} on Teed.club`;
  const shareText = `${bag.name} - View my complete golf setup on Teed.club`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const copyEmbedCode = async () => {
    const embedCode = `<iframe src="${directBagUrl}/embed" width="600" height="800" frameborder="0" title="${bag.name}"></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      toast.success("Embed code copied!");
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (error) {
      toast.error("Failed to copy embed code");
    }
  };

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(shareUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeUrl(url);
      setShowQRCode(true);
      setShowEmbedCode(false);
      setShowEquipmentList(false);
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.download = `${username || 'bag'}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
    toast.success("QR code downloaded!");
  };

  const downloadAsImage = async () => {
    try {
      setIsCapturing(true);
      const element = document.getElementById('bag-screenshot-content');
      if (!element) {
        toast.error('Screenshot element not found');
        return;
      }

      const dataUrl = await toPng(element, {
        backgroundColor: '#111111',
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${bag?.name || 'bag'}-teed-club.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    } finally {
      setIsCapturing(false);
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(facebookUrl, "_blank");
  };

  const shareOnReddit = () => {
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(
      shareUrl
    )}&title=${encodeURIComponent(shareTitle)}`;
    window.open(redditUrl, "_blank");
  };

  const shareOnTikTok = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Open TikTok and paste in your video description");
    window.open("https://www.tiktok.com", "_blank");
  };

  const shareOnInstagram = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Add it to your Instagram bio or story");
    window.open("https://www.instagram.com", "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    }
  };

  const embedCode = `<iframe src="${directBagUrl}/embed" width="600" height="800" frameborder="0" title="${bag.name}"></iframe>`;

  // Generate equipment list for copying
  const generateEquipmentList = () => {
    if (!bag.bag_equipment || bag.bag_equipment.length === 0) {
      return `${bag.profiles?.display_name || 'User'}'s ${bag.name}\n\nNo equipment added yet.\n\nView at: ${shareUrl}`;
    }

    const clubs = bag.bag_equipment.filter(item => 
      ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment?.category || '')
    );
    const accessories = bag.bag_equipment.filter(item => 
      !['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment?.category || '')
    );

    let list = `🏌️ ${bag.profiles?.display_name || 'User'}'s ${bag.name}\n`;
    list += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (clubs.length > 0) {
      list += `⛳ CLUBS:\n`;
      clubs.forEach(item => {
        list += `• ${item.equipment?.brand} ${item.equipment?.model}\n`;
      });
      list += `\n`;
    }
    
    if (accessories.length > 0) {
      list += `🎒 ACCESSORIES:\n`;
      accessories.forEach(item => {
        list += `• ${item.equipment?.brand} ${item.equipment?.model}\n`;
      });
      list += `\n`;
    }
    
    list += `━━━━━━━━━━━━━━━━━━━━\n`;
    list += `📊 ${bag.bag_equipment.length} total items\n`;
    list += `💚 ${bag.likes_count || 0} tees\n\n`;
    list += `View full bag: ${shareUrl}\n`;
    list += `Join me on Teed.club! 🏌️‍♂️`;
    
    return list;
  };

  const copyEquipmentList = async () => {
    const list = generateEquipmentList();
    try {
      await navigator.clipboard.writeText(list);
      toast.success("Equipment list copied! Perfect for sharing in messages or posts.");
    } catch (error) {
      toast.error("Failed to copy list");
    }
  };

  // Calculate total value
  const totalValue = bag.bag_equipment?.reduce((sum, item) => 
    sum + (item.equipment?.msrp || 0), 0
  ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`bg-[#1a1a1a] border-white/20 text-white ${showScreenshotView ? 'max-w-4xl' : 'max-w-lg'} max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Bag
          </DialogTitle>
        </DialogHeader>

        {!showScreenshotView ? (
          // Normal share options
          <div className="space-y-4">
            {/* URL Copy Section */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Bag URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 truncate">
                  {shareUrl}
                </div>
                <Button
                  onClick={copyLink}
                  variant="outline"
                  size="sm"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Share on Social Media</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  onClick={shareOnTwitter}
                  variant="outline"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                >
                  <Twitter className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Twitter</span>
                </Button>
                <Button
                  onClick={shareOnFacebook}
                  variant="outline"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                >
                  <Facebook className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Facebook</span>
                </Button>
                <Button
                  onClick={shareOnInstagram}
                  variant="outline"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                >
                  <svg className="w-4 h-4 sm:mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                  </svg>
                  <span className="hidden sm:inline">Instagram</span>
                </Button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Advanced Options</label>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowScreenshotView(true)}
                  variant="outline"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a] w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Open Screenshot View
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => {
                      copyEquipmentList();
                      setShowEquipmentList(true);
                      setShowQRCode(false);
                      setShowEmbedCode(false);
                    }}
                    variant="outline"
                    className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                  >
                    <ClipboardList className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">List</span>
                  </Button>
                  <Button
                    onClick={() => {
                      generateQRCode();
                      setShowEquipmentList(false);
                    }}
                    variant="outline"
                    className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                  >
                    <QrCode className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">QR</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEmbedCode(true);
                      setShowQRCode(false);
                      setShowEquipmentList(false);
                    }}
                    variant="outline"
                    className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                  >
                    <Code className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Embed</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Equipment List Display */}
            {showEquipmentList && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="bg-[#2a2a2a] rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-white/90 whitespace-pre-wrap font-mono">
                    {generateEquipmentList()}
                  </pre>
                </div>
                <Button
                  onClick={copyEquipmentList}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy List Again
                </Button>
              </div>
            )}

            {/* QR Code Display */}
            {showQRCode && qrCodeUrl && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
                <Button
                  onClick={downloadQRCode}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            {/* Embed Code Display */}
            {showEmbedCode && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="bg-[#2a2a2a] rounded-lg p-3">
                  <code className="text-xs text-white/70 break-all">{embedCode}</code>
                </div>
                <Button
                  onClick={copyEmbedCode}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Native Share (if available) */}
            {navigator.share && (
              <div className="pt-3 border-t border-white/10">
                <Button
                  onClick={handleNativeShare}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via System
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Screenshot view
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setScreenshotMode('card')}
                  variant={screenshotMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  className={screenshotMode === 'card' ? 'bg-primary' : 'bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]'}
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Card View
                </Button>
                <Button
                  onClick={() => setScreenshotMode('list')}
                  variant={screenshotMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  className={screenshotMode === 'list' ? 'bg-primary' : 'bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]'}
                >
                  <List className="w-4 h-4 mr-2" />
                  List View
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadAsImage}
                  variant="default"
                  size="sm"
                  disabled={isCapturing}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isCapturing ? 'Capturing...' : 'Download'}
                </Button>
                <Button
                  onClick={() => setShowScreenshotView(false)}
                  variant="outline"
                  size="sm"
                  className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Screenshot content */}
            <div id="bag-screenshot-content" className="bg-[#111111] p-4 rounded-lg">
              {screenshotMode === 'card' ? (
                // Show the ACTUAL bag card
                <div className="pointer-events-none">
                  <BagCard 
                    bag={bag}
                    onView={() => {}}
                    onLike={() => {}}
                    onFollow={() => {}}
                    isLiked={false}
                    isFollowing={false}
                  />
                </div>
              ) : (
                // Mobile-friendly list view
                <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    {bag.profiles?.avatar_url && (
                      <img 
                        src={bag.profiles.avatar_url} 
                        alt={bag.profiles?.username}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-white">{bag.name}</h2>
                      <p className="text-sm text-white/70">
                        @{bag.profiles?.username} • {bag.bag_equipment?.length || 0} items • {formatCompactCurrency(totalValue)}
                      </p>
                    </div>
                  </div>

                  {/* Equipment List */}
                  <div className="space-y-2">
                    {(!bag.bag_equipment || bag.bag_equipment.length === 0) ? (
                      <div className="text-center py-8 text-white/50">
                        <p>No equipment added to this bag yet</p>
                      </div>
                    ) : (
                      <>
                        {/* Clubs */}
                        {bag.bag_equipment && bag.bag_equipment.filter(item => 
                          item.equipment && ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment.category || '')
                        ).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-primary mb-1">CLUBS</h3>
                        <div className="space-y-1">
                          {bag.bag_equipment?.filter(item => 
                            ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment?.category || '')
                          ).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-[#2a2a2a] rounded px-2 py-1">
                              <span className="text-sm text-white">
                                {item.equipment?.brand} {item.equipment?.model}
                              </span>
                              {item.equipment?.msrp && (
                                <span className="text-xs text-white/50">
                                  {formatCompactCurrency(item.equipment.msrp)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accessories */}
                    {bag.bag_equipment && bag.bag_equipment.filter(item => 
                      item.equipment && !['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment.category || '')
                    ).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-primary mb-1">ACCESSORIES</h3>
                        <div className="space-y-1">
                          {bag.bag_equipment?.filter(item => 
                            !['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(item.equipment?.category || '')
                          ).slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-[#2a2a2a] rounded px-2 py-1">
                              <span className="text-sm text-white">
                                {item.equipment?.brand} {item.equipment?.model}
                              </span>
                              {item.equipment?.msrp && (
                                <span className="text-xs text-white/50">
                                  {formatCompactCurrency(item.equipment.msrp)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/50">teed.club</span>
                    <span className="text-xs text-white/50">Share your golf gear</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;