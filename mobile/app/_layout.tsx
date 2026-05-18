import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack 
        initialRouteName="onboarding"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="(citizen)" />
        <Stack.Screen name="(volunteer)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
