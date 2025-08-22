import { z } from "zod";

// User Equipment Links (Affiliate/Recommended links on bag items)
export const userEquipmentLinkSchema = z.object({
  bag_id: z.string().uuid(),
  bag_equipment_id: z.string().uuid(),
  equipment_id: z.string().uuid().optional(),
  label: z.string().min(1).max(80),
  url: z.string().url(),
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// Equipment Videos (Community-contributed videos)
export const equipmentVideoSchema = z.object({
  equipment_id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().max(200).optional(),
  channel: z.string().max(100).optional(),
});

// User Bag Videos (Bag-level recommended videos)
export const userBagVideoSchema = z.object({
  bag_id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  share_to_feed: z.boolean().optional(),
});

// Update schemas for editing existing records
export const updateUserEquipmentLinkSchema = userEquipmentLinkSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateEquipmentVideoSchema = equipmentVideoSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateUserBagVideoSchema = userBagVideoSchema.partial().extend({
  id: z.string().uuid(),
});

// Link click tracking schema
export const linkClickSchema = z.object({
  link_id: z.string().uuid(),
  clicked_by_user: z.string().uuid().optional().nullable(),
  bag_id: z.string().uuid().optional().nullable(),
  referrer: z.string().url().optional().nullable(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  ip_hash: z.string().optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
});

// Batch operations schemas
export const batchUserEquipmentLinksSchema = z.array(userEquipmentLinkSchema);
export const batchEquipmentVideosSchema = z.array(equipmentVideoSchema);
export const batchUserBagVideosSchema = z.array(userBagVideoSchema);

// Query parameter schemas for API endpoints
export const equipmentVideoQuerySchema = z.object({
  equipment_id: z.string().uuid().optional(),
  provider: z.enum(["youtube", "tiktok", "vimeo", "other"]).optional(),
  verified: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const userEquipmentLinkQuerySchema = z.object({
  bag_id: z.string().uuid().optional(),
  bag_equipment_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  is_primary: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

// Video URL validation with provider detection
export const videoUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      
      // Allow known video platforms
      const validHosts = [
        "youtube.com", "www.youtube.com", "youtu.be",
        "tiktok.com", "www.tiktok.com",
        "vimeo.com", "www.vimeo.com", "player.vimeo.com"
      ];
      
      return validHosts.some(validHost => 
        host === validHost || host.endsWith(`.${validHost}`)
      );
    } catch {
      return false;
    }
  },
  {
    message: "URL must be from YouTube, TikTok, or Vimeo"
  }
);

// Affiliate URL validation
export const affiliateUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const u = new URL(url);
      // Ensure HTTPS for affiliate links
      return u.protocol === "https:";
    } catch {
      return false;
    }
  },
  {
    message: "Affiliate links must use HTTPS"
  }
);

// Type exports for use in components
export type UserEquipmentLinkInput = z.infer<typeof userEquipmentLinkSchema>;
export type EquipmentVideoInput = z.infer<typeof equipmentVideoSchema>;
export type UserBagVideoInput = z.infer<typeof userBagVideoSchema>;
export type LinkClickInput = z.infer<typeof linkClickSchema>;
export type EquipmentVideoQuery = z.infer<typeof equipmentVideoQuerySchema>;
export type UserEquipmentLinkQuery = z.infer<typeof userEquipmentLinkQuerySchema>;