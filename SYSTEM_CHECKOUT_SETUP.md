# Auto Clock-Out System Setup

This feature automatically checks out users who forgot to clock out at 12:00 AM (midnight).

## How It Works

1. **Automatic Detection**: Finds all users who clocked in but didn't clock out on previous days
2. **System Check-Out**: Automatically checks them out at 11:59:59 PM of the clock-in day
3. **Location Preservation**: Uses the same location coordinates from their clock-in
4. **Approval Status**: Marks as "Approved" with reason "System automatic check-out at midnight"
5. **UI Integration**: Shows status in admin dashboard with manual execution option

## Files Modified/Created

- `src/app/api/attendance/auto-clock-out/route.js` - Enhanced API endpoint (updated)
- `scripts/system-checkout.js` - Node.js script to call the API (updated)
- `scripts/run-system-checkout.bat` - Windows batch file
- `src/app/admin-dashboard/page.jsx` - Added UI status component
- Added `auto-clock-out` script to package.json

## API Endpoint Details

**Endpoint**: `GET /api/attendance/auto-clock-out` (status) and `POST /api/attendance/auto-clock-out` (execute)

**GET Response Example**:
```json
{
  "todayActiveCount": 2,
  "pastPendingCount": 5,
  "activeAttendanceRecords": [
    {
      "Id": 123,
      "UserId": 456,
      "ClockInTime": "2024-01-20T09:15:00.000Z",
      "ClockInLocation": "Office",
      "Username": "john_doe",
      "FullName": "John Doe"
    }
  ],
  "message": "Use POST to execute auto clock-out",
  "needsAutoCheckout": true
}
```

**POST Response Example**:
```json
{
  "message": "Auto clock-out completed for 5 records",
  "processedCount": 5,
  "totalFound": 5,
  "updatedRecords": [...],
  "errors": [],
  "checkOutTime": "2024-01-21T00:00:00.000Z"
}
```

## UI Features in Admin Dashboard

1. **Status Dashboard**: Shows today's active users and pending auto check-outs
2. **Real-time Monitoring**: Displays list of users who need auto check-out
3. **Manual Execution**: Admin can run auto check-out manually with one click
4. **Visual Indicators**: Color-coded cards for different status types
5. **Error Handling**: Shows errors and processing status

## Setup Instructions

### Option 1: Manual Testing
```bash
# Test the auto clock-out manually
npm run auto-clock-out
```

### Option 2: UI Manual Execution
1. Login to admin dashboard
2. View "System Auto Clock-Out Status" section
3. Click "🚀 Run Auto Check-Out" button when needed

### Option 3: Windows Task Scheduler (Recommended)

1. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create New Task**:
   - Click "Create Task" in the Actions pane
   - Name: "Attendance Auto Clock-Out"
   - Description: "Automatically check out users who forgot to clock out at midnight"
   - Select "Run whether user is logged on or not"
   - Check "Run with highest privileges"

3. **Set Trigger**:
   - Go to "Triggers" tab
   - Click "New..."
   - Begin the task: "Daily"
   - Start time: "12:00:00 AM" (00:00:00)
   - Repeat task every: "1 day"
   - Click "OK"

4. **Set Action**:
   - Go to "Actions" tab
   - Click "New..."
   - Action: "Start a program"
   - Program/script: `D:\attendance\scripts\run-system-checkout.bat`
   - Click "OK"

5. **Settings**:
   - Go to "Settings" tab
   - Check "Stop the task if it runs longer than: 30 minutes"
   - Check "If the running task does not end when requested, force it to stop"
   - Click "OK"

6. **Test**:
   - Right-click the task and select "Run"
   - Check the output in the command window

## Database Changes

The auto clock-out updates the following fields:
- `ClockOutTime`: Set to 11:59:59 PM of the clock-in date
- `ClockOutLat`, `ClockOutLng`: Copied from clock-in coordinates
- `ClockOutLocation`: Same as clock-in location (with geocoding refresh)
- `SelfieOut`: Set to "SYSTEM_AUTO_CHECKOUT"
- `EarlyClockOut`: Set to 0 (false)
- `EarlyClockOutReason`: "System automatic check-out at midnight"
- `IsApproved`: Set to 1 (true)
- `ApprovalStatus`: "Approved"
- `ApprovalMessage`: "System automatic check-out completed"
- `IsSystemCheckout`: Set to 1 (true)
- `UpdatedAt`: Current timestamp

## Monitoring

### UI Monitoring
- Check admin dashboard for real-time status
- View pending users list
- Monitor execution results

### System Monitoring
- Check console logs for auto clock-out activity
- Review the Attendance table for records with `SelfieOut = 'SYSTEM_AUTO_CHECKOUT'`
- Monitor Task Scheduler history for any failures

## Troubleshooting

1. **Server Not Running**: Ensure your Next.js server is running on the configured port
2. **Database Connection**: Verify database connection is working
3. **Permission Issues**: Make sure the batch file has execute permissions
4. **Task Scheduler**: Check Task Scheduler history for error details
5. **UI Issues**: Refresh the admin dashboard page if status doesn't update

## Key Improvements

✅ **Enhanced Location Handling**: Preserves clock-in location and refreshes geocoding
✅ **Proper Time Management**: Uses 11:59:59 PM instead of midnight next day
✅ **System Status Tracking**: Shows detailed status in admin UI
✅ **Error Handling**: Comprehensive error reporting and logging
✅ **Manual Control**: Admin can execute manually when needed
✅ **Real-time Updates**: UI refreshes after execution
✅ **User Details**: Shows full user information in pending list
