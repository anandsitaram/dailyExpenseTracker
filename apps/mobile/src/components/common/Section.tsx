import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import s from '../../styles/styles.js';

export interface SectionProps {
  title: string;
  children: ReactNode;
}

export const Section = ({ title, children }: SectionProps) => (
  <View style={s.section}>
    <Text style={s.heading}>{title}</Text>
    {children}
  </View>
);
