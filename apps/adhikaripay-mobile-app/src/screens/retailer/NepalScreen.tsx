import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Globe2, Landmark, ShieldCheck } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { colors, gradientDirection } from "../../theme/colors";

interface NepalScreenProps {
  onBack: () => void;
}

export function NepalScreen({ onBack }: NepalScreenProps) {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]} edges={["top", "bottom"]}>
      <LinearGradient
        colors={[colors.blueLight, colors.blue]}
        start={gradientDirection.diagonal.start}
        end={gradientDirection.diagonal.end}
        style={styles.header}
      >
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Nepal Transfer</Text>
          <Text style={styles.headerSub}>Cross-border remittance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
          <View style={styles.heroIconWrap}>
            <Globe2 size={24} color={colors.blueLight} strokeWidth={2.2} />
          </View>
          <Text style={[styles.heroTitle, { color: tokens.txt }]}>Nepal Transfer mobile screen is now reachable</Text>
          <Text style={[styles.heroSub, { color: tokens.sub }]}>
            Card tap ab kaam karega. Full mobile Nepal flow outlet onboarding, remitter registration, beneficiary,
            quote aur transfer steps ke saath next task mein build hoga.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.infoCard, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
            <ShieldCheck size={18} color={colors.green} strokeWidth={2.1} />
            <Text style={[styles.infoTitle, { color: tokens.txt2 }]}>Backend ready</Text>
            <Text style={[styles.infoSub, { color: tokens.mute }]}>
              Nepal APIs web pe wired hain, mobile integration next step hai.
            </Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
            <Landmark size={18} color={colors.blueFlat} strokeWidth={2.1} />
            <Text style={[styles.infoTitle, { color: tokens.txt2 }]}>Use Web for now</Text>
            <Text style={[styles.infoSub, { color: tokens.mute }]}>
              Urgent Nepal transfer ke liye Agent Web ka `/nepal` flow use karo.
            </Text>
          </View>
        </View>

        <Pressable onPress={onBack} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Back to Services</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerTitle: { color: "#fff", fontSize: 21, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.9)", marginTop: 3, fontSize: 13 },
  content: { padding: 16, paddingBottom: 28 },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF3FF",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  heroSub: { marginTop: 8, fontSize: 13.5, lineHeight: 20 },
  grid: { marginTop: 16, gap: 12 },
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  infoTitle: { fontSize: 14, fontWeight: "800" },
  infoSub: { fontSize: 12.5, lineHeight: 18 },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.blueLight,
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
