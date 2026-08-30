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
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Body } from "./components/Layout";

type MeditationLogEntry = {
  timestamp: string;
  title: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Deferred: this sheet is moving into Settings and will be redesigned there. These two
// stripes are only 1.06:1 apart, which is close to no stripe at all without colour -
// left alone on purpose, to be fixed as part of the move rather than twice.
const ROW_COLORS = [colors.historyRowA, colors.historyRowB];

export default function MeditationHistory({ visible, onClose }: Props) {
  const [meditationLog, setMeditationLog] = useState<MeditationLogEntry[]>([]);

  const loadLog = async () => {
    try {
      const raw = await AsyncStorage.getItem("meditationLog");
      if (raw) {
        const log: MeditationLogEntry[] = JSON.parse(raw);
        setMeditationLog(log.slice(-20).reverse());
      } else {
        setMeditationLog([]);
      }
    } catch (error) {
      console.error("Error loading meditation log:", error);
    }
  };

  useEffect(() => {
    if (!visible) return;
    loadLog();
  }, [visible]);

  const exportLog = async () => {
    try {
      const raw = await AsyncStorage.getItem("meditationLog");
      const log: MeditationLogEntry[] = raw ? JSON.parse(raw) : [];
      if (log.length === 0) {
        Share.share({ message: "No meditation history to export." });
        return;
      }
      const csv = [
        "Date,Time,Title",
        ...log.map((e) => {
          const d = new Date(e.timestamp);
          const date = d.toLocaleDateString("en-GB");
          const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
          const title = `"${e.title.replace(/"/g, '""')}"`;
          return `${date},${time},${title}`;
        }),
      ].join("\n");
      await Share.share({ message: csv, title: "Meditation History" });
    } catch (error) {
      console.error("Error exporting meditation log:", error);
    }
  };

  const deleteEntry = async (timestamp: string) => {
    try {
      const raw = await AsyncStorage.getItem("meditationLog");
      if (!raw) return;
      const log: MeditationLogEntry[] = JSON.parse(raw);
      const updated = log.filter((e) => e.timestamp !== timestamp);
      await AsyncStorage.setItem("meditationLog", JSON.stringify(updated));
      setMeditationLog(updated.slice(-20).reverse());
    } catch (error) {
      console.error("Error deleting meditation log entry:", error);
    }
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
