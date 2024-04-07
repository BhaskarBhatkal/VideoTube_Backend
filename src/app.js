import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//set the CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

//When the data comes from JSON
app.use(
  express.json({
    limit: "20kb",
  })
);
//sometime we access data from url, in url automatically adds characters in middle, so for encoding those we use this
app.use(express.urlencoded());
app.use(express.static("public "));
app.use(cookieParser());

//Routes Import
import userRouter from "./routes/user.route.js";

// Routes declaration
app.use("/api/v1/users", userRouter);
export { app };
