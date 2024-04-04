//require("dotenv").config({path:'./env'});
import dotenv from "dotenv";
import connectDB from "./db/index.database.js";
import { app } from "./app.js";

//After importing we have to config the dotenv
dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log("Server is running at port: ", process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("Error occured while connecting server: ", err);
  });
