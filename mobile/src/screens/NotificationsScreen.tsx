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

import { getNotifications } from '../api/endpoints';
import type { AppNotification } from '../api/endpoints';
import { colors, radius, spacing, typography } from '../theme';

export default function NotificationsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
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
        <Text style={styles.errorTitle}>Couldn't load notifications</Text>
        <Text style={styles.centerText}>
          {error instanceof Error ? error.message : 'Something went wrong'}
        </Text>
        <Pressable style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const notifications = data?.notifications ?? [];

  if (notifications.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>You're all caught up</Text>
        <Text style={styles.centerText}>
          Alerts about matches and applications will show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={notifications}
      keyExtractor={(item, i) => String(item.id ?? item._id ?? i)}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => <NotificationCard item={item} />}
    />
  );
}

function NotificationCard({ item }: { item: AppNotification }) {
  const body = item.message ?? item.body;
  return (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
      {item.title ? (
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      ) : null}
      {body ? (
        <Text style={styles.body} numberOfLines={3}>
          {body}
        </Text>
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
  cardUnread: { borderColor: colors.green, borderWidth: 2 },
  title: { ...typography.title, color: colors.ink },
  body: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
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
