-- Add location name columns to Attendance table
ALTER TABLE Attendance ADD ClockInLocation VARCHAR(500) NULL;
ALTER TABLE Attendance ADD ClockOutLocation VARCHAR(500) NULL;
