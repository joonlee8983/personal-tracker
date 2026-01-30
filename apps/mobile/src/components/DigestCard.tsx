import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchTodayDigest, DigestLog } from "@/src/lib/api";
import { format } from "date-fns";

interface DigestCardProps {
  onRefresh?: () => void;
}

export function DigestCard({ onRefresh }: DigestCardProps) {
  const [digest, setDigest] = useState<DigestLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDigest = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await fetchTodayDigest();
    
    if (result.success && result.data) {
      setDigest(result.data.digest);
    } else {
      setError(result.error || "Failed to load digest");
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadDigest();
  }, []);

  // Refresh when parent requests
  useEffect(() => {
    if (onRefresh) {
      loadDigest();
    }
  }, [onRefresh]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading digest...</Text>
        </View>
      </View>
    );
  }

  if (!digest) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No digest yet today</Text>
          <Text style={styles.emptySubtitle}>
            Your daily digest arrives at 8 AM PST
          </Text>
        </View>
      </View>
    );
  }

  // Parse the markdown content for display
  const parseDigestContent = (content: string) => {
    const sections: { title: string; items: string[] }[] = [];
    let currentSection: { title: string; items: string[] } | null = null;
    
    const lines = content.split("\n");
    
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: line.replace("## ", ""), items: [] };
      } else if (line.startsWith("- ") || line.match(/^\d+\./)) {
        if (currentSection) {
          const item = line.replace(/^[-\d.]+\s*/, "").trim();
          if (item) {
            currentSection.items.push(item);
          }
        }
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const sections = parseDigestContent(digest.content);
  const digestDate = format(new Date(digest.date), "EEEE, MMM d");
  const sentTime = digest.sentAt 
    ? format(new Date(digest.sentAt), "h:mm a")
    : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="newspaper" size={20} color="#3b82f6" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Daily Digest</Text>
            <Text style={styles.headerSubtitle}>
              {digestDate} {sentTime && `• ${sentTime}`}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#64748b"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.length > 0 ? (
                section.items.map((item, itemIndex) => (
                  <Text key={itemIndex} style={styles.sectionItem}>
                    • {item.replace(/\*\*/g, "")}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptySection}>Nothing here</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  content: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  sectionItem: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    paddingLeft: 4,
  },
  emptySection: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});
