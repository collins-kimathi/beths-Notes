import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
  loadNotes,
  loadSettings,
  saveNotes,
  saveSettings,
} from "@/lib/notes-store";

const createDraft = (defaultTag) => ({
  id: null,
  title: "",
  body: "",
  tag: defaultTag,
  pinned: false,
  archived: false,
  trashed: false,
  createdAt: null,
  updatedAt: null,
});

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));

export default function NotesScreen() {
  const accent = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor(
    { light: "#9A6B86", dark: "#D6A5C0" },
    "icon",
  );
  const surfaceColor = useThemeColor(
    { light: "#FFE9F3", dark: "#23101A" },
    "background",
  );
  const cardColor = useThemeColor(
    { light: "#FFF9FC", dark: "#1F1119" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#F2C7DA", dark: "#3A2230" },
    "icon",
  );
  const dangerColor = useThemeColor(
    { light: "#B42318", dark: "#F97066" },
    "text",
  );
  const decorColor = useThemeColor(
    { light: "#F8CDE0", dark: "#3B1A2A" },
    "background",
  );
  const decorAccent = useThemeColor(
    { light: "#F3B2CD", dark: "#2C1422" },
    "background",
  );

  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [editorVisible, setEditorVisible] = useState(false);
  const [draft, setDraft] = useState(createDraft(DEFAULT_SETTINGS.defaultTag));

  // ── Note helpers ───────────────────────────────────────────────────────────

  const appendToBody = useCallback((text) => {
    setDraft((prev) => {
      const spacer = prev.body && !prev.body.endsWith(" ") ? " " : "";
      return { ...prev, body: `${prev.body}${spacer}${text}`.trimStart() };
    });
  }, []);

  // voiceActionsRef always holds the latest note-action callbacks so that
  // runVoiceCommand never captures stale closures. The ref is populated after
  // the action functions are defined (see "Populate ref" section below).
  const voiceActionsRef = useRef({});

  const runVoiceCommand = useCallback(
    (phrase) => {
      const command = phrase.toLowerCase().trim();
      const {
        openEditor,
        handleSave,
        handleTrash,
        toggleArchive,
        togglePinned,
      } = voiceActionsRef.current;

      if (command === "new note") {
        openEditor?.();
        return;
      }
      if (command === "save note") {
        handleSave?.();
        return;
      }
      if (command === "delete note") {
        handleTrash?.();
        return;
      }
      if (command === "archive note") {
        toggleArchive?.();
        return;
      }
      if (command === "pin note") {
        togglePinned?.();
        return;
      }
      if (command.startsWith("title ")) {
        setDraft((prev) => ({ ...prev, title: phrase.slice(6).trim() }));
        return;
      }
      if (command.startsWith("tag ")) {
        setDraft((prev) => ({
          ...prev,
          tag: phrase.slice(4).trim() || prev.tag,
        }));
        return;
      }
      appendToBody(phrase);
    },
    [appendToBody],
  );

  // ── Speech hook ────────────────────────────────────────────────────────────

  const {
    listening,
    liveTranscript,
    speechError,
    toggleListening,
    stopListening,
    clearError,
  } = useSpeechToText({
    language: settings.language,
    voiceCommandMode: settings.voiceCommandMode,
    onTranscript: appendToBody,
    onCommand: runVoiceCommand,
  });

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [savedNotes, savedSettings] = await Promise.all([
      loadNotes(),
      loadSettings(),
    ]);
    setNotes(savedNotes);
    setSettings(savedSettings);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  // ── Note CRUD ──────────────────────────────────────────────────────────────

  const updateNotes = useCallback((updater) => {
    setNotes((prev) => {
      const nextNotes = typeof updater === "function" ? updater(prev) : updater;
      saveNotes(nextNotes);
      return nextNotes;
    });
  }, []);

  const tagOptions = useMemo(() => {
    const seen = new Set(DEFAULT_TAGS);
    if (settings.defaultTag) seen.add(settings.defaultTag);
    notes.forEach((note) => {
      if (note.tag) seen.add(note.tag);
    });
    return ["All", ...Array.from(seen)];
  }, [notes, settings.defaultTag]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      if (note.trashed || note.archived) return false;
      if (activeTag !== "All" && note.tag !== activeTag) return false;
      if (!query) return true;
      return (
        note.title.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query)
      );
    });
    return filtered.slice().sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeTag, searchQuery]);

  const pinnedNotes = visibleNotes.filter((note) => note.pinned);
  const otherNotes = visibleNotes.filter((note) => !note.pinned);

  // ── Editor actions ─────────────────────────────────────────────────────────

  const openEditor = (note) => {
    if (note) {
      setDraft({ ...note });
    } else {
      setDraft(createDraft(settings.defaultTag));
    }
    clearError();
    setEditorVisible(true);
  };

  const closeEditor = () => {
    stopListening();
    setEditorVisible(false);
    setDraft(createDraft(settings.defaultTag));
    clearError();
  };

  const togglePinned = () =>
    setDraft((prev) => ({ ...prev, pinned: !prev.pinned }));
  const toggleArchive = () =>
    setDraft((prev) => ({ ...prev, archived: !prev.archived }));

  const handleSave = () => {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) {
      closeEditor();
      return;
    }

    const now = Date.now();
    if (draft.id) {
      updateNotes((prev) =>
        prev.map((note) =>
          note.id === draft.id
            ? {
                ...note,
                ...draft,
                title: title || "Untitled",
                body,
                updatedAt: now,
              }
            : note,
        ),
      );
    } else {
      const id = `${now}-${Math.random().toString(16).slice(2, 8)}`;
      updateNotes((prev) => [
        {
          ...draft,
          id,
          title: title || "Untitled",
          body,
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
    }
    closeEditor();
  };

  const handleTrash = () => {
    if (!draft.id) {
      closeEditor();
      return;
    }
    updateNotes((prev) =>
      prev.map((note) =>
        note.id === draft.id
          ? { ...note, trashed: true, updatedAt: Date.now() }
          : note,
      ),
    );
    closeEditor();
  };

  const handleVoiceModeToggle = () => {
    const next = { ...settings, voiceCommandMode: !settings.voiceCommandMode };
    setSettings(next);
    saveSettings(next);
  };

  const handleTagChange = (tag) => setDraft((prev) => ({ ...prev, tag }));

  // ── Populate ref ────────────────────────────────────────────────────────────
  // Keep the ref in sync each render so runVoiceCommand always calls the
  // latest versions of these functions without needing them as hook deps.
  voiceActionsRef.current = {
    openEditor,
    handleSave,
    handleTrash,
    toggleArchive,
    togglePinned,
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderNoteCard = (note) => (
    <Pressable
      key={note.id}
      style={[
        styles.card,
        { backgroundColor: cardColor, borderColor, shadowColor: borderColor },
      ]}
      onPress={() => openEditor(note)}
    >
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">
          {note.title || "Untitled"}
        </ThemedText>
        {note.pinned ? (
          <ThemedText style={{ color: accent }}>Pinned</ThemedText>
        ) : null}
      </View>
      <ThemedText
        style={[styles.preview, { color: mutedColor }]}
        numberOfLines={2}
      >
        {note.body || "No content yet."}
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
    </Pressable>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.decorLayer} pointerEvents="none">
        <View
          style={[
            styles.decorCircle,
            { backgroundColor: decorColor, top: -60, right: -40 },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            {
              backgroundColor: decorAccent,
              width: 160,
              height: 160,
              bottom: 120,
              left: -60,
            },
          ]}
        />
      </View>

      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title">Beth&apos;s Notes</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
            A gentle space for ideas and moments
          </ThemedText>
        </View>
        <Pressable
          style={[styles.newButton, { backgroundColor: accent }]}
          onPress={() => openEditor()}
        >
          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#11181C"
            type="defaultSemiBold"
          >
            New Note
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView
        lightColor={surfaceColor}
        darkColor={surfaceColor}
        style={[styles.searchBar, { borderColor }]}
      >
        <TextInput
          placeholder="Search notes"
          placeholderTextColor={mutedColor}
          style={[styles.searchInput, { color: textColor }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterRow}>
          {tagOptions.map((label) => {
            const isActive = label === activeTag;
            return (
              <Pressable
                key={label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? accent : surfaceColor,
                    borderColor: isActive ? accent : borderColor,
                  },
                ]}
                onPress={() => setActiveTag(label)}
              >
                <ThemedText
                  lightColor={isActive ? "#FFFFFF" : undefined}
                  darkColor={isActive ? "#11181C" : undefined}
                  type="defaultSemiBold"
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {visibleNotes.length === 0 ? (
          <View style={[styles.emptyState, { borderColor }]}>
            <ThemedText type="subtitle">No notes yet</ThemedText>
            <ThemedText style={{ color: mutedColor }}>
              Tap "New Note" or use the mic inside the editor to capture
              something sweet for Beth.
            </ThemedText>
          </View>
        ) : (
          <>
            {pinnedNotes.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Pinned</ThemedText>
                  <ThemedText style={{ color: mutedColor }}>
                    {pinnedNotes.length}
                  </ThemedText>
                </View>
                <View style={styles.cardGrid}>
                  {pinnedNotes.map(renderNoteCard)}
                </View>
              </>
            ) : null}
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">All Notes</ThemedText>
              <ThemedText style={{ color: mutedColor }}>
                {otherNotes.length}
              </ThemedText>
            </View>
            <View style={styles.cardGrid}>
              {otherNotes.map(renderNoteCard)}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: accent }]}
        onPress={() => openEditor()}
      >
        <ThemedText lightColor="#FFFFFF" darkColor="#11181C" type="title">
          +
        </ThemedText>
      </Pressable>

      <Modal
        visible={editorVisible}
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <ThemedView style={styles.editorScreen}>
          <View style={styles.editorHeader}>
            <Pressable onPress={closeEditor} style={styles.editorAction}>
              <ThemedText style={{ color: mutedColor }}>Close</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">
              {draft.id ? "Edit Note" : "New Note"}
            </ThemedText>
            <Pressable onPress={handleSave} style={styles.editorAction}>
              <ThemedText type="defaultSemiBold" style={{ color: accent }}>
                Save
              </ThemedText>
            </Pressable>
          </View>

          <TextInput
            placeholder="Title"
            placeholderTextColor={mutedColor}
            style={[styles.titleInput, { color: textColor }]}
            value={draft.title}
            onChangeText={(text) =>
              setDraft((prev) => ({ ...prev, title: text }))
            }
          />

          <View style={styles.editorRow}>
            <Pressable
              style={[
                styles.editorPill,
                { borderColor, backgroundColor: surfaceColor },
              ]}
              onPress={togglePinned}
            >
              <ThemedText style={{ color: mutedColor }}>
                {draft.pinned ? "Pinned" : "Pin"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.editorPill,
                { borderColor, backgroundColor: surfaceColor },
              ]}
              onPress={toggleArchive}
            >
              <ThemedText style={{ color: mutedColor }}>
                {draft.archived ? "Archived" : "Archive"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.editorPill,
                { borderColor, backgroundColor: surfaceColor },
              ]}
              onPress={handleTrash}
            >
              <ThemedText style={{ color: dangerColor }}>Trash</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent}>
            <ThemedText style={[styles.sectionLabel, { color: mutedColor }]}>
              Tag
            </ThemedText>
            <View style={styles.filterRow}>
              {tagOptions
                .filter((tag) => tag !== "All")
                .map((tag) => {
                  const isActive = tag === draft.tag;
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? accent : surfaceColor,
                          borderColor: isActive ? accent : borderColor,
                        },
                      ]}
                      onPress={() => handleTagChange(tag)}
                    >
                      <ThemedText
                        lightColor={isActive ? "#FFFFFF" : undefined}
                        darkColor={isActive ? "#11181C" : undefined}
                        type="defaultSemiBold"
                      >
                        {tag}
                      </ThemedText>
                    </Pressable>
                  );
                })}
            </View>

            <ThemedText style={[styles.sectionLabel, { color: mutedColor }]}>
              Note
            </ThemedText>
            <TextInput
              placeholder="Write your note..."
              placeholderTextColor={mutedColor}
              style={[styles.bodyInput, { color: textColor, borderColor }]}
              value={draft.body}
              onChangeText={(text) =>
                setDraft((prev) => ({ ...prev, body: text }))
              }
              multiline
              textAlignVertical="top"
            />

            <View
              style={[
                styles.voicePanel,
                { borderColor, backgroundColor: surfaceColor },
              ]}
            >
              <View style={styles.voiceRow}>
                <View style={styles.voiceInfo}>
                  <ThemedText type="defaultSemiBold">Voice input</ThemedText>
                  <ThemedText style={{ color: mutedColor, marginTop: 4 }}>
                    {settings.voiceCommandMode
                      ? 'Commands: "new note", "save note", "pin note", "archive note", "title \u2026", "tag \u2026"'
                      : "Dictate to append text to the note."}
                  </ThemedText>
                </View>
                <Switch
                  value={settings.voiceCommandMode}
                  onValueChange={handleVoiceModeToggle}
                  trackColor={{ true: accent, false: borderColor }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.voiceRow}>
                <Pressable
                  style={[
                    styles.voiceButton,
                    { backgroundColor: listening ? borderColor : accent },
                  ]}
                  onPress={toggleListening}
                >
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#11181C"
                    type="defaultSemiBold"
                  >
                    {listening ? "Stop" : "Start"} Mic
                  </ThemedText>
                </Pressable>
                {liveTranscript ? (
                  <ThemedText style={{ color: mutedColor }}>
                    {liveTranscript}
                  </ThemedText>
                ) : null}
              </View>

              {speechError ? (
                <ThemedText style={{ color: dangerColor }}>
                  {speechError}
                </ThemedText>
              ) : null}
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  decorLayer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  decorCircle: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 16,
  },
  subtitle: { marginTop: 6, fontSize: 14 },
  newButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  searchBar: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: { fontSize: 16 },
  content: { paddingBottom: 140 },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardGrid: { gap: 14, marginBottom: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  preview: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metaText: { fontSize: 12 },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  emptyState: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 },
  editorScreen: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editorAction: { padding: 6 },
  titleInput: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  editorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  editorPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editorContent: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bodyInput: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  voicePanel: { borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  voiceInfo: { flex: 1 },
  voiceButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
