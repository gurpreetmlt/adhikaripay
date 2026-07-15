import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../theme/colors";

interface Props {
  emoji: string;
  size?: number;
  style?: ViewStyle;
}

export function GradientIcon({ emoji, size = 44, style }: Props) {
  const fontSize = size * 0.45;
  return (
    <LinearGradient
      colors={[...colors.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}
    >
      <Text style={{ fontSize }}>{emoji}</Text>
    </LinearGradient>
  );
}

/** Soft gradient background for cards/headers */
export function GradientBanner({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[...colors.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.blueFlat,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
