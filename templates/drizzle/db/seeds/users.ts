import { DB } from "../index";
import bcrypt from "bcryptjs";
import { users as usersSchema } from "../schemas/users";

const users = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    hashPassword: "password",
  },
];

export default async function seedUsers(db: DB) {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.hashPassword, 10);
    await db
      .insert(usersSchema)
      .values({
        ...user,
        hashPassword: hashedPassword,
      })
      .onConflictDoNothing();
  }
}
