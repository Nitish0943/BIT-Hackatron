import { Redirect } from 'expo-router';

export default function Index() {
  // Always redirect to onboarding on root entry
  return <Redirect href="/onboarding" />;
}
