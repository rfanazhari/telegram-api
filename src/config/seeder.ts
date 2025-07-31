import { AppDataSource } from "./data-source";
import { User } from "../entities/User";
import { hashPassword } from "../utils/password";

/**
 * Seed the database with initial user data
 */
export const seedUsers = async (): Promise<void> => {
  try {
    // Initialize the data source if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    
    // Check if users already exist
    const userCount = await userRepository.count();
    if (userCount > 0) {
      console.log("Users already exist, skipping seeding");
      return;
    }

    // Create test users
    const users = [
      {
        email: "user1@example.com",
        msisdn: "6281234567890",
        password: "password123",
        telegram_id: `null`
      },
      {
        email: "user2@example.com",
        msisdn: "6281234567891",
        password: "password123",
        telegram_id: `null`
      },
      {
        email: "admin@example.com",
        msisdn: "6281234567892",
        password: "admin123",
        telegram_id: `null`
      }
    ];

    // Hash passwords and save users
    for (const userData of users) {
      const user = new User();
      user.email = userData.email;
      user.msisdn = userData.msisdn;
      user.password_hash = await hashPassword(userData.password);
      user.telegram_id = userData.telegram_id;

      await userRepository.save(user);
    }

    console.log("User seeding completed successfully");
  } catch (error) {
    console.error("Error seeding users:", error);
    throw error;
  }
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}