import React from 'react';
import { View, Text } from 'react-native';
import s from '../../styles/styles';

export interface StatProps {
  t: string;
  v: string | number;
}

export const Stat = ({ t, v }: StatProps) => (
  <View style={s.stat}>
    <Text style={s.muted}>{t}</Text>
    <Text style={s.statValue}>{v}</Text>
  </View>
);
