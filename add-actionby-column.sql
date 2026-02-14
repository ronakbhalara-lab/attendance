-- Add actionBy column to LeaveRequests table
-- This column will track who performed the action (employee or admin)

ALTER TABLE LeaveRequests 
ADD actionBy VARCHAR(20) NULL;

-- Update existing records to have default actionBy
-- For existing approved/rejected records, we'll set actionBy to 'admin'
-- For existing pending records, we'll leave it as NULL
UPDATE LeaveRequests 
SET actionBy = 'admin' 
WHERE status IN ('approved', 'rejected') AND actionBy IS NULL;
