import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";
  const adminName = "Admin User";

  console.log("🔐 Creating admin user...");

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("⚠️  Admin user already exists. Updating password and role...");
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Update existing admin
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("✅ Admin user updated!");
    console.log("");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", adminPassword);
    console.log("");
    console.log("⚠️  Please change the password after first login!");
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      },
    });

    // Create default list for admin
    await prisma.list.create({
      data: {
        name: "My Groceries",
        ownerUserId: admin.id,
      },
    });

    console.log("✅ Admin user created!");
    console.log("");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", adminPassword);
    console.log("");
    console.log("⚠️  Please change the password after first login!");
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to create admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
