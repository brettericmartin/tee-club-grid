# Waitlist Administration Guide

## Overview

The enhanced Waitlist Admin interface provides powerful tools for managing beta access applications, including bulk operations, advanced filtering, CSV export, and wave approvals.

## Access Requirements

- Admin user account (verified via `admins` table)
- Authentication token
- Access URL: `/admin/waitlist`

## Key Features

### 1. Beta Capacity Monitoring

The dashboard displays real-time capacity metrics:

- **Beta Capacity**: Current users / Total capacity
- **Today's Approvals**: Number approved in the last 24 hours  
- **Remaining Slots**: Available slots before reaching capacity
- **Public Beta Status**: Enabled/Disabled indicator

**Important**: The system enforces capacity limits and will prevent approvals when at capacity.

### 2. Advanced Filtering

Filter applications using multiple criteria:

- **Search**: Email, name, or location text search
- **Status**: Pending, Approved, Rejected, or All
- **Score**: Minimum score threshold (0-10)
- **Referrals**: Minimum referral count
- **Date Range**: Application date from/to
- **Role**: Filter by user role (Golfer, Creator, Fitter/Builder, etc.)
- **Has Invite Code**: Show only applications with invite codes

### 3. Bulk Operations

#### Wave Approvals
1. Select multiple applications using checkboxes
2. Use "Select All" to select all visible pending applications
3. Click "Bulk Approve" to approve selected applications
4. System will:
   - Check capacity before processing
   - Update application status atomically
   - Grant beta access to users
   - Send approval emails with retry logic
   - Display progress and results

#### Bulk Rejection
1. Select applications to reject
2. Click "Bulk Reject"
3. Applications marked as rejected with reason logged

#### Email Batch Processing
- Emails sent in batches of 10 to avoid rate limits
- Automatic retry with exponential backoff (up to 3 attempts)
- Failed emails logged for manual review
- Progress tracking during batch operations

### 4. CSV Export

Export filtered application data to CSV:

1. Apply desired filters
2. Click "Export CSV" button
3. CSV includes:
   - Application details (ID, email, name, location)
   - Scores and referral counts
   - Status and timestamps
   - User answers and metadata

### 5. Sorting Options

Sort applications by:
- **Score**: Application score (default)
- **Date**: Application submission date
- **Referrals**: Total referral count

Toggle between ascending/descending order.

## API Endpoints

### Bulk Approve
```
POST /api/waitlist/bulk-approve
Authorization: Bearer {token}
Body: {
  applicationIds: string[],
  sendEmails?: boolean
}
```

### Bulk Reject
```
POST /api/waitlist/bulk-reject
Authorization: Bearer {token}
Body: {
  applicationIds: string[],
  reason?: string
}
```

### Export CSV
```
GET /api/waitlist/export
Authorization: Bearer {token}
Query Parameters:
  - status: pending|approved|rejected
  - minScore: number
  - minReferrals: number
  - dateFrom: ISO date string
  - dateTo: ISO date string
  - roles: comma-separated role list
```

## Best Practices

### Wave Approval Strategy

1. **Score-Based Waves**
   - Filter by minimum score (e.g., 8+)
   - Review high-value applications first
   - Approve in batches of 10-20

2. **Referral-Based Waves**
   - Prioritize users with high referral counts
   - Builds network effects
   - Rewards community builders

3. **Role-Based Waves**
   - Target specific user segments
   - Balance community composition
   - Strategic partner onboarding

### Capacity Management

1. **Monitor Daily Limits**
   - Check "Today's Approvals" metric
   - Spread approvals across days
   - Avoid overwhelming support

2. **Reserve Capacity**
   - Keep 10-20% capacity for special cases
   - VIP invites
   - Press/influencer access

3. **Soft vs Hard Limits**
   - System enforces hard capacity limit
   - Plan waves to stay under limit
   - Consider soft-deleted users in total count

### Email Management

1. **Batch Processing**
   - System automatically batches emails
   - 10 emails per batch with 1-second delay
   - Prevents rate limiting

2. **Retry Logic**
   - Failed emails retry up to 3 times
   - Exponential backoff (2s, 4s, 8s)
   - Review failed emails in logs

3. **Testing**
   - Use dev mode for testing (EMAIL_DEV_MODE=true)
   - Emails redirect to test recipient
   - Verify templates before bulk sends

## Troubleshooting

### Common Issues

1. **"At Capacity" Error**
   - Check current capacity in dashboard
   - Review soft-deleted users
   - Consider increasing beta_cap in feature_flags

2. **Email Sending Failures**
   - Check RESEND_API_KEY configuration
   - Review rate limits
   - Check email logs for specific errors

3. **Bulk Operation Timeouts**
   - Process smaller batches (< 50 at a time)
   - Check server logs for errors
   - Verify database connectivity

### Database Queries

Check current capacity:
```sql
SELECT 
  (SELECT beta_cap FROM feature_flags LIMIT 1) as capacity,
  COUNT(*) FILTER (WHERE beta_access = true AND deleted_at IS NULL) as active_users,
  COUNT(*) FILTER (WHERE beta_access = true) as total_users
FROM profiles;
```

Find high-score pending applications:
```sql
SELECT email, display_name, score, total_referrals
FROM waitlist_applications
WHERE status = 'pending' AND score >= 8
ORDER BY score DESC, total_referrals DESC
LIMIT 20;
```

## Security Considerations

1. **Admin Authentication**
   - All endpoints require admin verification
   - Token-based authentication
   - Activity logging recommended

2. **Audit Trail**
   - Bulk operations logged with admin ID
   - Timestamp all status changes
   - Maintain approval history

3. **Data Protection**
   - CSV exports contain PII
   - Secure file handling required
   - Delete exports after use

## Performance Tips

1. **Filtering**
   - Use specific filters to reduce dataset
   - Combine filters for precise targeting
   - Export smaller batches for faster processing

2. **Bulk Operations**
   - Process 20-50 applications at a time
   - Monitor server resources during bulk ops
   - Schedule large operations during off-peak

3. **Regular Maintenance**
   - Archive old rejected applications
   - Clean up test data periodically
   - Monitor database performance

## Support

For issues or questions:
- Check server logs at `/api/logs/waitlist`
- Review email delivery status in Resend dashboard
- Contact dev team for database or capacity issues