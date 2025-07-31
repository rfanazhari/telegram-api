import "reflect-metadata";
import { DataSource } from "typeorm";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the data source
export const AppDataSource = new DataSource({
  type: "sqlite",
  database: process.env.DB_PATH || join(__dirname, "../../data/database.sqlite"),
  synchronize: process.env.NODE_ENV === "development", // Auto-create database schema in development
  logging: process.env.NODE_ENV === "development",
  entities: [join(__dirname, "../entities/**/*.{ts,js}")],
  migrations: [join(__dirname, "../migrations/**/*.{ts,js}")],
  subscribers: [join(__dirname, "../subscribers/**/*.{ts,js}")],
});

// Initialize the data source
export const initializeDataSource = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
    }
    return AppDataSource;
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
};