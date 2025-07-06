import proTournamentEquipment from "@/assets/pro-tournament-equipment.jpg";
import weekendWarriorEquipment from "@/assets/weekend-warrior-equipment.jpg";
import minimalistEquipment from "@/assets/minimalist-equipment.jpg";
import vintageEquipment from "@/assets/vintage-equipment.jpg";

export interface BagData {
  id: string;
  title: string;
  owner: string;
  handicap: number;
  totalValue: number;
  clubCount: number;
  likeCount: number;
  image: string;
  isLiked?: boolean;
  isHot?: boolean;
  brands: string[];
}

export const sampleBags: BagData[] = [
  {
    id: "1",
    title: "Pro's Tournament Bag",
    owner: "Marcus Johnson",
    handicap: 2,
    totalValue: 8500,
    clubCount: 14,
    likeCount: 247,
    image: proTournamentEquipment,
    isLiked: false,
    isHot: true,
    brands: ["TaylorMade", "Titleist", "Scotty Cameron"],
  },
  {
    id: "2",
    title: "Weekend Warrior Setup",
    owner: "Sarah Chen",
    handicap: 12,
    totalValue: 3200,
    clubCount: 14,
    likeCount: 189,
    image: weekendWarriorEquipment,
    isLiked: true,
    isHot: false,
    brands: ["Callaway", "Ping", "Odyssey"],
  },
  {
    id: "3",
    title: "Minimalist Carry Bag",
    owner: "David Park",
    handicap: 8,
    totalValue: 1800,
    clubCount: 8,
    likeCount: 156,
    image: minimalistEquipment,
    isLiked: false,
    isHot: false,
    brands: ["Cobra", "Cleveland", "L.A.B. Golf"],
  },
  {
    id: "4",
    title: "Vintage Collection",
    owner: "Robert Thompson",
    handicap: 5,
    totalValue: 12000,
    clubCount: 14,
    likeCount: 312,
    image: vintageEquipment,
    isLiked: false,
    isHot: true,
    brands: ["Titleist", "Mizuno", "Ping"],
  },
  // Duplicate some bags with variations for a fuller feed
  {
    id: "5",
    title: "Tour Pro's Arsenal",
    owner: "Elena Rodriguez",
    handicap: 1,
    totalValue: 9200,
    clubCount: 14,
    likeCount: 298,
    image: proTournamentEquipment,
    isLiked: true,
    isHot: true,
    brands: ["TaylorMade", "Titleist", "Scotty Cameron"],
  },
  {
    id: "6",
    title: "Sunday Best Bag",
    owner: "Mike O'Connor",
    handicap: 15,
    totalValue: 2800,
    clubCount: 12,
    likeCount: 134,
    image: weekendWarriorEquipment,
    isLiked: false,
    isHot: false,
    brands: ["Callaway", "Ping", "Odyssey"],
  },
  {
    id: "7",
    title: "Walking Course Setup",
    owner: "Jennifer Lee",
    handicap: 10,
    totalValue: 2100,
    clubCount: 9,
    likeCount: 167,
    image: minimalistEquipment,
    isLiked: false,
    isHot: false,
    brands: ["Cobra", "Cleveland", "L.A.B. Golf"],
  },
  {
    id: "8",
    title: "Heritage Collection",
    owner: "William Brown",
    handicap: 7,
    totalValue: 15000,
    clubCount: 14,
    likeCount: 398,
    image: vintageEquipment,
    isLiked: true,
    isHot: true,
    brands: ["Titleist", "Mizuno", "Ping"],
  },
];