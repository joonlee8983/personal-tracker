import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    },
  });

  console.log(`✅ Created user: ${user.email}`);

  // Create some sample items
  const sampleItems = [
    {
      type: "todo" as const,
      title: "Review quarterly report",
      details: "Check the Q4 financials and prepare summary",
      priority: "P1" as const,
      tags: ["work", "finance"],
      sourceType: "text" as const,
      sourceText: "Review quarterly report, check the Q4 financials",
      agentConfidence: 0.92,
    },
    {
      type: "reminder" as const,
      title: "Team standup meeting",
      details: "Daily standup at 10am",
      dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      priority: "P0" as const,
      tags: ["work", "meetings"],
      sourceType: "voice" as const,
      sourceText: "Remind me about the team standup meeting in 2 hours",
      agentConfidence: 0.95,
    },
    {
      type: "idea" as const,
      title: "Build a personal knowledge base",
      details: "Create a system to capture and organize learnings from books and articles",
      tags: ["personal", "productivity"],
      sourceType: "text" as const,
      sourceText: "I have an idea to build a personal knowledge base for capturing learnings",
      agentConfidence: 0.88,
    },
    {
      type: "note" as const,
      title: "Restaurant recommendation: Sushi Nakazawa",
      details: "Highly recommended omakase experience. Book 2 weeks in advance.",
      tags: ["food", "personal"],
      sourceType: "text" as const,
      sourceText: "Note: Sushi Nakazawa is highly recommended for omakase, book 2 weeks ahead",
      agentConfidence: 0.91,
    },
    {
      type: "todo" as const,
      title: "Fix login page styling",
      details: null,
      priority: "P2" as const,
      tags: ["work", "bugs"],
      sourceType: "text" as const,
      sourceText: "Fix the login page styling issues",
      agentConfidence: 0.75,
      needsReview: true,
    },
  ];

  for (const item of sampleItems) {
    await prisma.item.create({
      data: {
        userId: user.id,
        ...item,
        agentRawJson: item,
      },
    });
  }

  console.log(`✅ Created ${sampleItems.length} sample items`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

