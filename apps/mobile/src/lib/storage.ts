import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REFRESH_TOKEN_KEY = "refresh_token";
const DEVICE_ID_KEY = "device_id";
const OFFLINE_QUEUE_KEY = "offline_queue";

/**
 * Secure storage for sensitive data (tokens)
 */
export const secureStorage = {
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async deleteRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async setDeviceId(deviceId: string): Promise<void> {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  },

  async getDeviceId(): Promise<string | null> {
    return SecureStore.getItemAsync(DEVICE_ID_KEY);
  },

  async deleteDeviceId(): Promise<void> {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(DEVICE_ID_KEY),
    ]);
  },
};

/**
 * Regular storage for non-sensitive data
 */
export const storage = {
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
};

/**
 * Offline queue for failed requests
 */
export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: unknown;
  timestamp: number;
}

export const offlineQueue = {
  async add(request: Omit<QueuedRequest, "id" | "timestamp">): Promise<void> {
    const queue = await this.getAll();
    const newRequest: QueuedRequest = {
      ...request,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    queue.push(newRequest);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  async getAll(): Promise<QueuedRequest[]> {
    const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((r) => r.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  },
};

