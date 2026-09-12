import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import s from '../../styles/styles.js';

export interface PinSetupFormProps {
  pinDraft: string;
  setPinDraft: (val: string) => void;
  pinConfirm: string;
  setPinConfirm: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PinSetupForm({
  pinDraft,
  setPinDraft,
  pinConfirm,
  setPinConfirm,
  onSave,
  onCancel,
}: PinSetupFormProps) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>New PIN (4-6 digits)</Text>
      <TextInput
        style={s.input}
        keyboardType="numeric"
        secureTextEntry
        maxLength={6}
        value={pinDraft}
        onChangeText={setPinDraft}
        placeholder="••••"
      />
      <Text style={s.label}>Confirm PIN</Text>
      <TextInput
        style={s.input}
        keyboardType="numeric"
        secureTextEntry
        maxLength={6}
        value={pinConfirm}
        onChangeText={setPinConfirm}
        placeholder="••••"
      />
      <TouchableOpacity style={s.primary} onPress={onSave}>
        <Text style={s.primaryText}>Save PIN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cancel} onPress={onCancel}>
        <Text style={s.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
