const bcrypt = require('bcryptjs');
const password = 'tm123!@#'; // Replace with desired password
const hashedPassword = bcrypt.hashSync(password, 10);
console.log(hashedPassword);
