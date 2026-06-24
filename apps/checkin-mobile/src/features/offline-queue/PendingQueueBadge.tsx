import React from 'react';
import { Text, View } from 'react-native';

export function PendingQueueBadge({ count }: { readonly count: number }): React.JSX.Element | null {
  return count > 0 ? (
    <View accessibilityLabel="Pending offline scans">
      <Text>{count} pending</Text>
    </View>
  ) : null;
}
