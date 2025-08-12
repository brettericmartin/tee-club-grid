import { motion } from "framer-motion";
import { BarChart3, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GappingChartProps {
  equipment: Array<{
    loft?: string;
    equipment: {
      category: string;
      model: string;
      brand: string;
    };
    custom_specs?: any;
  }>;
}

// Default yardages by club type (can be customized later)
const DEFAULT_DISTANCES: Record<string, number> = {
  driver: 250,
  "3_wood": 230,
  "5_wood": 215,
  "3_hybrid": 210,
  "4_hybrid": 200,
  "5_hybrid": 190,
  "3_iron": 190,
  "4_iron": 180,
  "5_iron": 170,
  "6_iron": 160,
  "7_iron": 150,
  "8_iron": 140,
  "9_iron": 130,
  "pw": 120,
  "gw": 105,
  "sw": 90,
  "lw": 75,
  putter: 0,
};

const CLUB_LABELS: Record<string, string> = {
  driver: "D",
  "3_wood": "3W",
  "5_wood": "5W",
  "3_hybrid": "3H",
  "4_hybrid": "4H",
  "5_hybrid": "5H",
  "3_iron": "3i",
  "4_iron": "4i",
  "5_iron": "5i",
  "6_iron": "6i",
  "7_iron": "7i",
  "8_iron": "8i",
  "9_iron": "9i",
  pw: "PW",
  gw: "GW",
  sw: "SW",
  lw: "LW",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-emerald-950/95 backdrop-blur-sm border border-emerald-500/30 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold">{data.fullName}</p>
        <p className="text-emerald-300 text-sm">
          {data.distance} yards
          {data.loft && ` • ${data.loft}°`}
        </p>
      </div>
    );
  }
  return null;
};

const GappingChart = ({ equipment }: GappingChartProps) => {
  // Filter and process club data
  const clubData = equipment
    .filter(item => {
      const category = item.equipment.category;
      return ["driver", "fairway_wood", "hybrid", "iron", "wedge", "putter"].includes(category);
    })
    .map(item => {
      const category = item.equipment.category;
      const model = item.equipment.model.toLowerCase();
      
      // Determine club type
      let clubKey = category;
      if (category === "iron" || category === "wedge") {
        // Extract club number/type from model name
        if (model.includes("pw") || model.includes("pitching")) clubKey = "pw";
        else if (model.includes("gw") || model.includes("gap")) clubKey = "gw";
        else if (model.includes("sw") || model.includes("sand")) clubKey = "sw";
        else if (model.includes("lw") || model.includes("lob")) clubKey = "lw";
        else if (model.match(/\b3\b/)) clubKey = "3_iron";
        else if (model.match(/\b4\b/)) clubKey = "4_iron";
        else if (model.match(/\b5\b/)) clubKey = "5_iron";
        else if (model.match(/\b6\b/)) clubKey = "6_iron";
        else if (model.match(/\b7\b/)) clubKey = "7_iron";
        else if (model.match(/\b8\b/)) clubKey = "8_iron";
        else if (model.match(/\b9\b/)) clubKey = "9_iron";
      } else if (category === "fairway_wood") {
        if (model.includes("3")) clubKey = "3_wood";
        else if (model.includes("5")) clubKey = "5_wood";
      } else if (category === "hybrid") {
        if (model.includes("3")) clubKey = "3_hybrid";
        else if (model.includes("4")) clubKey = "4_hybrid";
        else if (model.includes("5")) clubKey = "5_hybrid";
      }

      return {
        name: CLUB_LABELS[clubKey] || item.equipment.model.substring(0, 3),
        fullName: `${item.equipment.brand} ${item.equipment.model}`,
        distance: item.custom_specs?.distance || DEFAULT_DISTANCES[clubKey] || 0,
        loft: item.loft,
        category,
        order: Object.keys(DEFAULT_DISTANCES).indexOf(clubKey),
      };
    })
    .filter(item => item.distance > 0)
    .sort((a, b) => b.distance - a.distance);

  if (clubData.length === 0) {
    return null;
  }

  // Calculate gapping
  const gaps = clubData.slice(0, -1).map((club, index) => {
    const nextClub = clubData[index + 1];
    return club.distance - nextClub.distance;
  });
  const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  // Color gradient for bars
  const getBarColor = (index: number) => {
    const colors = [
      "#10b981", // emerald-500
      "#34d399", // emerald-400
      "#6ee7b7", // emerald-300
      "#a7f3d0", // emerald-200
    ];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <h3 className="text-2xl font-bold text-white">Distance Gapping</h3>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
          Avg gap: {avgGap} yards
        </Badge>
      </div>

      <div className="bg-emerald-950/30 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={clubData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#065f46" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#6ee7b7"
              tick={{ fill: "#6ee7b7" }}
              axisLine={{ stroke: "#065f46" }}
            />
            <YAxis
              stroke="#6ee7b7"
              tick={{ fill: "#6ee7b7" }}
              axisLine={{ stroke: "#065f46" }}
              label={{
                value: "Yards",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6ee7b7" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="distance" radius={[8, 8, 0, 0]}>
              {clubData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Gap Analysis */}
        <div className="mt-6 pt-6 border-t border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-200">Gap Analysis</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gaps.map((gap, index) => {
              const isGood = gap >= 10 && gap <= 20;
              const club = clubData[index];
              const nextClub = clubData[index + 1];
              
              return (
                <div
                  key={index}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm",
                    "bg-emerald-500/10 border",
                    isGood ? "border-emerald-500/30" : "border-yellow-500/30"
                  )}
                >
                  <span className="text-emerald-300">
                    {club.name} → {nextClub.name}
                  </span>
                  <span className={cn(
                    "ml-2 font-semibold",
                    isGood ? "text-emerald-400" : "text-yellow-400"
                  )}>
                    {gap}y
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GappingChart;