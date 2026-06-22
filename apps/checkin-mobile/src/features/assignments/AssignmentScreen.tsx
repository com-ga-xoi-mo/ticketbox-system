import React from 'react';
import { Button, Text, View } from 'react-native';

import type { StaffAssignment } from '../../api/checkin-mobile-api.types';
import type { AssignmentState } from './assignment-state';

export interface AssignmentScreenProps {
  readonly state: AssignmentState;
  readonly onRetry: () => void;
  readonly onSelect: (assignmentId: string) => void;
  readonly onOpenScanner: () => void;
}

export function AssignmentScreen({
  state,
  onRetry,
  onSelect,
  onOpenScanner,
}: AssignmentScreenProps): React.JSX.Element {
  if (state.status === 'loading') {
    return <Text>Loading assignments...</Text>;
  }

  if (state.status === 'empty') {
    return <Text>No active check-in assignments.</Text>;
  }

  if (state.status === 'error') {
    return (
      <View>
        <Text>{state.message}</Text>
        <Button onPress={onRetry} title="Retry" />
      </View>
    );
  }

  if (state.status !== 'loaded') {
    return <Text>Assignments are not loaded.</Text>;
  }

  return (
    <View>
      <Text>Select assignment</Text>
      {state.assignments.map((assignment: StaffAssignment) => (
        <Button
          key={assignment.assignmentId}
          onPress={() => onSelect(assignment.assignmentId)}
          title={`${assignment.concertTitle}${assignment.gate ? ` - ${assignment.gate}` : ''}`}
        />
      ))}
      <Text>Selected: {state.selected.concertTitle}</Text>
      <Button onPress={onOpenScanner} title="Open scanner" />
    </View>
  );
}
