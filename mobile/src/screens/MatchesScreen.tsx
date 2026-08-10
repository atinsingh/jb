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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMatches } from '../api/endpoints';
import type { Match } from '../api/endpoints';
import type { MatchesStackParamList } from '../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../theme';

type MatchesNav = NativeStackNavigationProp<
  MatchesStackParamList,
  'MatchesList'
>;

export default function MatchesScreen() {
  const navigation = useNavigation<MatchesNav>();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => getMatches(20),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
        <Text style={styles.centerText}>Finding your matches…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load matches</Text>
        <Text style={styles.centerText}>
          {error instanceof Error ? error.message : 'Something went wrong'}
        </Text>
        <Pressable style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const jobs = data?.jobs ?? [];

  if (jobs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.centerText}>
          Complete your profile and preferences so we can surface eligible jobs.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={jobs}
      keyExtractor={(item) => String(item.id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListHeaderComponent={
        <Text style={styles.count}>
          {data?.total ?? jobs.length} eligible{' '}
          {jobs.length === 1 ? 'match' : 'matches'}
        </Text>
      }
      renderItem={({ item }) => (
        <MatchCard
          job={item}
          onPress={() => navigation.navigate('JobDetail', { job: item })}
        />
      )}
    />
  );
}

function MatchCard({ job, onPress }: { job: Match; onPress: () => void }) {
  const score =
    typeof job.matchScore === 'number' ? Math.round(job.matchScore) : null;
  const safe = job.eligibility?.autoApplySafe;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {job.companyName ?? 'Unknown company'}
          </Text>
        </View>
        {score != null ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>match</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {job.location ? (
          <Text style={styles.meta} numberOfLines={1}>
            {job.location}
          </Text>
        ) : null}
        {job.workplaceType && job.workplaceType !== 'UNSPECIFIED' ? (
          <Text style={styles.meta}>· {job.workplaceType}</Text>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        {job.matchLabel ? (
          <View style={[styles.chip, styles.chipNeutral]}>
            <Text style={styles.chipText}>{job.matchLabel}</Text>
          </View>
        ) : null}
        {safe != null ? (
          <View style={[styles.chip, safe ? styles.chipSafe : styles.chipWarn]}>
            <Text
              style={[
                styles.chipText,
                safe ? styles.chipSafeText : styles.chipWarnText,
              ]}
            >
              {safe ? 'Auto-apply safe' : 'Review needed'}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  count: {
    ...typography.label,
    color: colors.muted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTextWrap: { flex: 1, paddingRight: spacing.md },
  jobTitle: { ...typography.title, color: colors.ink },
  company: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  scoreBadge: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 54,
  },
  scoreValue: { ...typography.title, color: colors.white },
  scoreLabel: { fontSize: 10, color: colors.white, opacity: 0.85 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  meta: { ...typography.small, color: colors.muted, marginRight: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  chipNeutral: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  chipSafe: { backgroundColor: '#E1F0E3' },
  chipWarn: { backgroundColor: '#F6EFDD' },
  chipText: { ...typography.label, color: colors.ink },
  chipSafeText: { color: colors.green },
  chipWarnText: { color: '#8A6D1A' },
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
