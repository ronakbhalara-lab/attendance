-- Add system checkout flag to Attendance table
ALTER TABLE Attendance ADD IsSystemCheckout BIT DEFAULT 0;
