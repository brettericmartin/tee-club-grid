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
  ClipboardList
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
import { displayNameToSlug } from "@/utils/slugify";
import { DOMAIN_CONFIG } from "@/config/domain";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bag: {
    id: string;
    name: string;
    profiles?: {
      username?: string;
      display_name?: string;
    };
  };
}

const ShareModal = ({ isOpen, onClose, bag }: ShareModalProps) => {
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Generate the shareable URL using the actual username
  const username = bag.profiles?.username || '';
  const shareUrl = username ? `${DOMAIN_CONFIG.production}/@${username}` : DOMAIN_CONFIG.getBagShareUrl(bag.id);
  const directBagUrl = DOMAIN_CONFIG.getBagShareUrl(bag.id);
  
  const shareTitle = `Check out ${bag.profiles?.display_name || bag.profiles?.username || 'this'}'s golf bag on Teed.club`;
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
    link.download = `${userSlug}-bag-qr.png`;
    link.href = qrCodeUrl;
    link.click();
    toast.success("QR code downloaded!");
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
    // TikTok doesn't have a direct share URL API, so we copy the link and open TikTok
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Open TikTok and paste in your video description");
    // Open TikTok web
    window.open("https://www.tiktok.com", "_blank");
  };

  const shareOnInstagram = () => {
    // Instagram doesn't support direct URL sharing, so we copy the link
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Add it to your Instagram bio or story");
    // Open Instagram web
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
        // User cancelled or error occurred
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Bag
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Copy Section */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Bag URL</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 truncate">
                {shareUrl}
              </div>
              <Button
                onClick={copyLink}
                variant="outline"
                size="sm"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Share on Social Media</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareOnTwitter}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={shareOnFacebook}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={shareOnInstagram}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                </svg>
                Instagram
              </Button>
              <Button
                onClick={shareOnTikTok}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.28 6.28 0 0 0-.88-.07 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34v-7.1a8.28 8.28 0 0 0 4.77 1.52v-3.4a4.83 4.83 0 0 1-1-0z"/>
                </svg>
                TikTok
              </Button>
              <Button
                onClick={shareOnReddit}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a] col-span-2"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                Reddit
              </Button>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Advanced Options</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => {
                  copyEquipmentList();
                  setShowEquipmentList(true);
                  setShowQRCode(false);
                  setShowEmbedCode(false);
                  setShowShareCard(false);
                }}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                onClick={() => {
                  generateQRCode();
                  setShowEquipmentList(false);
                }}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button
                onClick={() => {
                  setShowEmbedCode(true);
                  setShowQRCode(false);
                  setShowShareCard(false);
                  setShowEquipmentList(false);
                }}
                variant="outline"
                className="bg-[#2a2a2a] border-white/20 text-white hover:bg-[#3a3a3a]"
              >
                <Code className="w-4 h-4 mr-2" />
                Embed
              </Button>
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
              <p className="text-xs text-white/50 text-center">
                Perfect for sharing in messages, forums, or social media posts
              </p>
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
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;