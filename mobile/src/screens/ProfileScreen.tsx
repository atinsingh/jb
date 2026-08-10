import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { getPreferences, getResume } from '../api/endpoints';
import type { Preferences, ResumeSummary } from '../api/endpoints';
import { colors, radius, spacing, typography } from '../theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const name = user?.name ?? '—';
  const email = user?.email ?? '—';
  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase();

  const resumeQuery = useQuery({
    queryKey: ['resume'],
    queryFn: getResume,
  });
  const prefsQuery = useQuery({
    queryKey: ['preferences'],
    queryFn: getPreferences,
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{name}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>
        {user?.role ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{user.role}</Text>
          </>
        ) : null}
      </View>

      <ResumeSection query={resumeQuery} />
      <PreferencesSection query={prefsQuery} />

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ resume --- */

type ResumeQuery = ReturnType<typeof useQuery<ResumeSummary[], Error>>;

function ResumeSection({ query }: { query: ResumeQuery }) {
  const { data, isLoading, isError, error } = query;

  const resumes = data ?? [];
  const primary = resumes.find((r) => r.isPrimary || r.isDefault) ?? resumes[0];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Résumé</Text>
      <View style={styles.card}>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <Text style={styles.error}>
            {error instanceof Error ? error.message : "Couldn't load résumé"}
          </Text>
        ) : !primary ? (
          <Empty text="No résumé yet. Build one on the web app to see it here." />
        ) : (
          <>
            <Text style={styles.value}>{primary.name ?? 'Untitled résumé'}</Text>
            {primary.targetRole ? (
              <Text style={styles.subValue}>{primary.targetRole}</Text>
            ) : null}
            <View style={styles.metaChips}>
              {typeof primary.sections?.skillsCount === 'number' &&
              primary.sections.skillsCount > 0 ? (
                <Pill text={`${primary.sections.skillsCount} skills`} />
              ) : null}
              {typeof primary.sections?.experienceCount === 'number' &&
              primary.sections.experienceCount > 0 ? (
                <Pill text={`${primary.sections.experienceCount} experience`} />
              ) : null}
              {typeof primary.atsScore === 'number' ? (
                <Pill text={`ATS ${primary.atsScore}`} />
              ) : null}
            </View>
            {resumes.length > 1 ? (
              <Text style={styles.hint}>
                +{resumes.length - 1} more résumé
                {resumes.length - 1 === 1 ? '' : 's'}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- preferences --- */

type PrefsQuery = ReturnType<
  typeof useQuery<{ message: string; preferences: Preferences }, Error>
>;

function PreferencesSection({ query }: { query: PrefsQuery }) {
  const { data, isLoading, isError, error } = query;
  const prefs = data?.preferences;

  const titles = prefs?.titles ?? [];
  const locations = prefs?.locations ?? [];
  const workplaces = prefs?.workplaceTypes ?? [];
  const hasSalary = typeof prefs?.salaryMin === 'number' && prefs.salaryMin > 0;
  const isEmpty =
    !prefs ||
    (titles.length === 0 &&
      locations.length === 0 &&
      workplaces.length === 0 &&
      !hasSalary &&
      prefs.remoteOnly == null);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <Text style={styles.error}>
            {error instanceof Error
              ? error.message
              : "Couldn't load preferences"}
          </Text>
        ) : isEmpty ? (
          <Empty text="No job preferences set yet. Add them on the web app." />
        ) : (
          <>
            <Row label="Titles" value={titles.join(', ') || '—'} />
            <View style={styles.divider} />
            <Row label="Locations" value={locations.join(', ') || '—'} />
            <View style={styles.divider} />
            <Row
              label="Remote"
              value={prefs?.remoteOnly ? 'Remote only' : 'Open to on-site'}
            />
            {workplaces.length > 0 ? (
              <>
                <View style={styles.divider} />
                <Row label="Workplace" value={workplaces.join(', ')} />
              </>
            ) : null}
            {hasSalary ? (
              <>
                <View style={styles.divider} />
                <Row
                  label="Minimum salary"
                  value={`${prefs?.salaryCurrency ?? 'USD'} ${(
                    prefs?.salaryMin as number
                  ).toLocaleString()}${
                    prefs?.salaryPeriod ? ` / ${prefs.salaryPeriod}` : ''
                  }`}
                />
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- primitives --- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={colors.green} />
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, alignItems: 'stretch' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: colors.white },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { ...typography.title, color: colors.ink, marginTop: spacing.xs },
  subValue: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  pill: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  pillText: { ...typography.label, color: colors.ink },
  hint: { ...typography.small, color: colors.muted, marginTop: spacing.md },
  empty: { ...typography.body, color: colors.muted },
  error: { ...typography.body, color: colors.danger },
  loadingRow: { alignItems: 'flex-start' },
  signOut: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  signOutText: { ...typography.title, color: colors.danger },
});
