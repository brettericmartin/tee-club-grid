# Teed.club - Golf Equipment Social Network

A React-based social platform for golf enthusiasts to showcase their equipment, share photos, and connect with the community.

## Features

- **Equipment Management**: Browse and manage your golf equipment collection
- **Social Feed**: Share photos and updates with the golf community
- **Forum System**: Discuss equipment, tips, and golf topics
- **Badge System**: Earn achievements and recognition
- **Equipment Browser**: Discover new golf equipment and brands
- **User Profiles**: Showcase your golf setup and achievements

## Tech Stack

- **Frontend**: Vite + TypeScript + React
- **UI Components**: shadcn-ui + Tailwind CSS
- **Database**: Supabase
- **State Management**: TanStack Query
- **Routing**: React Router
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/brettericmartin/tee-club-grid.git
cd tee-club-grid
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Add your Supabase credentials to .env.local
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3333`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run scrape:all` - Run equipment scraping scripts

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components and routes
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── types/         # TypeScript type definitions
└── styles/        # Global styles and Tailwind config
```

## Deployment

This project can be deployed to any static hosting service:

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables in Vercel dashboard

### Netlify
1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify dashboard

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m "Add your feature"`
4. Push to your branch: `git push origin feature/your-feature`
5. Create a Pull Request

## License

This project is private and proprietary.
