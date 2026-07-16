import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyRound, MessageSquareText, ShieldCheck } from "lucide-react-native";
import type { ApiResponse, AuthUser } from "@adhikaripay/shared-types";
import { api, setAuthHeader } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { apiError } from "../utils/apiError";
import { CodeGrid } from "../components/CodeGrid";
import { NumericKeypad } from "../components/NumericKeypad";
import { colors } from "../theme/colors";
import type { LoginRoleChip } from "./LoginScreen";
import { showAlert } from "../components/AppAlert";

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface OtpScreenProps {
  mobile: string;
  role: LoginRoleChip;
  devOtp?: string;
  onBack: () => void;
}

type AuthTab = "otp" | "mpin";

const ROLE_SHORT: Record<LoginRoleChip, string> = {
  retailer: "Retailer",
  distributor: "Distributor",
  master_distributor: "Super Dist.",
};

export function OtpScreen({ mobile, role, devOtp: initialDevOtp, onBack }: OtpScreenProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<AuthTab>("otp");
  const [devOtp, setDevOtp] = useState(initialDevOtp ?? "");
  const [otp, setOtp] = useState(initialDevOtp ?? "");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const autoSubmitRef = useRef("");

  const code = tab === "otp" ? otp : mpin;
  const setCode = tab === "otp" ? setOtp : setMpin;
  const codeLen = tab === "otp" ? 6 : 4;

  function pressDigit(d: string) {
    setCode((prev) => (prev.length >= codeLen ? prev : prev + d));
  }

  function pressBackspace() {
    setCode((prev) => prev.slice(0, -1));
  }

  async function resendOtp() {
    if (resendLoading) return;
    setResendLoading(true);
    try {
      const { data } = await api.post<ApiResponse<{ message: string; otp?: string }>>(
        "/auth/otp/request",
        { mobile, portal: "agent", role },
      );
      if (!data.success) throw new Error(data.message);
      if (data.data.otp) {
        setDevOtp(data.data.otp);
        setOtp(data.data.otp);
      } else {
        setOtp("");
      }
    } catch (err) {
      showAlert("OTP failed", apiError(err, "Could not resend OTP"));
    } finally {
      setResendLoading(false);
    }
  }

  async function verifyOtp() {
    const value = otp.trim();
    if (value.length !== 6) {
      showAlert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/otp/verify", {
        mobile,
        otp: value,
        portal: "agent",
        role,
      });
      if (!data.success) throw new Error(data.message);
      setAuthHeader(data.data.accessToken);
      setAuth(data.data.user, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
    } catch (err) {
      showAlert("Verification failed", apiError(err, "Invalid OTP"));
      setOtp("");
      autoSubmitRef.current = "";
    } finally {
      setLoading(false);
    }
  }

  async function submitMpin() {
    if (mpin.length !== 4) {
      showAlert("Invalid MPIN", "Please enter your 4-digit MPIN.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/mpin/login", {
        mobile,
        mpin,
        portal: "agent",
        role,
      });
      if (!data.success) throw new Error(data.message);
      setAuthHeader(data.data.accessToken);
      setAuth(data.data.user, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
    } catch (err) {
      showAlert("MPIN login failed", apiError(err, "Incorrect MPIN"));
      setMpin("");
      autoSubmitRef.current = "";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (code.length !== codeLen || loading) return;
    const key = `${tab}:${code}`;
    if (autoSubmitRef.current === key) return;
    autoSubmitRef.current = key;
    if (tab === "otp") void verifyOtp();
    else void submitMpin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally fire once per complete code
  }, [code, tab, loading, codeLen]);

  const canVerify = code.length === codeLen && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={["#3564E6", "#0B2A9A", "#06175A"]} style={styles.bg}>
        <View style={styles.orbTop} pointerEvents="none" />
        <View style={styles.orbBottom} pointerEvents="none" />

        <Pressable style={styles.back} onPress={onBack} hitSlop={10}>
          <Text style={styles.backText}>← Change number</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.lockBadge}>
            <ShieldCheck size={16} color="#3BE39A" strokeWidth={2.3} />
            <Text style={styles.lockBadgeText}>Secure login</Text>
          </View>
          <Text style={styles.title}>Verify to continue</Text>
          <Text style={styles.subtitle}>
            Enter the {tab === "otp" ? "6-digit OTP" : "4-digit MPIN"} for{" "}
            <Text style={styles.subtitleStrong}>+91 {mobile}</Text>
          </Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{ROLE_SHORT[role]}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => {
                setTab("otp");
                autoSubmitRef.current = "";
              }}
              style={[styles.tab, tab === "otp" && styles.tabActive]}
            >
              <MessageSquareText
                size={15}
                color={tab === "otp" ? "#0B2A9A" : "rgba(255,255,255,.7)"}
                strokeWidth={2.2}
              />
              <Text style={[styles.tabText, tab === "otp" && styles.tabTextActive]}>OTP</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTab("mpin");
                autoSubmitRef.current = "";
              }}
              style={[styles.tab, tab === "mpin" && styles.tabActive]}
            >
              <KeyRound
                size={15}
                color={tab === "mpin" ? "#0B2A9A" : "rgba(255,255,255,.7)"}
                strokeWidth={2.2}
              />
              <Text style={[styles.tabText, tab === "mpin" && styles.tabTextActive]}>MPIN</Text>
            </Pressable>
          </View>

          {tab === "otp" && devOtp ? (
            <View style={styles.devOtpBox}>
              <Text style={styles.devOtpLabel}>Dev OTP · no SMS wired yet</Text>
              <Text style={styles.devOtpCode}>{devOtp.split("").join(" ")}</Text>
            </View>
          ) : null}

          <View style={styles.codeWrap}>
            <CodeGrid length={codeLen} value={code} mask={tab === "mpin"} tone="onGradient" />
          </View>

          {tab === "otp" ? (
            <Pressable onPress={resendOtp} disabled={resendLoading} style={styles.resendBtn}>
              <Text style={styles.resendText}>
                {resendLoading ? "Sending…" : "Didn’t get it? Resend OTP"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => showAlert("MPIN", "MPIN reset is coming soon — use OTP for now.")}
              style={styles.resendBtn}
            >
              <Text style={styles.resendText}>Forgot MPIN?</Text>
            </Pressable>
          )}

          <View style={styles.keypadWrap}>
            <NumericKeypad onDigit={pressDigit} onBackspace={pressBackspace} tone="onGradient" />
          </View>
        </View>

        <Pressable onPress={tab === "otp" ? verifyOtp : submitMpin} disabled={!canVerify} style={styles.buttonPress}>
          <LinearGradient
            colors={[...colors.gradientButton]}
            style={[styles.button, !canVerify && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {tab === "otp" ? "Verify & continue" : "Login with MPIN"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06175A" },
  bg: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  orbTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(36,204,130,.22)",
  },
  orbBottom: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(90,140,255,.2)",
  },
  back: { alignSelf: "flex-start", marginTop: 4, paddingVertical: 4 },
  backText: { color: "#B9C6F2", fontWeight: "700", fontSize: 13.5 },
  hero: { marginTop: 14 },
  lockBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59,227,154,.14)",
    borderWidth: 1,
    borderColor: "rgba(59,227,154,.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  lockBadgeText: { color: "#BFF3D9", fontSize: 11, fontWeight: "700" },
  title: {
    marginTop: 12,
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 27,
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: { marginTop: 8, fontSize: 14, color: "#AEC0F0", fontWeight: "500", lineHeight: 20 },
  subtitleStrong: { color: "#fff", fontWeight: "700" },
  roleChip: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleChipText: { color: "#DCE6FF", fontSize: 12, fontWeight: "700" },
  panel: {
    marginTop: 18,
    flex: 1,
    backgroundColor: "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0,0,0,.18)",
    padding: 5,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 13.5, fontWeight: "700", color: "rgba(255,255,255,.7)" },
  tabTextActive: { color: "#0B2A9A" },
  devOtpBox: {
    marginTop: 14,
    alignItems: "center",
    backgroundColor: "rgba(59,227,154,.12)",
    borderWidth: 1,
    borderColor: "rgba(59,227,154,.45)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  devOtpLabel: { fontSize: 10.5, fontWeight: "700", color: "#3BE39A", letterSpacing: 0.2 },
  devOtpCode: { fontSize: 22, fontWeight: "800", letterSpacing: 4, color: "#fff", marginTop: 3 },
  codeWrap: { marginTop: 18 },
  resendBtn: { alignItems: "center", marginTop: 12, paddingVertical: 4 },
  resendText: { fontSize: 13, fontWeight: "700", color: "#3BE39A" },
  keypadWrap: { marginTop: 14, flex: 1, justifyContent: "flex-end" },
  buttonPress: { marginTop: 14, marginBottom: 8, borderRadius: 15 },
  button: { borderRadius: 15, paddingVertical: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});
