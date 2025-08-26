import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ExportRequest {
  status?: 'pending' | 'approved' | 'rejected';
  minReferrals?: number;
  minScore?: number;
  dateFrom?: string;
  dateTo?: string;
  roles?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Parse query parameters
    const { status, minReferrals, minScore, dateFrom, dateTo, roles } = req.query as any;

    // Build query
    let query = supabase
      .from('waitlist_applications')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (minScore && !isNaN(Number(minScore))) {
      query = query.gte('score', Number(minScore));
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: applications, error: fetchError } = await query;

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }

    // Additional filtering for complex conditions
    let filteredApplications = applications || [];

    if (minReferrals && !isNaN(Number(minReferrals))) {
      filteredApplications = filteredApplications.filter(app => 
        (app.total_referrals || 0) >= Number(minReferrals)
      );
    }

    if (roles && Array.isArray(roles) && roles.length > 0) {
      filteredApplications = filteredApplications.filter(app => {
        const answers = app.answers as any;
        return answers?.role && roles.includes(answers.role);
      });
    }

    // Convert to CSV
    const csv = convertToCSV(filteredApplications);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="waitlist-export-${Date.now()}.csv"`);
    
    return res.status(200).send(csv);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

function convertToCSV(applications: any[]): string {
  if (applications.length === 0) {
    return 'No data to export';
  }

  // Define CSV columns
  const headers = [
    'ID',
    'Email',
    'Display Name',
    'Status',
    'Score',
    'Total Referrals',
    'Direct Referrals',
    'Indirect Referrals',
    'Role',
    'City/Region',
    'Handicap',
    'Referred By',
    'Invite Code',
    'Applied At',
    'Approved At',
    'IP Address',
    'User Agent'
  ];

  // Build CSV rows
  const rows = applications.map(app => {
    const answers = app.answers as any || {};
    
    return [
      app.id,
      app.email,
      app.display_name || '',
      app.status,
      app.score || 0,
      app.total_referrals || 0,
      app.direct_referrals || 0,
      app.indirect_referrals || 0,
      answers.role || '',
      answers.cityRegion || '',
      answers.handicap || '',
      app.referred_by || '',
      app.invite_code || '',
      formatDate(app.created_at),
      app.approved_at ? formatDate(app.approved_at) : '',
      app.ip_address || '',
      app.user_agent || ''
    ].map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // Escape if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').slice(0, -5);
  } catch {
    return dateStr;
  }
}