import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import LiveFocusWindow from "./components/LiveFocusWindow";
// swap for FitCalculator / Planner / CombinedPlanner to mount a different tool

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1710" }}>
      <StatusBar barStyle="light-content" />
      <LiveFocusWindow />
    </SafeAreaView>
  );
}
