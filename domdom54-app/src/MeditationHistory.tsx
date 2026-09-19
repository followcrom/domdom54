import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { bandColor } from "./styles/Styles";
import colors from "./styles/colors";
import { Body, Sheet } from "./components/Layout";
import {
  MeditationLogEntry,
  entryMinutes,
  loadLog,
  saveLog,
} from "./meditationLog";

type Props = {
  visible: boolean;
  /** Called on dismiss - Settings re-reads the log so its totals stay in step with any deletions. */
  onClose: () => void;
};

export default function MeditationHistory({ visible, onClose }: Props) {
  const [meditationLog, setMeditationLog] = useState<MeditationLogEntry[]>([]);

  const refresh = async () => {
    setMeditationLog((await loadLog()).slice(-20).reverse());
  };

  useEffect(() => {
    if (!visible) return;
    refresh();
  }, [visible]);

  const exportLog = async () => {
    try {
      const log = await loadLog();
      if (log.length === 0) {
        Share.share({ message: "No meditation history to export." });
        return;
      }
      const csv = [
        "Date,Time,Title,Minutes",
        ...log.map((e) => {
          const d = new Date(e.timestamp);
          const date = d.toLocaleDateString("en-GB");
          const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
          const title = `"${e.title.replace(/"/g, '""')}"`;
          return `${date},${time},${title},${entryMinutes(e)}`;
        }),
      ].join("\n");
      await Share.share({ message: csv, title: "Meditation History" });
    } catch (error) {
      console.error("Error exporting meditation log:", error);
    }
  };

  const deleteEntry = async (timestamp: string) => {
    const updated = (await loadLog()).filter((e) => e.timestamp !== timestamp);
    await saveLog(updated);
    setMeditationLog(updated.slice(-20).reverse());
  };

  // Clears the WHOLE log, not just the 20 entries on screen - older entries have no
  // other way to be removed short of uninstalling, and the privacy policy tells the
  // user they can clear their history here. Confirmed first because it can't be undone.
  const clearAll = () => {
    Alert.alert(
      "Clear all history?",
      "This permanently deletes every meditation in your history. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            await saveLog([]);
            setMeditationLog([]);
          },
        },
      ]
    );
  };

  const shareAction = (
    <TouchableOpacity
      onPress={exportLog}
      style={styles.sheetAction}
      accessibilityRole="button"
      accessibilityLabel="Export meditation history"
    >
      <Ionicons name="share-outline" size={24} color={colors.brand} />
    </TouchableOpacity>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Meditation History"
      height="80%"
      actions={shareAction}
    >
      {meditationLog.length === 0 ? (
        <View style={styles.sheetGutter}>
          <Body>No history yet.</Body>
        </View>
      ) : (
        meditationLog.map((entry, index) => {
          const date = new Date(entry.timestamp);
          const formatted = date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return (
            <View
              key={entry.timestamp}
              style={[
                styles.row,
                styles.ruledRow,
                localStyles.row,
                { backgroundColor: bandColor(index) },
              ]}
            >
              <Text style={localStyles.rowText}>
                {formatted} - {entry.title}
              </Text>
              <TouchableOpacity
                onPress={() => deleteEntry(entry.timestamp)}
                style={localStyles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${entry.title} on ${formatted}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {meditationLog.length > 0 && (
        <TouchableOpacity
          onPress={clearAll}
          style={localStyles.clearAll}
          accessibilityRole="button"
          accessibilityLabel="Clear all meditation history"
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={localStyles.clearAllText}>Clear all history</Text>
        </TouchableOpacity>
      )}
    </Sheet>
  );
}

// The overlay, sheet and header live in <Sheet>. What is left is the row itself.
const localStyles = StyleSheet.create({
  // Full-bleed and touching, banded like the Moments and Meditations lists. The rows
  // used to be separate rounded pills 16pt apart; on the white sheet the white (`card`)
  // pills merged with the gaps around them and read as rows twice the height of the
  // grey ones. The 16pt side padding lines the text up with the sheet's title.
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  deleteButton: {
    marginLeft: 12,
  },
  // A quiet text control under the list rather than a filled button: it is destructive
  // and rarely wanted, so it should be findable but not inviting. 44pt tall to tap.
  clearAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    minHeight: 44,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  clearAllText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 6,
  },
});
