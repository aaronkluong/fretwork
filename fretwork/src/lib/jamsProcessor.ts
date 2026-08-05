
export interface JamsNote {
  time: number;
  duration: number;
  midi: number;
  string: number;
}

export interface TabSegment {
  time_start: number;
  time_end: number;
  suggested_chord: string;
  suggested_voicing: string;
  strumming_pattern: string;
  positions: { [key: string]: number | null };
  fingering: { [key: string]: number | null };
}

export interface JamsProcessedOutput {
  key_signature: string;
  tempo_bpm: number;
  tab_segments: TabSegment[];
}

const TIME_TOLERANCE = 0.05; // 50ms
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; // Low E to High E
const STRING_MAP: { [key: number]: string } = {
  0: 'string_6',
  1: 'string_5',
  2: 'string_4',
  3: 'string_3',
  4: 'string_2',
  5: 'string_1'
};

export interface JamsObservation {
  time: number;
  duration: number;
  value: string | number;
}

export interface JamsAnnotation {
  namespace: string;
  data: JamsObservation[];
}

export interface JamsRaw {
  annotations: JamsAnnotation[];
}

function normalizeJamsData(data: JamsObservation[]): JamsObservation[] {
  if (Array.isArray(data)) return data;
  return [];
}

export function processJams(rawJams: JamsRaw): JamsProcessedOutput {
  // Extract Key
  const keyAnno = rawJams.annotations.find((a) => a.namespace === 'key_mode');
  const keySignature = keyAnno && keyAnno.data[0] ? String(keyAnno.data[0].value) : "Unknown";

  // Extract Chords
  const chordAnno = rawJams.annotations.find((a) => a.namespace === 'chord');
  const chords = chordAnno ? normalizeJamsData(chordAnno.data) : [];

  // Extract Tempo (if available in beats or metadata)
  let tempoBpm = 120;
  const beatAnno = rawJams.annotations.find((a) => a.namespace === 'beat_position');
  if (beatAnno) {
    const beatData = normalizeJamsData(beatAnno.data);
    if (beatData.length > 1) {
      const avgDuration = (beatData[beatData.length - 1].time - beatData[0].time) / (beatData.length - 1);
      tempoBpm = Math.round(60 / avgDuration);
    }
  }

  // Extract Note Tracks
  const noteAnnos = rawJams.annotations.filter((a) => a.namespace === 'note_midi');
  const allNotes: JamsNote[] = [];

  noteAnnos.slice(0, 6).forEach((anno, stringIdx: number) => {
    const data = normalizeJamsData(anno.data);
    data.forEach((obs) => {
      allNotes.push({
        time: obs.time,
        duration: obs.duration,
        midi: Number(obs.value),
        string: stringIdx
      });
    });
  });

  allNotes.sort((a, b) => a.time - b.time);

  const getChordAtTime = (t: number) => {
    const found = chords.find((ch) => t >= ch.time && t < (ch.time + ch.duration));
    return found ? String(found.value) : "";
  };

  const tabSegments: TabSegment[] = [];
  if (allNotes.length > 0) {
    let currentGroup: JamsNote[] = [allNotes[0]];

    for (let i = 1; i <= allNotes.length; i++) {
      const note = allNotes[i];
      if (note && (note.time - currentGroup[0].time < TIME_TOLERANCE)) {
        currentGroup.push(note);
      } else {
        // Process group
        const startTime = currentGroup[0].time;
        const endTime = startTime + Math.max(...currentGroup.map(n => n.duration));
        
        const positions: { [key: string]: number | null } = {
          string_1: null, string_2: null, string_3: null,
          string_4: null, string_5: null, string_6: null
        };
        
        currentGroup.forEach(n => {
          const fret = Math.round(n.midi - OPEN_STRING_MIDI[n.string]);
          positions[STRING_MAP[n.string]] = fret >= 0 ? fret : 0;
        });

        tabSegments.push({
          time_start: Number(startTime.toFixed(3)),
          time_end: Number(endTime.toFixed(3)),
          suggested_chord: getChordAtTime(startTime).replace(/:/g, ''),
          suggested_voicing: "",
          strumming_pattern: "",
          positions,
          fingering: {}
        });

        if (note) currentGroup = [note];
      }
    }
  }

  return {
    key_signature: keySignature,
    tempo_bpm: tempoBpm,
    tab_segments: tabSegments
  };
}
