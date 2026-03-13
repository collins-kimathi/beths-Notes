import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = 'notes.v1';
const SETTINGS_KEY = 'notes.settings.v1';

export const DEFAULT_SETTINGS = {
  voiceCommandMode: false,
  defaultTag: 'Personal',
  language: 'en-US',
};

export const DEFAULT_TAGS = ['Work', 'Personal', 'Ideas', 'Tasks'];

export async function loadNotes() {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeNotes(parsed);
  } catch (error) {
    console.warn('Failed to load notes', error);
    return [];
  }
}

export async function saveNotes(notes) {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn('Failed to save notes', error);
  }
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.warn('Failed to load settings', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings', error);
  }
}

export function normalizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .filter((note) => note && note.id)
    .map((note) => {
      const createdAt = typeof note.createdAt === 'number' ? note.createdAt : Date.now();
      const updatedAt =
        typeof note.updatedAt === 'number' ? note.updatedAt : typeof note.createdAt === 'number'
          ? note.createdAt
          : createdAt;

      return {
        id: String(note.id),
        title: typeof note.title === 'string' ? note.title : '',
        body: typeof note.body === 'string' ? note.body : '',
        tag: typeof note.tag === 'string' ? note.tag : DEFAULT_SETTINGS.defaultTag,
        pinned: Boolean(note.pinned),
        archived: Boolean(note.archived),
        trashed: Boolean(note.trashed),
        createdAt,
        updatedAt,
      };
    });
}
