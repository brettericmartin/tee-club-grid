import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Code, QrCode, Twitter, Facebook, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as QRCode from "qrcode";

interface ShareStripProps {
  bag: {
    id: string;
    name: string;
    profiles: {
      username: string;
      display_name?: string;
    };
  };
  username: string;
}

const ShareStrip = ({ bag, username }: ShareStripProps) => {
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const bagUrl = `${window.location.origin}/@${username}`;
  const shareTitle = `Check out ${bag.profiles.display_name || username}'s golf bag on Teed.club`;
  const shareText = `${bag.name} - View my complete golf setup on Teed.club`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bagUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(bagUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#065f46",
          light: "#ffffff",
        },
      });
      setQrCodeUrl(url);
      setShowQRModal(true);
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(bagUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      bagUrl
    )}`;
    window.open(facebookUrl, "_blank");
  };

  const embedCode = `<iframe src="${bagUrl}/embed" width="600" height="800" frameborder="0" title="${bag.name}"></iframe>`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <Share2 className="w-6 h-6 text-emerald-400" />
        <h3 className="text-2xl font-bold text-white">Share This Bag</h3>
      </div>

      <div className="bg-emerald-950/30 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
        {/* URL Copy Section */}
        <div className="space-y-3 mb-6">
          <Label className="text-emerald-200">Bag URL</Label>
          <div className="flex gap-2">
            <Input
              value={bagUrl}
              readOnly
              className="bg-emerald-900/30 border-emerald-500/30 text-emerald-100"
            />
            <Button
              onClick={copyLink}
              variant="outline"
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        {/* Share Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={shareOnTwitter}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={shareOnFacebook}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              <Facebook className="w-4 h-4 mr-2" />
              Facebook
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={generateQRCode}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setShowEmbedModal(true)}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              <Code className="w-4 h-4 mr-2" />
              Embed
            </Button>
          </motion.div>
        </div>

        {/* Native Share (if available) */}
        {navigator.share && (
          <div className="mt-4 pt-4 border-t border-emerald-500/20">
            <Button
              onClick={() => {
                navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: bagUrl,
                });
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via System
            </Button>
          </div>
        )}
      </div>

      {/* Embed Modal */}
      <Dialog open={showEmbedModal} onOpenChange={setShowEmbedModal}>
        <DialogContent className="bg-emerald-950 border-emerald-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Embed This Bag</DialogTitle>
            <DialogDescription className="text-emerald-200/60">
              Copy this code to embed the bag on your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-emerald-900/30 rounded-lg p-3">
              <code className="text-xs text-emerald-300 break-all">{embedCode}</code>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                toast.success("Embed code copied!");
                setShowEmbedModal(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Embed Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-emerald-950 border-emerald-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">QR Code</DialogTitle>
            <DialogDescription className="text-emerald-200/60">
              Scan to view this bag on your mobile device
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
            <Button
              onClick={() => {
                const link = document.createElement("a");
                link.download = `${username}-bag-qr.png`;
                link.href = qrCodeUrl;
                link.click();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ShareStrip;