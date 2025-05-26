import { setupDB } from "..";
import seedUsers from "./users";
import { env } from "@/env";

export default async function seedDev() {
  const { db, dbClient } = await setupDB(env.DATABASE_URL);
  await seedUsers(db);

  dbClient.end();
}

seedDev();
