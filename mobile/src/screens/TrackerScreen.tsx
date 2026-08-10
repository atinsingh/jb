import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getMyApplications } from '../api/endpoints';
import type { Application } from '../api/endpoints';
import { colors, radius, spacing, typography } from '../theme';

export default function TrackerScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['applications'],
    queryFn: getMyApplications,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load applications</Text>
        <Text style={styles.centerText}>
          {error instanceof Error ? error.message : 'Something went wrong'}
        </Text>
        <Pressable style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const applications = data?.applications ?? [];

  if (applications.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No applications yet</Text>
        <Text style={styles.centerText}>
          Applications you submit will appear here so you can track their status.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={applications}
      keyExtractor={(item, i) => String(item.id ?? item._id ?? i)}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => <ApplicationCard app={item} />}
    />
  );
}

function ApplicationCard({ app }: { app: Application }) {
  return (
    <View style={styles.card}>
      <Text style={styles.jobTitle} numberOfLines={2}>
        {app.jobTitle ?? 'Application'}
      </Text>
      {app.companyName ? (
        <Text style={styles.company}>{app.companyName}</Text>
      ) : null}
      {app.status ? (
        <View style={styles.statusChip}>
          <Text style={styles.statusText}>{app.status}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  jobTitle: { ...typography.title, color: colors.ink },
  company: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.label, color: colors.green },
  center: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: { ...typography.h2, color: colors.ink },
  errorTitle: { ...typography.h2, color: colors.danger },
  retry: {
    marginTop: spacing.lg,
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { ...typography.title, color: colors.white },
});
