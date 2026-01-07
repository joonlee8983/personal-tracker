import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "./prisma";

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a single token
 */
export async function sendPushNotification(
  expoPushToken: string,
  payload: PushPayload
): Promise<boolean> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`Invalid Expo push token: ${expoPushToken}`);
    return false;
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
  };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    
    if (ticket.status === "error") {
      console.error(`Push notification error: ${ticket.message}`);
      
      // Handle invalid tokens
      if (ticket.details?.error === "DeviceNotRegistered") {
        await disablePushToken(expoPushToken);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}

/**
 * Send push notifications to multiple tokens
 */
export async function sendPushNotifications(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
  
  if (validTokens.length === 0) {
    return { success: 0, failed: tokens.length };
  }

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  // Chunk messages for batch sending
  const chunks = expo.chunkPushNotifications(messages);
  let success = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "ok") {
          success++;
        } else {
          failed++;
          
          // Handle invalid tokens
          if (ticket.details?.error === "DeviceNotRegistered") {
            const token = (chunk[i] as ExpoPushMessage).to;
            if (typeof token === "string") {
              await disablePushToken(token);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send push notification chunk:", error);
      failed += chunk.length;
    }
  }

  return { success, failed };
}

/**
 * Disable a push token (mark as invalid)
 */
async function disablePushToken(expoPushToken: string): Promise<void> {
  await prisma.devicePushToken.updateMany({
    where: { expoPushToken },
    data: { isEnabled: false },
  });
}

/**
 * Register or update a push token for a user
 */
export async function registerPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
  deviceName?: string,
  deviceId?: string
): Promise<void> {
  // Upsert the push token
  await prisma.devicePushToken.upsert({
    where: { expoPushToken },
    create: {
      userId,
      expoPushToken,
      platform,
      deviceName,
      deviceId,
      isEnabled: true,
    },
    update: {
      userId, // Transfer ownership if token was registered to different user
      platform,
      deviceName,
      deviceId,
      isEnabled: true,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Unregister a push token
 */
export async function unregisterPushToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  await prisma.devicePushToken.deleteMany({
    where: {
      userId,
      expoPushToken,
    },
  });
}

/**
 * Get all enabled push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const tokens = await prisma.devicePushToken.findMany({
    where: {
      userId,
      isEnabled: true,
    },
    select: {
      expoPushToken: true,
    },
  });

  return tokens.map((t) => t.expoPushToken);
}

/**
 * Send daily digest push to a user
 */
export async function sendDigestPush(
  userId: string,
  summary: string
): Promise<boolean> {
  const tokens = await getUserPushTokens(userId);
  
  if (tokens.length === 0) {
    return false;
  }

  const result = await sendPushNotifications(tokens, {
    title: "📋 Your Daily Digest",
    body: summary,
    data: { screen: "today" },
  });

  return result.success > 0;
}

