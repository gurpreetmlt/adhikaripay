import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import type { DownlineUser } from "../lib/types";
import { ROLE_LABEL } from "../lib/roles";
import { formatINR } from "../lib/format";
import { colors } from "../theme/colors";

interface Props {
  user: DownlineUser;
  onFund: (user: DownlineUser) => void;
}

export function DownlineCard({ user, onFund }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <LinearGradient colors={[...colors.gradient]} style={styles.avatarGrad}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>
            {user.uid} · {user.mobile}
          </Text>
          <Text style={styles.role}>{ROLE_LABEL[user.role]}</Text>
        </View>
        <View style={[styles.chip, user.isActive ? styles.chipActive : styles.chipOff]}>
          <Text style={[styles.chipText, user.isActive ? styles.chipActiveText : styles.chipOffText]}>
            {user.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <View>
          <Text style={styles.balLabel}>Balance</Text>
          <Text style={styles.bal}>{formatINR(user.mainBalance)}</Text>
        </View>
        <Pressable onPress={() => onFund(user)}>
          <LinearGradient colors={[...colors.gradient]} style={styles.fundBtn}>
            <Text style={styles.fundText}>Fund →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  top: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { marginRight: 12 },
  avatarGrad: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  role: { fontSize: 12, color: colors.green, fontWeight: "600", marginTop: 2 },
  chip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  chipActive: { backgroundColor: colors.greenBg },
  chipOff: { backgroundColor: "#f3f4f6" },
  chipText: { fontSize: 10, fontWeight: "700" },
  chipActiveText: { color: colors.green },
  chipOffText: { color: colors.textMuted },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balLabel: { fontSize: 11, color: colors.textMuted },
  bal: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 2 },
  fundBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  fundText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
