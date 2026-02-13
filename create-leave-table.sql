-- Create LeaveRequest table
CREATE TABLE LeaveRequests (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    leaveType VARCHAR(50) NOT NULL,
    startDate DATETIME2 NOT NULL,
    endDate DATETIME2 NOT NULL,
    reason TEXT NOT NULL,
    leaveDuration VARCHAR(20) NOT NULL DEFAULT 'full', -- 'full', 'firstHalf', 'secondHalf'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (userId) REFERENCES Users(id)
);

-- Create index for better performance
CREATE INDEX IX_LeaveRequests_UserId ON LeaveRequests(userId);
CREATE INDEX IX_LeaveRequests_Status ON LeaveRequests(status);
CREATE INDEX IX_LeaveRequests_CreatedAt ON LeaveRequests(createdAt DESC);
