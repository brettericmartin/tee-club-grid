#\!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("Testing Animation Integration...");

const filesToCheck = [
  "src/utils/animations.ts",
  "src/components/FeedItemCard.tsx",
  "src/components/shared/TeedBallLike.tsx",
  "src/components/ui/button.tsx",
  "tailwind.config.ts"
];

let hasErrors = false;

filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (\!fs.existsSync(filePath)) {
    console.error("File not found:", file);
    hasErrors = true;
    return;
  }
  
  const content = fs.readFileSync(filePath, "utf8");
  
  const checks = {
    "src/utils/animations.ts": ["useScrollAnimation", "golfBallBounce"],
    "src/components/FeedItemCard.tsx": ["useScrollAnimation", "opacity-100"],
    "src/components/shared/TeedBallLike.tsx": ["isAnimating", "animate-golf-bounce"],
    "src/components/ui/button.tsx": ["hover:shadow-", "transition-all"],
    "tailwind.config.ts": ["golf-bounce", "fade-in-up"]
  };
  
  const fileChecks = checks[file] || [];
  let fileOk = true;
  
  fileChecks.forEach(check => {
    if (\!content.includes(check)) {
      console.error("Missing code in", file, ":", check);
      hasErrors = true;
      fileOk = false;
    }
  });
  
  if (fileOk) {
    console.log("✅", file, "- OK");
  }
});

if (\!hasErrors) {
  console.log("All animation integrations verified\!");
}

process.exit(hasErrors ? 1 : 0);
