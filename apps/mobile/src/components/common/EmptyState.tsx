import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import s from '../../styles/styles';

export interface EmptyStateProps {
  icon: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, text, actionLabel, onAction }: EmptyStateProps) => (

  <View style={s.empty}>
    <Text style={s.emptyIcon}>{icon}</Text>
    <Text style={s.emptyText}>{text}</Text>
    {actionLabel && (
      <TouchableOpacity style={s.secondary} onPress={onAction}>
        <Text style={s.secondaryText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);
