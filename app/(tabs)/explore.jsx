import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadNotes, saveNotes } from '@/lib/notes-store';

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

export default function ArchiveScreen() {
  const accent = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({ light: '#9A6B86', dark: '#D6A5C0' }, 'icon');
  const surfaceColor = useThemeColor({ light: '#FFE9F3', dark: '#23101A' }, 'background');
  const cardColor = useThemeColor({ light: '#FFF9FC', dark: '#1F1119' }, 'background');
  const borderColor = useThemeColor({ light: '#F2C7DA', dark: '#3A2230' }, 'icon');
  const dangerColor = useThemeColor({ light: '#B42318', dark: '#F97066' }, 'text');

  const [notes, setNotes] = useState([]);
  const [activeView, setActiveView] = useState('Archive');

  const loadAll = useCallback(async () => {
    const savedNotes = await loadNotes();
    setNotes(savedNotes);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const persistNotes = useCallback((nextNotes) => {
    setNotes(nextNotes);
    saveNotes(nextNotes);
  }, []);

  const archivedNotes = useMemo(
    () => notes.filter((note) => note.archived && !note.trashed),
    [notes]
  );
  const trashedNotes = useMemo(() => notes.filter((note) => note.trashed), [notes]);

  const handleRestore = (id) => {
    persistNotes(
      notes.map((note) =>
        note.id === id ? { ...note, archived: false, trashed: false, updatedAt: Date.now() } : note
      )
    );
  };

  const handleUnarchive = (id) => {
    persistNotes(
      notes.map((note) =>
        note.id === id ? { ...note, archived: false, updatedAt: Date.now() } : note
      )
    );
  };

  const handleDeleteForever = (id) => {
    persistNotes(notes.filter((note) => note.id !== id));
  };

  const handleEmptyTrash = () => {
    persistNotes(notes.filter((note) => !note.trashed));
  };

  const list = activeView === 'Archive' ? archivedNotes : trashedNotes;

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <ThemedText type="title">{activeView}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
            {activeView === 'Archive' ? archivedNotes.length : trashedNotes.length} notes
          </ThemedText>
        </View>
        {activeView === 'Trash' && trashedNotes.length > 0 ? (
          <Pressable onPress={handleEmptyTrash} style={styles.headerAction}>
            <ThemedText style={{ color: dangerColor }}>Empty</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmented}>
        {['Archive', 'Trash'].map((label) => {
          const isActive = label === activeView;
          return (
            <Pressable
              key={label}
              style={[
                styles.segment,
                {
                  backgroundColor: isActive ? accent : surfaceColor,
                  borderColor: isActive ? accent : borderColor,
                },
              ]}
              onPress={() => setActiveView(label)}
            >
              <ThemedText
                lightColor={isActive ? '#FFFFFF' : undefined}
                darkColor={isActive ? '#11181C' : undefined}
                type="defaultSemiBold"
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={[styles.emptyState, { borderColor }]}>
            <ThemedText type="subtitle">Nothing here</ThemedText>
            <ThemedText style={{ color: mutedColor }}>
              {activeView === 'Archive'
                ? 'Archived notes will show up here.'
                : 'Trashed notes will show up here.'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {list.map((note) => (
              <View
                key={note.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    shadowColor: borderColor,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">{note.title || 'Untitled'}</ThemedText>
                <ThemedText style={[styles.preview, { color: mutedColor }]} numberOfLines={2}>
                  {note.body || 'No content yet.'}
                </ThemedText>
                <View style={styles.metaRow}>
                  <ThemedText style={[styles.metaText, { color: mutedColor }]}>
                    {formatDate(note.updatedAt)}
                  </ThemedText>
                  <View style={[styles.tag, { borderColor }]}>
                    <ThemedText style={[styles.tagText, { color: mutedColor }]}>
                      {note.tag}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  {activeView === 'Archive' ? (
                    <>
                      <Pressable
                        onPress={() => handleUnarchive(note.id)}
                        style={[styles.actionButton, { borderColor }]}
                      >
                        <ThemedText style={{ color: mutedColor }}>Restore</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteForever(note.id)}
                        style={[styles.actionButton, { borderColor }]}
                      >
                        <ThemedText style={{ color: dangerColor }}>Delete</ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => handleRestore(note.id)}
                        style={[styles.actionButton, { borderColor }]}
                      >
                        <ThemedText style={{ color: mutedColor }}>Restore</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteForever(note.id)}
                        style={[styles.actionButton, { borderColor }]}
                      >
                        <ThemedText style={{ color: dangerColor }}>Delete forever</ThemedText>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
  },
  headerAction: {
    padding: 8,
  },
  segmented: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    paddingBottom: 80,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  cardGrid: {
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  preview: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metaText: {
    fontSize: 12,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
