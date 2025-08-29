import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Users } from "lucide-react";
import { HoneypotFieldRHF } from "@/components/security/HoneypotField";

// Define the form schema matching the backend
const formSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city_region: z.string().min(2, "City/region must be at least 2 characters"),
  role: z.enum(['golfer', 'fitter_builder', 'creator', 'league_captain', 'retailer_other']),
  share_channels: z.array(z.string()).default([]),
  learn_channels: z.array(z.string()).default([]),
  spend_bracket: z.enum(['<300', '300_750', '750_1500', '1500_3000', '3000_5000', '5000_plus']),
  uses: z.array(z.string()).default([]),
  buy_frequency: z.enum(['never', 'yearly_1_2', 'few_per_year', 'monthly', 'weekly_plus']),
  share_frequency: z.enum(['never', 'yearly_1_2', 'few_per_year', 'monthly', 'weekly_plus']),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms to continue"
  }),
  contact_phone: z.string().optional() // Honeypot field
});

type FormData = z.infer<typeof formSchema>;

interface WaitlistFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  userEmail?: string;
  inviteCode: string;
  onInviteCodeChange: (code: string) => void;
}

export function WaitlistForm({ 
  onSubmit, 
  isSubmitting, 
  userEmail,
  inviteCode,
  onInviteCodeChange
}: WaitlistFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: "",
      email: userEmail || "",
      password: "",
      city_region: "",
      role: "golfer",
      share_channels: [],
      learn_channels: [],
      spend_bracket: "750_1500",
      uses: [],
      buy_frequency: "few_per_year",
      share_frequency: "never",
      termsAccepted: false,
      contact_phone: "" // Honeypot - should remain empty
    }
  });

  const shareChannelOptions = [
    { value: "reddit", label: "Reddit (r/golf)" },
    { value: "golfwrx", label: "GolfWRX Forums" },
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "facebook", label: "Facebook Groups" },
    { value: "twitter", label: "Twitter/X" }
  ];

  const learnChannelOptions = [
    { value: "youtube", label: "YouTube Reviews" },
    { value: "reddit", label: "Reddit Communities" },
    { value: "fitter websites", label: "Club Fitter Websites" },
    { value: "manufacturer sites", label: "Brand Websites" },
    { value: "golf forums", label: "Golf Forums" },
    { value: "friends", label: "Friends & Playing Partners" }
  ];

  const usesOptions = [
    { value: "discover gear", label: "Discover new equipment" },
    { value: "follow friends", label: "Follow friends' setups" },
    { value: "track builds", label: "Track my bag changes" },
    { value: "share setup", label: "Share my setup" },
    { value: "get advice", label: "Get equipment advice" },
    { value: "find deals", label: "Find deals and sales" }
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Honeypot field - hidden from users */}
        <HoneypotFieldRHF register={form.register} name="contact_phone" />
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
            <CardDescription className="text-white/60">
              Tell us a bit about yourself
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display Name */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Display Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Your name or username"
                      className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Email - hidden if user is signed in */}
            {!userEmail && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder="your@email.com"
                        className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Password *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password"
                      placeholder="Choose a secure password"
                      className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    At least 8 characters
                  </FormDescription>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* City/Region */}
            <FormField
              control={form.control}
              name="city_region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">City/Region *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Phoenix, AZ"
                      className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    Help us understand where our community is growing
                  </FormDescription>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">I'm primarily a...</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/50 border-white/20 text-white">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1a1a1a] border-white/20">
                      <SelectItem value="golfer">Golfer</SelectItem>
                      <SelectItem value="fitter_builder">Club Fitter/Builder</SelectItem>
                      <SelectItem value="creator">Content Creator</SelectItem>
                      <SelectItem value="league_captain">League Captain/Organizer</SelectItem>
                      <SelectItem value="retailer_other">Retailer/Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Golf Habits</CardTitle>
            <CardDescription className="text-white/60">
              Help us understand how you engage with golf equipment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Share Channels */}
            <FormField
              control={form.control}
              name="share_channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Where do you share golf content?</FormLabel>
                  <div className="space-y-2">
                    {shareChannelOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked
                              ? [...(field.value || []), option.value]
                              : field.value?.filter((v) => v !== option.value) || [];
                            field.onChange(updated);
                          }}
                          className="border-white/20"
                        />
                        <Label className="text-white/80 cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Learn Channels */}
            <FormField
              control={form.control}
              name="learn_channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Where do you learn about equipment?</FormLabel>
                  <div className="space-y-2">
                    {learnChannelOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked
                              ? [...(field.value || []), option.value]
                              : field.value?.filter((v) => v !== option.value) || [];
                            field.onChange(updated);
                          }}
                          className="border-white/20"
                        />
                        <Label className="text-white/80 cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Spend Bracket */}
            <FormField
              control={form.control}
              name="spend_bracket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Annual equipment spend</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/50 border-white/20 text-white">
                        <SelectValue placeholder="Select spend range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1a1a1a] border-white/20">
                      <SelectItem value="<300">Under $300</SelectItem>
                      <SelectItem value="300_750">$300 - $750</SelectItem>
                      <SelectItem value="750_1500">$750 - $1,500</SelectItem>
                      <SelectItem value="1500_3000">$1,500 - $3,000</SelectItem>
                      <SelectItem value="3000_5000">$3,000 - $5,000</SelectItem>
                      <SelectItem value="5000_plus">$5,000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Buy Frequency */}
            <FormField
              control={form.control}
              name="buy_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">How often do you buy equipment?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/50 border-white/20 text-white">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1a1a1a] border-white/20">
                      <SelectItem value="never">Never/Rarely</SelectItem>
                      <SelectItem value="yearly_1_2">1-2 times per year</SelectItem>
                      <SelectItem value="few_per_year">Few times per year</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly_plus">Weekly or more</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Share Frequency */}
            <FormField
              control={form.control}
              name="share_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">How often do you share golf content?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/50 border-white/20 text-white">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1a1a1a] border-white/20">
                      <SelectItem value="never">Never/Rarely</SelectItem>
                      <SelectItem value="yearly_1_2">1-2 times per year</SelectItem>
                      <SelectItem value="few_per_year">Few times per year</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly_plus">Weekly or more</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Platform Usage</CardTitle>
            <CardDescription className="text-white/60">
              What would you use Teed.club for?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Uses */}
            <FormField
              control={form.control}
              name="uses"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    {usesOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked
                              ? [...(field.value || []), option.value]
                              : field.value?.filter((v) => v !== option.value) || [];
                            field.onChange(updated);
                          }}
                          className="border-white/20"
                        />
                        <Label className="text-white/80 cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Terms and Submit */}
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="pt-6 space-y-4">
            {/* Terms Checkbox */}
            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 mt-1"
                      />
                    </FormControl>
                    <div className="grid gap-1.5 leading-none">
                      <FormLabel className="text-white/80 font-normal cursor-pointer">
                        I understand this is a beta product and agree to provide feedback to help improve the platform. *
                      </FormLabel>
                    </div>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Join the Waitlist'
              )}
            </Button>

            {/* Invite Code Field - Optional */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1a1a] px-2 text-white/40">have an invite?</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-code" className="text-white/60 text-sm flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Invite Code
              </Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => onInviteCodeChange(e.target.value)}
                placeholder="Enter your invite code (optional)"
                className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
              />
              {inviteCode && (
                <p className="text-xs text-emerald-400">✓ Invite code applied - skip the waitlist!</p>
              )}
              <p className="text-xs text-white/40">
                Beta members can share invite codes with friends
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Beta Info Link */}
        <div className="text-center mt-6">
          <a 
            href="/beta-info" 
            className="text-emerald-400 hover:text-emerald-300 text-sm underline underline-offset-4 transition-colors"
          >
            Learn more about how the beta works →
          </a>
        </div>
      </form>
    </Form>
  );
}