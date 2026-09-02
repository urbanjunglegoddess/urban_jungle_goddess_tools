import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import LiveFocusWindow from "./components/LiveFocusWindow";
// swap for FitCalculator / Planner / CombinedPlanner to mount a different tool

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <StatusBar barStyle="light-content" />
      <LiveFocusWindow />
    </SafeAreaView>
  );
}
