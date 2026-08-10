import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { applyToJob, getJob } from '../api/endpoints';
import type { Job, Match } from '../api/endpoints';
import type { MatchesStackParamList } from '../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../theme';

type JobDetailRoute = RouteProp<MatchesStackParamList, 'JobDetail'>;

export default function JobDetailScreen() {
  const { params } = useRoute<JobDetailRoute>();
  const match = params.job;
  const jobId = match.id;
  const queryClient = useQueryClient();

  // Full job document (description, requirements, salary, apply URLs).
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId),
    enabled: !!jobId,
  });

  const job: Job | undefined = data?.job;
  // Some fields only exist on the full job; fall back to the passed match.
  const usingFallback = isError || (!isLoading && !job);

  const applyMutation = useMutation({
    mutationFn: () => applyToJob(jobId),
    onSuccess: () => {
      // Reflect the new application across the app.
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  const alreadyApplied =
    applyMutation.isError &&
    /already/i.test(
      applyMutation.error instanceof Error ? applyMutation.error.message : '',
    );
  const applied = applyMutation.isSuccess || alreadyApplied;

  const title = job?.title ?? match.title;
  const company = job?.companyName ?? match.companyName ?? 'Unknown company';
  const location = job?.location ?? match.location;
  const workplace = job?.workplaceType ?? match.workplaceType;
  const salary =
    job?.salary && job.salary !== 'Not specified' ? job.salary : undefined;
  const description = job?.description?.trim();
  const requirements = (job?.requirements ?? []).filter(Boolean);
  const skills = (job?.skills ?? []).filter(Boolean);
  const matchedSkills = match.matchedSkills ?? [];
  const missingSkills = match.missingSkills ?? [];
  const score =
    typeof match.matchScore === 'number' ? Math.round(match.matchScore) : null;
  const safe = match.eligibility?.autoApplySafe;
  const applyUrl =
    job?.originalApplyUrl?.trim() ||
    job?.externalUrl?.trim() ||
    match.externalUrl?.trim() ||
    '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {/* --- header --- */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.company}>{company}</Text>
        </View>
        {score != null ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>match</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {location ? <Text style={styles.meta}>{location}</Text> : null}
        {workplace && workplace !== 'UNSPECIFIED' ? (
          <Text style={styles.meta}>· {workplace}</Text>
        ) : null}
        {salary ? <Text style={styles.meta}>· {salary}</Text> : null}
      </View>

      <View style={styles.chipRow}>
        {match.matchLabel ? (
          <View style={[styles.chip, styles.chipNeutral]}>
            <Text style={styles.chipText}>{match.matchLabel}</Text>
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

      {/* --- actions --- */}
      <Pressable
        style={[styles.applyBtn, (applied || applyMutation.isPending) && styles.applyBtnDone]}
        onPress={() => applyMutation.mutate()}
        disabled={applied || applyMutation.isPending}
      >
        {applyMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.applyText}>
            {applied
              ? alreadyApplied
                ? 'Already applied ✓'
                : 'Applied ✓'
              : 'Apply'}
          </Text>
        )}
      </Pressable>

      {applyMutation.isError && !alreadyApplied ? (
        <Text style={styles.applyError}>
          {applyMutation.error instanceof Error
            ? applyMutation.error.message
            : "Couldn't submit application"}
        </Text>
      ) : null}

      {applyUrl ? (
        <Pressable
          style={styles.openBtn}
          onPress={() => Linking.openURL(applyUrl)}
        >
          <Text style={styles.openText}>Open posting ↗</Text>
        </Pressable>
      ) : null}

      {/* --- matched / missing skills --- */}
      {matchedSkills.length > 0 ? (
        <Section title="Matched skills">
          <SkillChips items={matchedSkills} tone="safe" />
        </Section>
      ) : null}
      {missingSkills.length > 0 ? (
        <Section title="Missing skills">
          <SkillChips items={missingSkills} tone="warn" />
        </Section>
      ) : null}

      {/* --- full job body --- */}
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.loadingText}>Loading full posting…</Text>
        </View>
      ) : null}

      {usingFallback ? (
        <Text style={styles.note}>
          Showing summary details only — the full posting couldn't be loaded
          {error instanceof Error ? ` (${error.message})` : ''}.
        </Text>
      ) : null}

      {skills.length > 0 ? (
        <Section title="Skills">
          <SkillChips items={skills} tone="neutral" />
        </Section>
      ) : null}

      {description ? (
        <Section title="Description">
          <Text style={styles.body}>{description}</Text>
        </Section>
      ) : null}

      {requirements.length > 0 ? (
        <Section title="Requirements">
          {requirements.map((r, i) => (
            <View style={styles.bullet} key={`${i}-${r.slice(0, 12)}`}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SkillChips({
  items,
  tone,
}: {
  items: string[];
  tone: 'safe' | 'warn' | 'neutral';
}) {
  return (
    <View style={styles.chipRow}>
      {items.map((s, i) => (
        <View
          key={`${i}-${s}`}
          style={[
            styles.chip,
            tone === 'safe'
              ? styles.chipSafe
              : tone === 'warn'
                ? styles.chipWarn
                : styles.chipNeutral,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              tone === 'safe'
                ? styles.chipSafeText
                : tone === 'warn'
                  ? styles.chipWarnText
                  : undefined,
            ]}
          >
            {s}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, paddingRight: spacing.md },
  title: { ...typography.h2, color: colors.ink },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  chipNeutral: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSafe: { backgroundColor: '#E1F0E3' },
  chipWarn: { backgroundColor: '#F6EFDD' },
  chipText: { ...typography.label, color: colors.ink },
  chipSafeText: { color: colors.green },
  chipWarnText: { color: '#8A6D1A' },
  applyBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  applyBtnDone: { opacity: 0.55 },
  applyText: { ...typography.title, color: colors.white },
  applyError: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  openBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  openText: { ...typography.title, color: colors.green },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  body: { ...typography.body, color: colors.ink, lineHeight: 22 },
  bullet: { flexDirection: 'row', marginBottom: spacing.sm },
  bulletDot: { ...typography.body, color: colors.green, marginRight: spacing.sm },
  bulletText: { ...typography.body, color: colors.ink, flex: 1, lineHeight: 22 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loadingText: { ...typography.body, color: colors.muted, marginLeft: spacing.sm },
  note: {
    ...typography.small,
    color: colors.muted,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
});
