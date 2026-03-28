const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const tmplPath = path.resolve('c:/Users/sreen/Documents/Choppers/views/adminBookings.ejs');
const templateStr = fs.readFileSync(tmplPath, 'utf8');

const bookingsMock = [{
  _id: { toString: () => "abcdefg12345" },
  status: 'Pending',
  totalFare: 500,
  passengers: 2,
  flightDate: '2026-12-01',
  flightTime: '10:00 AM'
}];

try {
  const rendered = ejs.render(templateStr, { bookings: bookingsMock, user: { role: 'admin', name: 'Admin' } }, { filename: tmplPath });
  console.log("Success, no error. Output snippet:");
  console.log(rendered.substring(0, 100));
} catch (err) {
  console.error("EJS Error Output:");
  console.error(err.message);
}
