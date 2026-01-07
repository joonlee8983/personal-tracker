import { prisma } from "./prisma";
import { Resend } from "resend";
import type { DigestData, DigestItem } from "@todo/shared";
import { startOfDay, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const TIMEZONE = process.env.DIGEST_TIMEZONE || "America/Los_Angeles";

/**
 * Generate digest data for a user
 */
export async function generateDigestData(userId: string): Promise<DigestData> {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIMEZONE);
  const todayStart = startOfDay(zonedNow);
  const todayEnd = endOfDay(zonedNow);

  // Get top priorities (P0 and P1 items that are active)
  const topPriorities = await prisma.item.findMany({
    where: {
      userId,
      status: "active",
      priority: { in: ["P0", "P1"] },
    },
    orderBy: [
      { priority: "asc" }, // P0 first
      { createdAt: "asc" },
    ],
    take: 5,
  });

  // Get items due today
  const dueToday = await prisma.item.findMany({
    where: {
      userId,
      status: "active",
      dueAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { dueAt: "asc" },
  });

  // Get overdue items
  const overdue = await prisma.item.findMany({
    where: {
      userId,
      status: "active",
      dueAt: {
        lt: todayStart,
      },
    },
    orderBy: { dueAt: "asc" },
    take: 10,
  });

  // Get total active count
  const totalActive = await prisma.item.count({
    where: {
      userId,
      status: "active",
    },
  });

  const mapToDigestItem = (item: {
    id: string;
    title: string;
    type: string;
    priority: string | null;
    dueAt: Date | null;
  }): DigestItem => ({
    id: item.id,
    title: item.title,
    type: item.type as DigestItem["type"],
    priority: item.priority as DigestItem["priority"],
    dueAt: item.dueAt?.toISOString() || null,
  });

  return {
    date: format(zonedNow, "yyyy-MM-dd"),
    topPriorities: topPriorities.map(mapToDigestItem),
    dueToday: dueToday.map(mapToDigestItem),
    overdue: overdue.map(mapToDigestItem),
    totalActive,
  };
}

/**
 * Format digest data as markdown content
 */
export function formatDigestContent(data: DigestData): string {
  const lines: string[] = [];

  lines.push(`# 📋 Daily Digest - ${format(new Date(data.date), "EEEE, MMMM d, yyyy")}`);
  lines.push("");

  // Summary
  lines.push(`You have **${data.totalActive}** active items.`);
  lines.push("");

  // Top Priorities
  if (data.topPriorities.length > 0) {
    lines.push("## 🎯 Top Priorities");
    lines.push("");
    data.topPriorities.forEach((item, i) => {
      const priority = item.priority ? `[${item.priority}]` : "";
      lines.push(`${i + 1}. ${priority} **${item.title}**`);
    });
    lines.push("");
  }

  // Due Today
  if (data.dueToday.length > 0) {
    lines.push("## 📅 Due Today");
    lines.push("");
    data.dueToday.forEach((item) => {
      const time = item.dueAt
        ? format(new Date(item.dueAt), "h:mm a")
        : "";
      lines.push(`- ${time ? `⏰ ${time} - ` : ""}**${item.title}**`);
    });
    lines.push("");
  } else {
    lines.push("## 📅 Due Today");
    lines.push("");
    lines.push("_No items due today. Nice!_");
    lines.push("");
  }

  // Overdue
  if (data.overdue.length > 0) {
    lines.push("## ⚠️ Overdue");
    lines.push("");
    data.overdue.forEach((item) => {
      const dueDate = item.dueAt
        ? format(new Date(item.dueAt), "MMM d")
        : "";
      lines.push(`- ${dueDate ? `(Due ${dueDate}) ` : ""}**${item.title}**`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push("_Have a productive day! 🚀_");

  return lines.join("\n");
}

/**
 * Format digest as HTML for email
 */
export function formatDigestHtml(data: DigestData): string {
  const sections: string[] = [];

  sections.push(`
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">📋 Daily Digest</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 24px;">${format(new Date(data.date), "EEEE, MMMM d, yyyy")}</p>
    <p style="color: #333; font-size: 16px; margin-bottom: 24px;">You have <strong>${data.totalActive}</strong> active items.</p>
  `);

  if (data.topPriorities.length > 0) {
    sections.push(`
      <h2 style="color: #1a1a1a; font-size: 18px; margin: 24px 0 12px;">🎯 Top Priorities</h2>
      <ol style="padding-left: 20px; margin: 0;">
        ${data.topPriorities
          .map(
            (item) => `
          <li style="margin: 8px 0; color: #333;">
            ${item.priority ? `<span style="color: ${item.priority === "P0" ? "#dc2626" : "#f59e0b"}; font-weight: 600;">[${item.priority}]</span> ` : ""}
            <strong>${item.title}</strong>
          </li>
        `
          )
          .join("")}
      </ol>
    `);
  }

  if (data.dueToday.length > 0) {
    sections.push(`
      <h2 style="color: #1a1a1a; font-size: 18px; margin: 24px 0 12px;">📅 Due Today</h2>
      <ul style="padding-left: 20px; margin: 0; list-style-type: none;">
        ${data.dueToday
          .map(
            (item) => `
          <li style="margin: 8px 0; color: #333;">
            ${item.dueAt ? `⏰ ${format(new Date(item.dueAt), "h:mm a")} - ` : ""}
            <strong>${item.title}</strong>
          </li>
        `
          )
          .join("")}
      </ul>
    `);
  } else {
    sections.push(`
      <h2 style="color: #1a1a1a; font-size: 18px; margin: 24px 0 12px;">📅 Due Today</h2>
      <p style="color: #666; font-style: italic;">No items due today. Nice!</p>
    `);
  }

  if (data.overdue.length > 0) {
    sections.push(`
      <h2 style="color: #dc2626; font-size: 18px; margin: 24px 0 12px;">⚠️ Overdue</h2>
      <ul style="padding-left: 20px; margin: 0; list-style-type: none;">
        ${data.overdue
          .map(
            (item) => `
          <li style="margin: 8px 0; color: #dc2626;">
            ${item.dueAt ? `(Due ${format(new Date(item.dueAt), "MMM d")}) ` : ""}
            <strong>${item.title}</strong>
          </li>
        `
          )
          .join("")}
      </ul>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${sections.join("")}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #666; font-size: 14px; text-align: center;">Have a productive day! 🚀</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send digest email
 */
export async function sendDigestEmail(
  userEmail: string,
  data: DigestData
): Promise<boolean> {
  if (!resend) {
    console.warn("Resend not configured, skipping email");
    return false;
  }

  const html = formatDigestHtml(data);

  await resend.emails.send({
    from: process.env.DIGEST_FROM_EMAIL || "Todo App <onboarding@resend.dev>",
    to: userEmail,
    subject: `📋 Your Daily Digest - ${format(new Date(data.date), "MMM d")}`,
    html,
  });

  return true;
}

/**
 * Run digest for a specific user
 */
export async function runDigestForUser(
  userId: string,
  sendEmail: boolean = true
): Promise<{ digestLog: { id: string }; emailSent: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const data = await generateDigestData(userId);
  const content = formatDigestContent(data);
  const itemsIncluded = [
    ...data.topPriorities.map((i) => i.id),
    ...data.dueToday.map((i) => i.id),
    ...data.overdue.map((i) => i.id),
  ];

  // Check for existing digest today
  const existingDigest = await prisma.digestLog.findUnique({
    where: {
      userId_date: {
        userId,
        date: new Date(data.date),
      },
    },
  });

  let emailSent = false;

  if (sendEmail && user?.email && resend) {
    try {
      emailSent = await sendDigestEmail(user.email, data);
    } catch (error) {
      console.error("Failed to send digest email:", error);
    }
  }

  // Create or update digest log
  const digestLog = existingDigest
    ? await prisma.digestLog.update({
        where: { id: existingDigest.id },
        data: {
          content,
          itemsIncluded,
          sentAt: emailSent ? new Date() : existingDigest.sentAt,
          sentVia: emailSent ? "email" : "in_app",
        },
      })
    : await prisma.digestLog.create({
        data: {
          userId,
          date: new Date(data.date),
          content,
          itemsIncluded,
          sentAt: emailSent ? new Date() : null,
          sentVia: emailSent ? "email" : "in_app",
        },
      });

  return { digestLog: { id: digestLog.id }, emailSent };
}

/**
 * Run digest for all users (called by cron)
 */
export async function runDigestForAllUsers(): Promise<{
  processed: number;
  errors: number;
}> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;

  for (const user of users) {
    try {
      await runDigestForUser(user.id);
      processed++;
    } catch (error) {
      console.error(`Failed to run digest for user ${user.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

