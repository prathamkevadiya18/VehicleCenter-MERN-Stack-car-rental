const Booking = require('../models/Booking');
const Car = require('../models/Car');

/**
 * Automatically completes confirmed or pending bookings whose drop-off date has passed,
 * and sets the associated car's availability status to available.
 */
const autoCompleteBookings = async () => {
  try {
    const now = new Date();
    // Find bookings that are Pending or Confirmed but the dropoffDate has passed
    const expiredBookings = await Booking.find({
      status: { $in: ['Pending', 'Confirmed'] },
      dropoffDate: { $lte: now }
    });

    if (expiredBookings.length > 0) {
      console.log(`[Auto-Complete] Found ${expiredBookings.length} expired bookings to process.`);
      for (const booking of expiredBookings) {
        booking.status = 'Completed';
        await booking.save();

        const car = await Car.findById(booking.car);
        if (car) {
          car.availability.isAvailable = true;
          await car.save();
          console.log(`[Auto-Complete] Set car "${car.name}" availability to true (completed booking ${booking._id}).`);
        }
      }
    }
  } catch (error) {
    console.error('[Auto-Complete] Error auto-completing expired bookings:', error);
  }
};

module.exports = {
  autoCompleteBookings
};
