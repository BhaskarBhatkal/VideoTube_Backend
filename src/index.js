//require("dotenv").config({path:'./env'});
import dotenv from "dotenv";
import connectDB from "./db/index.database.js";
import express from "express";

dotenv.config({
  path: "./env",
});

connectDB();
