import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected..!!! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection failed ", error);
    process.exit(1);
    /* The process.exit() method in Node.js is used to terminate the process
    with an exit code. the exit code either 1 or 0*/
  }
};

export default connectDB;
