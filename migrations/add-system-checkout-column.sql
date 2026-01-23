-- Add IsSystemCheckout column to Attendance table if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Attendance' AND COLUMN_NAME = 'IsSystemCheckout')
BEGIN
    ALTER TABLE Attendance 
    ADD IsSystemCheckout BIT DEFAULT 0;
    
    PRINT 'IsSystemCheckout column added successfully';
END
ELSE
BEGIN
    PRINT 'IsSystemCheckout column already exists';
END
