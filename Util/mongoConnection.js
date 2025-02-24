import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: process.env.DB_NAME })
    .then(async (data) => {
      console.log("Database Connected successfully!");
    })
    .catch((err) => {
      throw err;
    });
};

// Drop the entire database put it at line 8
// await mongoose.connection.db.dropDatabase();
// console.log("Database dropped");

// const advocateAvailability = [
//   { day: "sun", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "mon", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "tues", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "wed", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "thur", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "fri", available: true, timePeriod: "10:00AM-06:00PM" },
//   { day: "sat", available: true, timePeriod: "10:00AM-06:00PM" },
// ];

// async function updateExistingUsers() {
//   try {
//     const result = await User.updateMany({},
//       { $set: { advocateAvailability } }
//     );
//     console.log(`${result.modifiedCount} documents updated.`);
//   } catch (error) {
//     console.error("Error updating documents:", error);
//   }
// }

// updateExistingUsers();

export { connectDB };
