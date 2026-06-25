import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';

import { ui } from '../../theme/paper-theme';

export type AppTab = 'scan' | 'sync';

export interface BottomTabBarProps {
  readonly tab: AppTab;
  readonly syncBadge: boolean;
  readonly onChange: (tab: AppTab) => void;
}

const TABS: ReadonlyArray<{ key: AppTab; label: string; icon: string }> = [
  { key: 'scan', label: 'Scan', icon: 'line-scan' },
  { key: 'sync', label: 'Sync', icon: 'sync' },
];

export function BottomTabBar({ tab, syncBadge, onChange }: BottomTabBarProps): React.JSX.Element {
  return (
    <Surface style={styles.bar} elevation={2}>
      {TABS.map((item) => {
        const active = item.key === tab;
        const color = active ? ui.primary : ui.textMuted;
        return (
          <TouchableRipple key={item.key} onPress={() => onChange(item.key)} style={styles.item}>
            <View style={styles.itemInner}>
              <View>
                <Icon source={item.icon} size={24} color={color} />
                {item.key === 'sync' && syncBadge ? <View style={styles.badge} /> : null}
              </View>
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </View>
          </TouchableRipple>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: ui.card,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
  },
  itemInner: {
    alignItems: 'center',
    gap: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.danger,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
