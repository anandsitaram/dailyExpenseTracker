import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import s from '../../styles/styles.js';

export interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { flexGrow: 1, justifyContent: 'center' }]}>
        <Text style={s.onboardEmoji}>💰</Text>
        <Text style={[s.title, { textAlign: 'center' }]}>Welcome to Daily Expense Tracker</Text>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 6, marginBottom: 26 }]}>
          A few things before you start:
        </Text>
        <View style={s.onboardRow}>
          <Text style={s.onboardIcon}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Log expenses in seconds</Text>
            <Text style={s.muted}>
              Tap a date on the calendar, or the + tab, to add one. No account or setup needed.
            </Text>
          </View>
        </View>
        <View style={s.onboardRow}>
          <Text style={s.onboardIcon}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Set a budget anytime</Text>
            <Text style={s.muted}>
              See exactly what&apos;s left to spend this month, overall or per category.
            </Text>
          </View>
        </View>
        <View style={s.onboardRow}>
          <Text style={s.onboardIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Everything stays private</Text>
            <Text style={s.muted}>
              Your data is encrypted on this device and never leaves it unless you export a backup
              yourself.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.primary, { marginTop: 30 }]}
          onPress={onDone}
          accessibilityRole="button"
        >
          <Text style={s.primaryText}>Get started</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
