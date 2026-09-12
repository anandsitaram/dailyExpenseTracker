import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Pencil, Trash2 } from 'lucide-react-native';
import { formatCurrency, isIncomeCategory } from '../../../../core/src/index.js';
import { Category, Expense } from '../../../../core/src/types.js';
import s from '../../styles/styles.js';

export interface RowProps {
  e: Expense;
  cats: Category[];
  currency?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string | undefined) => void;
}

export const Row = ({ e, cats, currency = 'INR', onEdit, onDelete }: RowProps) => {
  const c = cats.find((item) => item.id === e.category);
  const label = e.description || c?.name || 'Uncategorized';
  const isInc = isIncomeCategory(cats, e.category);

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity
        style={s.swipeEdit}
        onPress={() => onEdit(e)}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
      >
        <Pencil size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.swipeDelete}
        onPress={() => onDelete(e.id)}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${label}`}
      >
        <Trash2 size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={[s.row, isInc && s.incomeRow]}>
        <Text style={s.emoji}>{c?.icon || '📦'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.bold}>{label}</Text>
          <Text style={s.muted}>
            {c?.name || 'Uncategorized'} · {e.date}
            {e.recurringId ? ' · 🔁' : ''}
          </Text>
        </View>
        <Text style={[s.bold, isInc && s.positive]}>
          {isInc ? '+' : ''}
          {formatCurrency(e.amount, currency)}
        </Text>
        <TouchableOpacity
          onPress={() => onEdit(e)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
        >
          <Text style={s.linkBtn}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(e.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${label}`}
        >
          <Text style={s.danger}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};
