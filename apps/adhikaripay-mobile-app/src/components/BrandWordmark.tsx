import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  size?: "lg" | "md";
  /** White + green on blue hero; brand blue + green on light surfaces */
  onGradient?: boolean;
  style?: ViewStyle;
}

export function BrandWordmark({ size = "lg", onGradient = false, style }: Props) {
  const base = size === "lg" ? styles.lg : styles.md;

  const adhikariStyle: TextStyle = onGradient
    ? { color: colors.onGradient }
    : { color: colors.wordmarkAdhikari };

  const payStyle: TextStyle = onGradient
    ? { color: colors.greenLight }
    : { color: colors.green };

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[base, styles.row]}>
        <Text style={adhikariStyle}>Adhikari</Text>
        <Text style={payStyle}> Pay</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  row: { textAlign: "center" },
  lg: { fontSize: 36, fontWeight: "800", letterSpacing: -0.8 },
  md: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
});
