-- Clean HIL tables completely
USE product_management_system;

-- Drop tables in correct order (child tables first)
DROP TABLE IF EXISTS hil_booking_attendees;
DROP TABLE IF EXISTS hil_bookings;
DROP TABLE IF EXISTS hil_labs;

SELECT 'HIL tables cleaned successfully!' as message;