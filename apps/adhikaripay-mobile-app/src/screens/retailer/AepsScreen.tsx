import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronRight,
  CircleDot,
  Eye,
  EyeOff,
  Fingerprint,
  Plus,
  ScanEye,
  Search,
  Star,
  X,
} from "lucide-react-native";
import type { ApiResponse } from "@adhikaripay/shared-types";
import { api } from "../../lib/api";
import { apiError } from "../../utils/apiError";
import { formatINR } from "../../lib/format";
import { captureFingerprint } from "../../lib/rdServiceFingerprint";
import { useTxnPin } from "../../hooks/useTxnPin";
import { useTheme } from "../../theme/ThemeContext";
import { colors, gradientDirection } from "../../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── Bank data ─────────────────────────────────────────────────────── */

interface Bank {
  id: string;
  name: string;
  shortName: string;
  color: string;
  letter: string;
  /**
   * NPCI-assigned Bank IIN for AEPS — PLACEHOLDER only (derived from `id`, not a real IIN).
   * Replace with the real NPCI Bank IIN table before switching the provider off mock mode.
   */
  iin: string;
}

const BANKS: Bank[] = [
  { id: "bob", name: "Bank of Baroda", shortName: "BOB", color: "#E64A19", letter: "B", iin: "BOB000" },
  { id: "pnb", name: "Punjab National Bank", shortName: "PNB", color: "#D32F2F", letter: "P", iin: "PNB000" },
  { id: "psb", name: "Punjab & Sind Bank", shortName: "PSB", color: "#7B1FA2", letter: "P", iin: "PSB000" },
  { id: "sbi", name: "State Bank of India", shortName: "SBI", color: "#1565C0", letter: "S", iin: "SBI000" },
  { id: "hdfc", name: "HDFC Bank", shortName: "HDFC", color: "#00338D", letter: "H", iin: "HDFC00" },
  { id: "airtel", name: "Airtel Payment Bank", shortName: "Airtel", color: "#E53935", letter: "A", iin: "AIRTEL" },
  { id: "icici", name: "ICICI Bank", shortName: "ICICI", color: "#F57C00", letter: "I", iin: "ICICI0" },
  { id: "pgb", name: "Punjab Gramin Bank", shortName: "PGB", color: "#E91E63", letter: "P", iin: "PGB000" },
  { id: "uco", name: "UCO Bank", shortName: "UCO", color: "#7B1FA2", letter: "U", iin: "UCO000" },
  { id: "boi", name: "Bank of India", shortName: "BOI", color: "#E65100", letter: "B", iin: "BOI000" },
  { id: "canara", name: "Canara Bank", shortName: "Canara", color: "#1976D2", letter: "C", iin: "CANARA" },
  { id: "indian", name: "Indian Bank", shortName: "Indian", color: "#0D47A1", letter: "I", iin: "INDIAN" },
  { id: "union", name: "Union Bank of India", shortName: "Union", color: "#F57C00", letter: "U", iin: "UNION0" },
  { id: "kotak", name: "Kotak Mahindra Bank", shortName: "Kotak", color: "#E53935", letter: "K", iin: "KOTAK0" },
  { id: "axis", name: "Axis Bank", shortName: "Axis", color: "#6A1B9A", letter: "A", iin: "AXIS00" },
  { id: "iob", name: "Indian Overseas Bank", shortName: "IOB", color: "#C62828", letter: "I", iin: "IOB000" },
  { id: "central", name: "Central Bank of India", shortName: "Central", color: "#B71C1C", letter: "C", iin: "CENTRA" },
  { id: "bom", name: "Bank of Maharashtra", shortName: "BOM", color: "#4A148C", letter: "B", iin: "BOM000" },
  { id: "idbi", name: "IDBI Bank", shortName: "IDBI", color: "#00695C", letter: "I", iin: "IDBI00" },
  { id: "yes", name: "Yes Bank", shortName: "Yes", color: "#1565C0", letter: "Y", iin: "YES000" },
  { id: "fino", name: "Fino Payments Bank", shortName: "Fino", color: "#FF6F00", letter: "F", iin: "FINO00" },
  { id: "paytm", name: "Paytm Payments Bank", shortName: "Paytm", color: "#00BCD4", letter: "P", iin: "PAYTM0" },
];

const AEPS_TABS = ["Withdraw", "Mini Statement", "Deposit", "Balance Enquiry"] as const;
type AepsTab = (typeof AEPS_TABS)[number];

const AEPS_TAB_MAP: Record<string, AepsTab> = {
  CASH_WITHDRAW: "Withdraw",
  MINI_STATEMENT: "Mini Statement",
  CASH_DEPOSIT: "Deposit",
  BALANCE_ENQUIRY: "Balance Enquiry",
};

const QUICK_AMOUNTS = [1000, 3000, 5000, 10000];

/* ── Biometric L1 devices (UIDAI certified) ───────────────────────── */

interface BiometricDevice {
  id: string;
  name: string;
  rdPackage: string;
  color: string;
  letter: string;
}

const BIOMETRIC_DEVICES: BiometricDevice[] = [
  { id: "mantra_mfs110", name: "Mantra MFS110 L1", rdPackage: "com.mantra.mfs110.rdservice", color: "#1565C0", letter: "M" },
  { id: "startek_fm220", name: "Startek L1", rdPackage: "com.acpl.registersdk", color: "#4A148C", letter: "S" },
  { id: "morpho_mso1300", name: "Morpho MSO L1", rdPackage: "com.scl.rdservice", color: "#E53935", letter: "M" },
  { id: "visiontek_v600", name: "VisionTek V600 L1", rdPackage: "com.linkwell.rdservice", color: "#00695C", letter: "V" },
  { id: "evolute_escan", name: "Evolute eScan L1", rdPackage: "com.evolute.rdservice", color: "#F57C00", letter: "E" },
  { id: "mantra_marc11", name: "Marc 11", rdPackage: "com.mantra.mfs110.rdservice", color: "#1976D2", letter: "M" },
  { id: "precision_pb1000", name: "PB1000 - L1", rdPackage: "com.precision.pb510.rdservice", color: "#7B1FA2", letter: "P" },
];

type AuthMode = "fingerprint" | "iris";

/* ── Device selector modal ─────────────────────────────────────────── */

function DeviceModal({
  visible,
  onClose,
  activeDeviceId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  activeDeviceId: string;
  onSelect: (device: BiometricDevice) => void;
}) {
  const { tokens } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_W);
    }
  }, [visible, slideAnim]);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  }

  if (!visible) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      <View style={dm.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[dm.sheet, { backgroundColor: tokens.card, transform: [{ translateX: slideAnim }] }]}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <View style={dm.header}>
              <Text style={[dm.headerTitle, { color: colors.blue }]}>Select Biometric Device</Text>
              <Pressable onPress={handleClose} hitSlop={12} style={dm.closeBtn}>
                <X size={20} color={tokens.mute} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {BIOMETRIC_DEVICES.map((device) => {
                const isActive = device.id === activeDeviceId;
                return (
                  <Pressable
                    key={device.id}
                    onPress={() => { onSelect(device); handleClose(); }}
                    style={[dm.row, isActive && { backgroundColor: `${colors.blueFlat}0C` }]}
                  >
                    <View style={[dm.deviceIcon, { backgroundColor: device.color }]}>
                      <Text style={dm.deviceLetter}>{device.letter}</Text>
                    </View>
                    <Text style={[dm.deviceName, { color: tokens.txt }]}>{device.name}</Text>
                    {isActive && (
                      <View style={dm.activeBadge}>
                        <Text style={dm.activeBadgeText}>Currently Active</Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={tokens.mute} />
                  </Pressable>
                );
              })}

              <Pressable onPress={handleClose} style={dm.row}>
                <View style={dm.addIcon}>
                  <Plus size={18} color={tokens.mute} />
                </View>
                <Text style={[dm.deviceName, { color: tokens.mute }]}>Add New Device</Text>
                <View style={{ marginLeft: "auto" }}>
                  <ChevronRight size={16} color={tokens.mute} />
                </View>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { position: "absolute", top: 0, bottom: 0, right: 0, width: SCREEN_W * 0.88, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: -4, height: 0 }, elevation: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  headerTitle: { fontWeight: "800", fontSize: 17 },
  closeBtn: { padding: 6, borderRadius: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  deviceIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  deviceLetter: { color: "#fff", fontWeight: "800", fontSize: 16 },
  deviceName: { flex: 1, fontSize: 14, fontWeight: "600" },
  activeBadge: { backgroundColor: "#dcfce7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: 10, fontWeight: "800", color: "#15803d" },
  addIcon: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
});

/* ── Bank icon ─────────────────────────────────────────────────────── */

function BankIcon({ bank, size = 44 }: { bank: Bank; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bank.color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.38 }}>
        {bank.letter}
      </Text>
    </View>
  );
}

/* ── Bank selector modal (full-screen bottom sheet style) ──────────── */

function BankModal({
  visible,
  onClose,
  onSelect,
  favouriteIds,
  onToggleFav,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (bank: Bank) => void;
  favouriteIds: string[];
  onToggleFav: (id: string) => void;
}) {
  const { tokens } = useTheme();
  const [search, setSearch] = useState("");
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_W);
      setSearch("");
    }
  }, [visible, slideAnim]);

  const favBanks = useMemo(
    () => BANKS.filter((b) => favouriteIds.includes(b.id)),
    [favouriteIds],
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? BANKS.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
        : BANKS,
    [search],
  );

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  }

  if (!visible) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      <View style={ms.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[ms.sheet, { backgroundColor: tokens.card, transform: [{ translateX: slideAnim }] }]}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {/* Header */}
            <View style={ms.header}>
              <Text style={[ms.headerTitle, { color: colors.blue }]}>Select Customer's Bank</Text>
              <Pressable onPress={handleClose} hitSlop={12} style={ms.closeBtn}>
                <X size={20} color={tokens.mute} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={ms.searchWrap}>
              <View style={[ms.searchBox, { borderColor: tokens.cardBorder, backgroundColor: tokens.inputBg }]}>
                <Search size={16} color={tokens.mute} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search a bank"
                  placeholderTextColor={tokens.mute}
                  style={[ms.searchInput, { color: tokens.txt }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}>
              {/* Favourite/Recent banks */}
              {favBanks.length > 0 && !search && (
                <View style={{ marginBottom: 18 }}>
                  <Text style={[ms.sectionTitle, { color: tokens.txt }]}>Recent / Favourite Banks</Text>
                  <View style={ms.favGrid}>
                    {favBanks.slice(0, 8).map((bank) => (
                      <Pressable
                        key={bank.id}
                        onPress={() => {
                          onSelect(bank);
                          handleClose();
                        }}
                        style={ms.favItem}
                      >
                        <BankIcon bank={bank} size={42} />
                        <Text style={[ms.favName, { color: tokens.txt2 }]} numberOfLines={2}>
                          {bank.shortName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* All banks */}
              <Text style={[ms.sectionTitle, { color: tokens.txt }]}>All Banks</Text>
              {filtered.map((bank) => (
                <View key={bank.id} style={[ms.bankRow, { borderBottomColor: tokens.cardBorder }]}>
                  <Pressable
                    style={ms.bankRowPress}
                    onPress={() => {
                      onSelect(bank);
                      handleClose();
                    }}
                  >
                    <BankIcon bank={bank} size={34} />
                    <Text style={[ms.bankRowName, { color: tokens.txt2 }]}>{bank.name}</Text>
                  </Pressable>
                  <Pressable onPress={() => onToggleFav(bank.id)} hitSlop={10}>
                    <Star
                      size={16}
                      strokeWidth={2}
                      color={favouriteIds.includes(bank.id) ? "#F59E0B" : tokens.mute}
                      fill={favouriteIds.includes(bank.id) ? "#F59E0B" : "none"}
                    />
                  </Pressable>
                </View>
              ))}
              {filtered.length === 0 && (
                <Text style={[ms.empty, { color: tokens.mute }]}>No banks found for "{search}"</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { position: "absolute", top: 0, bottom: 0, right: 0, width: SCREEN_W * 0.88, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: -4, height: 0 }, elevation: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  headerTitle: { fontWeight: "800", fontSize: 17 },
  closeBtn: { padding: 6, borderRadius: 10 },
  searchWrap: { paddingHorizontal: 18, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  sectionTitle: { fontWeight: "800", fontSize: 14, marginBottom: 10 },
  favGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  favItem: { alignItems: "center", width: 68, paddingVertical: 6 },
  favName: { fontSize: 10, fontWeight: "600", textAlign: "center", marginTop: 4 },
  bankRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1 },
  bankRowPress: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  bankRowName: { fontSize: 14, fontWeight: "600" },
  empty: { textAlign: "center", paddingVertical: 30, fontSize: 13 },
});

/* ── Main AEPS screen ──────────────────────────────────────────────── */

interface AepsScreenProps {
  onBack: () => void;
  initialTab?: AepsTab;
  serviceCode?: string;
}

export function AepsScreen({ onBack, initialTab, serviceCode }: AepsScreenProps) {
  const { tokens } = useTheme();
  const { promptPin, TxnPinPrompt } = useTxnPin();

  const resolvedInitial = useMemo(() => {
    if (initialTab) return initialTab;
    if (serviceCode && AEPS_TAB_MAP[serviceCode]) return AEPS_TAB_MAP[serviceCode];
    return "Withdraw" as AepsTab;
  }, [initialTab, serviceCode]);

  const [tab, setTab] = useState<AepsTab>(resolvedInitial);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [aadhaar, setAadhaar] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [aadhaarVisible, setAadhaarVisible] = useState(false);
  const [aadhaarFocused, setAadhaarFocused] = useState(false);
  const [consent, setConsent] = useState(true);
  const [activeDevice, setActiveDevice] = useState<BiometricDevice>(BIOMETRIC_DEVICES[0]);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("fingerprint");
  const [favBanks, setFavBanks] = useState<string[]>(["bob", "pnb", "sbi", "hdfc", "airtel", "icici"]);

  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, scanAnim]);

  const toggleFavBank = useCallback((id: string) => {
    setFavBanks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const showAmount = tab === "Withdraw" || tab === "Deposit";

  const visibleBanks = useMemo(() => {
    const favs = BANKS.filter((b) => favBanks.includes(b.id));
    return favs.length > 0 ? favs.slice(0, 5) : BANKS.slice(0, 5);
  }, [favBanks]);

  function formatAadhaar(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  // Mask for display overlay only — never put "X" into TextInput (Android opens QWERTY for letters).
  function maskAadhaarDisplay(v: string) {
    const digits = v.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `XXXX XXXX ${digits.slice(-4)}`;
  }

  const showAadhaarPlain = aadhaarFocused || aadhaarVisible;
  const aadhaarInputRef = useRef<TextInput>(null);

  const canScan =
    !!selectedBank &&
    aadhaar.length >= 8 &&
    mobile.length === 10 &&
    consent &&
    (!showAmount || !!amount) &&
    !scanning &&
    !submitting;

  async function handleScan() {
    if (!canScan || !selectedBank) return;

    setScanning(true);
    let pidData: string;
    try {
      pidData = await captureFingerprint(activeDevice.rdPackage);
    } catch (err) {
      setScanning(false);
      const detail = err instanceof Error ? err.message : "Unknown error";
      const lines = detail.split("\n");
      const short =
        lines.length > 8 ? `${lines.slice(0, 6).join("\n")}\n… (${lines.length - 6} more lines)` : detail;
      Alert.alert("Capture failed", short);
      return;
    }
    setScanning(false);

    try {
      if (tab === "Withdraw") {
        let txnAuth: string;
        try {
          txnAuth = await promptPin();
        } catch {
          return;
        }
        setSubmitting(true);
        const idempotencyKey = `aeps-wd-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
        const { data } = await api.post<ApiResponse<{ txn: { txnRef: string; status: string } }>>(
          "/txn/aeps/withdraw",
          {
            idempotencyKey,
            txnAuth,
            aadhaarNumber: aadhaar,
            bankIin: selectedBank.iin,
            mobile,
            biometricPayload: pidData,
            amount,
          },
        );
        if (!data.success) throw new Error(data.message);
        Alert.alert(
          "Withdrawal Successful",
          `${formatINR(amount)} — Ref: ${data.data.txn?.txnRef ?? idempotencyKey}`,
        );
        setAmount("");
      } else if (tab === "Balance Enquiry" || tab === "Mini Statement") {
        setSubmitting(true);
        const path = tab === "Balance Enquiry" ? "/txn/aeps/balance-enquiry" : "/txn/aeps/mini-statement";
        const { data } = await api.post<ApiResponse<{ data?: { balance?: string } }>>(path, {
          aadhaarNumber: aadhaar,
          bankIin: selectedBank.iin,
          mobile,
          biometricPayload: pidData,
        });
        if (!data.success) throw new Error(data.message);
        const balance = data.data?.data?.balance;
        Alert.alert(tab, balance ? `Available balance: ${formatINR(balance)}` : "Request completed successfully.");
      } else {
        Alert.alert("Coming soon", `${tab} is not available yet.`);
      }
    } catch (err) {
      if (err) {
        Alert.alert(tab === "Withdraw" ? "Withdrawal failed" : "Request failed", apiError(err, "Please try again"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const scanTranslate = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-38, 38] });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.blueLight, colors.blue]}
        start={gradientDirection.diagonal.start}
        end={gradientDirection.diagonal.end}
        style={s.header}
      >
        <Pressable onPress={onBack} style={s.backBtn}>
          <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>AePS</Text>
          <Text style={s.headerSub}>Aadhaar Enabled Payment System</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabRow}
        >
          {AEPS_TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[s.tab, active && { backgroundColor: colors.blue }]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bank selector strip */}
        <View style={[s.card, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
          <Text style={[s.cardLabel, { color: tokens.sub }]}>SELECT BANK</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bankStrip}>
            {visibleBanks.map((bank) => {
              const active = selectedBank?.id === bank.id;
              return (
                <Pressable
                  key={bank.id}
                  onPress={() => setSelectedBank(bank)}
                  style={[s.bankItem, active && s.bankItemActive]}
                >
                  <BankIcon bank={bank} size={40} />
                  <Text style={[s.bankShort, { color: tokens.txt2 }]} numberOfLines={1}>
                    {bank.shortName}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setBankModalOpen(true)} style={s.viewAllBtn}>
              <Text style={s.viewAllText}>View All</Text>
              <ChevronRight size={14} color={colors.blueLight} />
            </Pressable>
          </ScrollView>
          {selectedBank && (
            <View style={[s.selectedBankRow, { backgroundColor: colors.bluePale }]}>
              <BankIcon bank={selectedBank} size={26} />
              <Text style={[s.selectedBankName, { color: colors.blue }]}>
                {selectedBank.name}
              </Text>
            </View>
          )}
        </View>

        {/* Form fields */}
        <View style={[s.card, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
          {/* Aadhaar — TextInput always digits-only so Android stays on number-pad */}
          <Text style={[s.fieldLabel, { color: tokens.sub }]}>AADHAAR / VID NUMBER</Text>
          <View style={[s.inputRow, { borderColor: tokens.inputBorder, backgroundColor: tokens.inputBg }]}>
            <View style={{ flex: 1, position: "relative", justifyContent: "center" }}>
              <TextInput
                ref={aadhaarInputRef}
                value={formatAadhaar(aadhaar)}
                onChangeText={(v) => setAadhaar(v.replace(/\D/g, "").slice(0, 12))}
                onFocus={() => setAadhaarFocused(true)}
                onBlur={() => setAadhaarFocused(false)}
                placeholder="XXXX XXXX XXXX"
                placeholderTextColor={tokens.mute}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={14}
                style={[
                  s.input,
                  { color: showAadhaarPlain ? tokens.txt : "transparent" },
                ]}
              />
              {!showAadhaarPlain && aadhaar.length > 0 && (
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => {
                    setAadhaarFocused(true);
                    aadhaarInputRef.current?.focus();
                  }}
                >
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={[s.input, { color: tokens.txt }]} pointerEvents="none">
                      {maskAadhaarDisplay(aadhaar)}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                setAadhaarVisible((v) => !v);
                // Keep number-pad — never remount as text field
                requestAnimationFrame(() => aadhaarInputRef.current?.focus());
              }}
              hitSlop={10}
            >
              {aadhaarVisible ? (
                <EyeOff size={18} color={tokens.mute} />
              ) : (
                <Eye size={18} color={tokens.mute} />
              )}
            </Pressable>
          </View>

          {/* Mobile */}
          <Text style={[s.fieldLabel, s.fieldLabelSpaced, { color: tokens.sub }]}>MOBILE NUMBER</Text>
          <View style={[s.inputRow, { borderColor: tokens.inputBorder, backgroundColor: tokens.inputBg }]}>
            <TextInput
              value={mobile}
              onChangeText={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
              placeholder="Mobile Number"
              placeholderTextColor={tokens.mute}
              keyboardType="phone-pad"
              maxLength={10}
              style={[s.input, { color: tokens.txt }]}
            />
          </View>

          {/* Amount (conditional) */}
          {showAmount && (
            <>
              <Text style={[s.fieldLabel, s.fieldLabelSpaced, { color: tokens.sub }]}>
                AMOUNT TO {tab.toUpperCase()}
              </Text>
              <View style={[s.inputRow, { borderColor: tokens.inputBorder, backgroundColor: tokens.inputBg }]}>
                <Text style={{ color: colors.blueFlat, fontWeight: "800", fontSize: 16, marginRight: 4 }}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/\D/g, ""))}
                  placeholder="Enter amount"
                  placeholderTextColor={tokens.mute}
                  keyboardType="number-pad"
                  style={[s.input, { color: tokens.txt }]}
                />
              </View>
              <View style={s.quickRow}>
                {QUICK_AMOUNTS.map((a) => {
                  const active = amount === String(a);
                  return (
                    <Pressable
                      key={a}
                      onPress={() => setAmount(String(a))}
                      style={[
                        s.quickChip,
                        {
                          borderColor: active ? colors.blueLight : tokens.cardBorder,
                          backgroundColor: active ? colors.bluePale : tokens.card,
                        },
                      ]}
                    >
                      <Text style={[s.quickChipText, { color: active ? colors.blue : tokens.txt2 }]}>
                        ₹{a.toLocaleString("en-IN")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Consent */}
          <Pressable onPress={() => setConsent((v) => !v)} style={s.consentRow}>
            <View style={[s.checkbox, consent && s.checkboxChecked]}>
              {consent && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={[s.consentText, { color: tokens.txt2 }]}>
              I (the customer) accept{" "}
              <Text style={{ color: colors.blueLight, fontWeight: "700" }}>Aadhaar Consent</Text>
              {" "}and have read the{" "}
              <Text style={{ color: colors.blueLight, fontWeight: "700" }}>AePS Advisory</Text>
            </Text>
          </Pressable>
        </View>

        {/* Authentication Mode */}
        <View style={[s.card, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
          <Text style={[s.fieldLabel, { color: tokens.sub, marginBottom: 10 }]}>AUTHENTICATION MODE</Text>
          <View style={s.authModeRow}>
            <Pressable
              onPress={() => setAuthMode("fingerprint")}
              style={[
                s.authModeBtn,
                {
                  borderColor: authMode === "fingerprint" ? colors.blueLight : tokens.cardBorder,
                  backgroundColor: authMode === "fingerprint" ? colors.bluePale : tokens.card,
                },
              ]}
            >
              <Fingerprint size={20} color={authMode === "fingerprint" ? colors.blue : tokens.mute} />
              <Text style={[s.authModeText, { color: authMode === "fingerprint" ? colors.blue : tokens.txt2 }]}>
                Fingerprint
              </Text>
              {authMode === "fingerprint" && <CircleDot size={14} color={colors.green} />}
            </Pressable>
            <Pressable
              onPress={() => setAuthMode("iris")}
              style={[
                s.authModeBtn,
                {
                  borderColor: authMode === "iris" ? colors.blueLight : tokens.cardBorder,
                  backgroundColor: authMode === "iris" ? colors.bluePale : tokens.card,
                },
              ]}
            >
              <ScanEye size={20} color={authMode === "iris" ? colors.blue : tokens.mute} />
              <Text style={[s.authModeText, { color: authMode === "iris" ? colors.blue : tokens.txt2 }]}>
                Iris
              </Text>
              {authMode === "iris" && <CircleDot size={14} color={colors.green} />}
            </Pressable>
          </View>
        </View>

        {/* Biometric device + Scan */}
        <View style={[s.card, { backgroundColor: tokens.card, borderColor: tokens.cardBorder }]}>
          <View style={s.bioRow}>
            <View style={[s.bioIconCircle, { backgroundColor: activeDevice.color }]}>
              <Text style={s.bioIconLetter}>{activeDevice.letter}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.bioDevice, { color: tokens.txt }]}>{activeDevice.name}</Text>
              <Pressable onPress={() => setDeviceModalOpen(true)}>
                <Text style={[s.bioChange, { color: colors.blueLight }]}>Change Device</Text>
              </Pressable>
            </View>
          </View>

          {/* Scan area */}
          <View style={s.scanArea}>
            <View style={[s.scanCircle, { backgroundColor: colors.bluePale }]}>
              {authMode === "fingerprint" ? (
                <Fingerprint size={48} color={colors.blueFlat} strokeWidth={1.6} />
              ) : (
                <ScanEye size={48} color={colors.blueFlat} strokeWidth={1.6} />
              )}
              {scanning && (
                <Animated.View
                  style={[s.scanLine, { transform: [{ translateY: scanTranslate }] }]}
                />
              )}
            </View>
          </View>

          <Pressable
            onPress={handleScan}
            disabled={!canScan}
            style={({ pressed }) => [s.scanBtn, !canScan && s.scanBtnDisabled, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={canScan ? [colors.greenLight, colors.greenDark] : ["#94a3b8", "#94a3b8"]}
              start={gradientDirection.diagonal.start}
              end={gradientDirection.diagonal.end}
              style={s.scanBtnGradient}
            >
              {authMode === "fingerprint" ? (
                <Fingerprint size={18} color="#fff" strokeWidth={2.4} />
              ) : (
                <ScanEye size={18} color="#fff" strokeWidth={2.4} />
              )}
              <Text style={s.scanBtnText}>
                {scanning
                  ? "Place finger on scanner..."
                  : submitting
                    ? "Processing..."
                    : authMode === "fingerprint"
                      ? "Scan Finger"
                      : "Scan Iris"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Commission info card */}
        <View style={[s.card, { backgroundColor: `${colors.green}0C`, borderColor: `${colors.green}30` }]}>
          <Text style={[s.commTitle, { color: colors.greenDark }]}>Commission Info</Text>
          {[
            { label: "Cash Withdraw", value: "Upto ₹3.50" },
            { label: "Balance Enquiry", value: "₹1.00" },
            { label: "Mini Statement", value: "₹1.00" },
            { label: "Aadhaar Pay", value: "₹2.00" },
          ].map((r) => (
            <View key={r.label} style={s.commRow}>
              <Text style={[s.commLabel, { color: tokens.txt2 }]}>{r.label}</Text>
              <Text style={[s.commValue, { color: colors.greenDark }]}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Warning */}
        <View style={[s.card, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
          <Text style={s.warningText}>
            ⚠️ Ensure biometric device is connected before scanning. Customer must be physically present for Aadhaar authentication.
          </Text>
        </View>
      </ScrollView>

      <TxnPinPrompt />

      {/* Bank modal */}
      <BankModal
        visible={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSelect={setSelectedBank}
        favouriteIds={favBanks}
        onToggleFav={toggleFavBank}
      />

      <DeviceModal
        visible={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        activeDeviceId={activeDevice.id}
        onSelect={setActiveDevice}
      />

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontWeight: "800", fontSize: 19, color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: "500", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  // Tabs
  tabRow: { gap: 8, paddingBottom: 6, marginBottom: 14 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  tabText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  tabTextActive: { color: "#fff" },

  // Card
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 10 },

  // Bank strip
  bankStrip: { gap: 10, alignItems: "center", paddingBottom: 4 },
  bankItem: { alignItems: "center", width: 58, paddingVertical: 4, borderRadius: 14 },
  bankItemActive: { backgroundColor: "#EFF6FF", borderWidth: 1.5, borderColor: colors.blueLight },
  bankShort: { fontSize: 9.5, fontWeight: "600", textAlign: "center", marginTop: 3 },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 10 },
  viewAllText: { fontSize: 12, fontWeight: "800", color: colors.blueLight },
  selectedBankRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  selectedBankName: { fontWeight: "700", fontSize: 13 },

  // Form fields
  fieldLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  fieldLabelSpaced: { marginTop: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 6,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "600", paddingVertical: 0 },

  // Quick amounts
  quickRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  quickChip: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  quickChipText: { fontWeight: "700", fontSize: 12.5 },

  // Consent
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 18 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "800" },
  consentText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Auth mode
  authModeRow: { flexDirection: "row", gap: 10 },
  authModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
  },
  authModeText: { fontWeight: "700", fontSize: 13 },

  // Biometric
  bioRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bioIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  bioIconLetter: { color: "#fff", fontWeight: "800", fontSize: 16 },
  bioDevice: { fontWeight: "700", fontSize: 14 },
  bioChange: { fontSize: 12, fontWeight: "700", marginTop: 1 },
  scanArea: { alignItems: "center", paddingVertical: 20 },
  scanCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#C9D8FA",
  },
  scanLine: { position: "absolute", left: 0, right: 0, height: 4, backgroundColor: colors.green },
  scanBtn: { borderRadius: 16, overflow: "hidden" },
  scanBtnDisabled: { opacity: 0.55 },
  scanBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  scanBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Commission
  commTitle: { fontWeight: "800", fontSize: 14, marginBottom: 10 },
  commRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  commLabel: { fontSize: 12.5, fontWeight: "500" },
  commValue: { fontSize: 12.5, fontWeight: "700" },

  // Warning
  warningText: { fontSize: 12, fontWeight: "600", color: "#92400E", lineHeight: 18 },
});
