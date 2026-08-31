import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Body } from "./components/Layout";
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

// Row banding matches the rest of the app's lists (alt/card, 1.30:1).
const ROW_COLORS = [colors.alt, colors.card];

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={localStyles.overlay}>
        <View style={localStyles.sheet}>
          <View style={[styles.row, localStyles.header]}>
            <Text style={[styles.title, localStyles.modalTitle]}>Meditation History</Text>
            <View style={localStyles.headerButtons}>
              <TouchableOpacity onPress={exportLog} style={localStyles.closeButton}>
                <Ionicons name="share-outline" size={24} color={colors.brand} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={localStyles.closeButton}>
                <Ionicons name="close-circle-outline" size={24} color={colors.brand} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={localStyles.scrollContent}>
            {meditationLog.length === 0 ? (
              <Body>No history yet.</Body>
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
                      localStyles.row,
                      { backgroundColor: ROW_COLORS[index % 2] },
                    ]}
                  >
                    <Text style={localStyles.rowText}>
                      {formatted} - {entry.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteEntry(entry.timestamp)}
                      style={localStyles.deleteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrimOverlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "80%",
    maxHeight: "80%",
    paddingBottom: 10,
  },
  header: {
    paddingRight: 20,
    paddingTop: 8,
  },
  modalTitle: {
    flex: 1,
    marginLeft: 16,
    textAlign: "left",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  deleteButton: {
    marginLeft: 12,
  },
});
